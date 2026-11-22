#!/usr/bin/env python3
"""Генерація арту гри через ComfyUI (лише стандартна бібліотека Python).

    python tools/art/generate.py               — синхронізувати assets.json і догенерувати все, чого немає
    python tools/art/generate.py --only mon_rat,loc_gas
    python tools/art/generate.py --only "mon_*" --force   — перегенерувати групу
    python tools/art/generate.py --only hero --seed 42    — інший seed (запишеться в assets.json)
    python tools/art/generate.py --dry-run     — лише показати, що буде згенеровано
    python tools/art/generate.py --sync        — лише оновити assets.json

assets.json будується з data/*.json: опис і розмір щоразу оновлюються з data/art.json, а seed і ref зберігаються.
Щоб зафіксувати власний prompt для ключа, додай у його запис "lock": true.
Результат: public/art/<key>.webp і public/art/manifest.json (гра читає його й підставляє арт замість емодзі).
"""
import argparse, fnmatch, json, os, sys, time, uuid, zlib
import urllib.request, urllib.parse, urllib.error

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, 'public', 'art')
ASSETS = os.path.join(HERE, 'assets.json')


def load(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def save_json(path, data):
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')


# ---------- assets.json ----------

def wanted_assets():
    """Усі ключі, які потрібні грі, з описами з data/art.json."""
    art = load(os.path.join(ROOT, 'data', 'art.json'))
    locs = load(os.path.join(ROOT, 'data', 'locations.json'))['locations']
    mons = load(os.path.join(ROOT, 'data', 'monsters.json'))
    rare = load(os.path.join(ROOT, 'data', 'rare.json'))
    npcs = load(os.path.join(ROOT, 'data', 'npcs.json'))['names']
    out = []
    for key, prompt in art['fixed']:
        cat = 'base' if key.startswith('base') else 'hero' if key == 'hero' else 'person'
        out.append({'key': key, 'cat': cat, 'prompt': prompt, 'size': 'wide' if cat == 'base' else 'square'})
    for L in locs:
        out.append({'key': 'loc_' + L['id'], 'cat': 'loc', 'prompt': art['locations'].get(L['id'], L['id']), 'size': 'wide'})
    for k in mons:
        out.append({'key': 'mon_' + k, 'cat': 'mon', 'prompt': art['monsters'].get(k, k) + art['monsterSuffix'], 'size': 'square'})
    for k in rare:
        out.append({'key': 'mon_' + k, 'cat': 'mon', 'prompt': art['rare'].get(k, k) + art['rareSuffix'], 'size': 'square'})
    for p in npcs:
        out.append({'key': 'survivor_' + p['key'], 'cat': 'person', 'prompt': art['npcs'].get(p['key'], 'wasteland survivor'), 'size': 'square'})
    return out


def sync_assets():
    old = {a['key']: a for a in load(ASSETS)} if os.path.exists(ASSETS) else {}
    result, added = [], []
    for w in wanted_assets():
        a = old.pop(w['key'], None)
        if a is None:
            a = {**w, 'seed': zlib.crc32(w['key'].encode()) % 2**31}
            added.append(w['key'])
        elif not a.get('lock'):
            a.update(w)  # опис і розмір — з data/art.json; seed і ref лишаються твої
        a.pop('unused', None)
        result.append(a)
    for k, a in old.items():  # ключі, яких гра вже не просить, лишаємо з позначкою
        a['unused'] = True
        result.append(a)
    save_json(ASSETS, result)
    if added:
        print(f'assets.json: додано {len(added)} ключів: ' + ', '.join(added))
    if old:
        print('assets.json: гра більше не використовує: ' + ', '.join(old))
    return result


# ---------- ComfyUI ----------

class Comfy:
    def __init__(self, url):
        self.url = url.rstrip('/')
        self.client = str(uuid.uuid4())

    def _req(self, path, data=None, headers=None):
        req = urllib.request.Request(self.url + path, data=data, headers=headers or {})
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.read()

    def get_json(self, path):
        return json.loads(self._req(path))

    def post_json(self, path, obj):
        return json.loads(self._req(path, json.dumps(obj).encode(), {'Content-Type': 'application/json'}))

    def upload(self, path, name):
        """Кладе референс у ComfyUI/input (для IPAdapter)."""
        boundary = uuid.uuid4().hex
        with open(path, 'rb') as f:
            content = f.read()
        body = (f'--{boundary}\r\nContent-Disposition: form-data; name="image"; filename="{name}"\r\n'
                f'Content-Type: image/webp\r\n\r\n').encode() + content + \
               f'\r\n--{boundary}\r\nContent-Disposition: form-data; name="overwrite"\r\n\r\ntrue\r\n--{boundary}--\r\n'.encode()
        res = json.loads(self._req('/upload/image', body, {'Content-Type': f'multipart/form-data; boundary={boundary}'}))
        return res['name']

    def run(self, workflow, timeout):
        pid = self.post_json('/prompt', {'prompt': workflow, 'client_id': self.client})['prompt_id']
        start = time.time()
        while time.time() - start < timeout:
            time.sleep(2)
            h = self.get_json('/history/' + pid)
            if pid in h:
                entry = h[pid]
                status = entry.get('status', {})
                if status.get('status_str') == 'error':
                    msgs = [m for m in status.get('messages', []) if m[0] == 'execution_error']
                    raise RuntimeError(msgs[0][1].get('exception_message', 'помилка виконання') if msgs else 'помилка виконання')
                for out in entry.get('outputs', {}).values():
                    for img in out.get('images', []):
                        return img
                raise RuntimeError('ComfyUI не повернув зображення')
        raise TimeoutError(f'не дочекався результату за {timeout} с')

    def alive(self):
        try:
            self.get_json('/system_stats')
            return True
        except (urllib.error.URLError, OSError):
            return False

    def wait_alive(self, max_wait):
        """ComfyUI впав або перезапускається — чекаємо, поки повернеться."""
        start = time.time()
        print(f'  ComfyUI недоступний, чекаю до {max_wait // 60} хв…', flush=True)
        while time.time() - start < max_wait:
            time.sleep(10)
            if self.alive():
                print("  ComfyUI знову на зв'язку", flush=True)
                return True
        return False

    def download(self, img):
        q = urllib.parse.urlencode({'filename': img['filename'], 'subfolder': img.get('subfolder', ''), 'type': img.get('type', 'output')})
        return self._req('/view?' + q)


def subject(prompt, cfg, cat=None):
    """Опис об'єкта з вагою (prompt:1.3), щоб загальний стиль його не перебивав. Категорія може задати свою вагу."""
    w = (cat or {}).get('weight', cfg.get('subjectWeight', 1))
    return f'({prompt}:{w})' if w != 1 else prompt


def build_workflow(cfg, style, asset, ref_name=None):
    tpl = load(os.path.join(HERE, 'workflow_ref.json' if ref_name else 'workflow.json'))
    w, h = cfg['sizes'][asset['size']]
    cat = cfg.get('categories', {}).get(asset.get('cat'), {})
    vals = {
        '$checkpoint': cfg['checkpoint'],
        # опис — раніше за стиль: SDXL сильніше слухає початок промпта
        '$positive': ', '.join(x for x in [cfg.get('prefix', ''), subject(asset['prompt'], cfg, cat), cat.get('suffix', ''), style] if x),
        '$negative': ', '.join(x for x in [cfg['negative'], cat.get('negative', '')] if x),
        '$width': w, '$height': h, '$seed': asset['seed'],
        '$steps': cfg['steps'], '$cfg': cfg['cfg'], '$sampler': cfg['sampler'], '$scheduler': cfg['scheduler'],
        '$quality': cfg['webpQuality'], '$prefix': 'ashfog/' + asset['key'],
        '$ref_image': ref_name or '', '$ip_preset': cfg['ipadapter']['preset'],
        '$ip_weight': cfg['ipadapter']['weight'], '$ip_end': cfg['ipadapter']['end_at'],
    }
    for node in tpl.values():
        for k, v in node['inputs'].items():
            if isinstance(v, str) and v in vals:
                node['inputs'][k] = vals[v]
    return tpl


def write_manifest():
    keys = sorted(f[:-5] for f in os.listdir(OUT) if f.endswith('.webp'))
    save_json(os.path.join(OUT, 'manifest.json'), {'version': int(time.time()), 'keys': keys})
    return keys


def main():
    ap = argparse.ArgumentParser(description='Генерація арту «Попіл і Туман» через ComfyUI')
    ap.add_argument('--only', help='ключі через кому, можна з * (напр. "mon_*,loc_gas")')
    ap.add_argument('--force', action='store_true', help='перегенерувати навіть наявні файли')
    ap.add_argument('--seed', type=int, help='новий seed для вибраних ключів (записується в assets.json)')
    ap.add_argument('--dry-run', action='store_true', help='нічого не генерувати, лише показати план')
    ap.add_argument('--sync', action='store_true', help='лише оновити assets.json')
    args = ap.parse_args()

    os.makedirs(OUT, exist_ok=True)
    cfg = load(os.path.join(HERE, 'config.json'))
    style = load(os.path.join(ROOT, 'data', 'art.json'))['style']
    assets = sync_assets()
    if args.sync:
        return

    pats = [p.strip() for p in args.only.split(',')] if args.only else None
    todo = [a for a in assets if not a.get('unused') and (not pats or any(fnmatch.fnmatch(a['key'], p) for p in pats))]
    if pats and not todo:
        sys.exit('Жоден ключ не підійшов під --only ' + args.only)
    if args.seed is not None:
        for a in todo:
            a['seed'] = args.seed
        save_json(ASSETS, assets)
    if not args.force:
        todo = [a for a in todo if not os.path.exists(os.path.join(OUT, a['key'] + '.webp'))]
    # спершу ті, на кого посилаються інші (ref), щоб референс уже існував
    refs = {a.get('ref') for a in assets if a.get('ref')}
    todo.sort(key=lambda a: 0 if a['key'] in refs else 1)

    print(f'До генерації: {len(todo)} зображень' + (' (dry run)' if args.dry_run else ''))
    if args.dry_run:
        for a in todo:
            print(f"  {a['key']:<22} {a['size']:<6} seed={a['seed']:<11} {a['prompt'][:70]}")
        return
    if not todo:
        print('Усе вже згенеровано. Маніфест: ' + str(len(write_manifest())) + ' ключів.')
        return

    comfy = Comfy(cfg['url'])
    try:
        comfy.get_json('/system_stats')
    except (urllib.error.URLError, OSError) as e:
        sys.exit(f"ComfyUI недоступний на {cfg['url']} ({e}). Запусти його й повтори.")

    failed = []
    for i, a in enumerate(todo, 1):
      for attempt in range(cfg.get('retries', 3)):
        t0 = time.time()
        ref_name = None
        try:
            if a.get('ref'):
                ref_path = os.path.join(OUT, a['ref'] + '.webp')
                if not os.path.exists(ref_path):
                    raise RuntimeError(f"немає референсу {a['ref']}.webp — згенеруй його першим")
                ref_name = comfy.upload(ref_path, f"ashfog_ref_{a['ref']}.webp")
            img = comfy.run(build_workflow(cfg, style, a, ref_name), cfg['timeoutSec'])
            with open(os.path.join(OUT, a['key'] + '.webp'), 'wb') as f:
                f.write(comfy.download(img))
            print(f"[{i}/{len(todo)}] ✓ {a['key']} ({time.time() - t0:.0f} с)", flush=True)
            break
        except (urllib.error.URLError, ConnectionError, OSError) as e:
            # зв'язок пропав — чекаємо ComfyUI і пробуємо цей самий ключ ще раз
            if attempt + 1 < cfg.get('retries', 3) and comfy.wait_alive(cfg.get('waitForComfySec', 900)):
                continue
            failed.append(a['key'])
            print(f"[{i}/{len(todo)}] ✗ {a['key']}: {e}", flush=True)
            break
        except Exception as e:  # помилка самої генерації не зупиняє решту
            failed.append(a['key'])
            print(f"[{i}/{len(todo)}] ✗ {a['key']}: {e}", flush=True)
            break
      write_manifest()  # після кожного — щоб гра бачила прогрес

    print(f'Готово: {len(todo) - len(failed)} з {len(todo)}.' + (' Не вдалося: ' + ', '.join(failed) if failed else ''))
    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    main()
