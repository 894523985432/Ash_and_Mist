"""Переклад гри англійською локальною LLM (той самий сервер, що й для текстів: tools\\text\\start-llm.cmd).

  node tools/i18n/extract.mjs            — спершу зібрати ключі (tools/i18n/keys.json)
  python tools/i18n/translate.py         — догенерувати data/i18n/en.json (лише нові ключі)
  python tools/i18n/translate.py --texts — перекласти художні тексти data/texts.uk.json → data/texts.en.json
  --force   перекласти все заново, --batch N  розмір пачки (типово 16)

Перевірка відповіді: ті самі підстановки {0}/{toll}, ті самі HTML-теги, ті самі емодзі, жодної кирилиці.
"""
import argparse, json, re, sys, time, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
KEYS = ROOT / 'tools/i18n/keys.json'
OUT = ROOT / 'data/i18n/en.json'
CYR = re.compile(r'[А-Яа-яІіЇїЄєҐґ]')
PH = re.compile(r'\{\w+\}')
TAG = re.compile(r'</?[a-zA-Z][^>]*>')
EMOJI = re.compile('[\U0001F000-\U0001FAFF☀-➿⬀-⯿]')

SYSTEM = """You translate a Ukrainian mobile game «Попіл і Туман» (English title: "Ash and Fog") into natural, concise English.
Genre: anime post-apocalyptic survival with dark fantasy. A teenage hero was reborn with memories of his first life and a mysterious "System".
Rules:
- Keep every placeholder like {0}, {1}, {toll} exactly, and every HTML tag exactly (same tags, same attributes, same order).
- Keep every emoji and number exactly. Keep punctuation style short. Do not add explanations.
- UI labels stay short (buttons, chips). Address the player as "you".
- Glossary: Сили ⚡ = Stamina; Енергія 🔋 = Power; Тепло 🔥 = Heat; Паливо = Fuel; Деталі = Parts; Метал = Metal; Дерево = Wood;
  Аптечка = Medkit; Стимулятор = Stimulant; ОД = AP; HP = HP; Система = the System; вижилі/вижилий = survivors/survivor;
  вилазка = run (expedition); обшук = search; Розлом = Rift; Туман = Fog; рів. = lvl; дн. = d.
- Names of people are transliterated (Кай = Kai, Мірра = Mirra, Дзвін = Dzvin, Тесса = Tessa, Рудий = Rudyi, Аска = Aska, Вереск = Veresk,
  Лія = Liia, Борис = Borys, Нокс = Noks, Ліра = Lira, Грім = Grim, Сова = Sova)."""


def ask(url, prompt, schema, temp=0.2, timeout=600):
    body = {
        'model': 'ashfog', 'temperature': temp,
        'messages': [{'role': 'system', 'content': SYSTEM}, {'role': 'user', 'content': prompt}],
        'response_format': {'type': 'json_schema', 'json_schema': {'name': 'tr', 'schema': schema}},
        'chat_template_kwargs': {'enable_thinking': False},
    }
    req = urllib.request.Request(url + '/v1/chat/completions', json.dumps(body).encode(), {'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(json.loads(r.read())['choices'][0]['message']['content'])


KEEP = {'Українська', '[Система]'}  # назви мов лишаються рідною мовою


def problems(src, en):
    if src in KEEP: return []
    p = []
    if not en.strip(): p.append('empty')
    if CYR.search(en): p.append('Cyrillic letters left')
    if sorted(PH.findall(src)) != sorted(PH.findall(en)): p.append(f'placeholders must be exactly {PH.findall(src)}')
    if [re.sub(r'\s+', ' ', x) for x in TAG.findall(src)] != [re.sub(r'\s+', ' ', x) for x in TAG.findall(en)]: p.append('HTML tags must match exactly')
    if sorted(EMOJI.findall(src)) != sorted(EMOJI.findall(en)): p.append('emoji must match')
    return p


SCHEMA = {'type': 'object', 'properties': {'items': {'type': 'array', 'items': {
    'type': 'object', 'properties': {'i': {'type': 'integer'}, 'en': {'type': 'string'}}, 'required': ['i', 'en']}}}, 'required': ['items']}


def translate(url, strs, batch, label):
    """strs — список українських рядків. Повертає {uk: en}; що не вдалося — пропускає."""
    done, todo = {}, list(strs)
    for b in range(0, len(todo), batch):
        chunk = todo[b:b + batch]
        notes, left = '', list(chunk)
        for attempt in range(3):
            prompt = 'Translate each item. Return {"items":[{"i":index,"en":translation}]}.\n' + notes + '\n' + json.dumps(
                [{'i': i, 'uk': s} for i, s in enumerate(left)], ensure_ascii=False)
            t0 = time.time()
            try: res = ask(url, prompt, SCHEMA)
            except Exception as e: print('  помилка LLM:', e); time.sleep(5); continue
            got = {x['i']: x['en'] for x in res.get('items', []) if isinstance(x.get('i'), int)}
            bad, errs = [], []
            for i, s in enumerate(left):
                en = got.get(i)
                pr = problems(s, en) if en is not None else ['missing']
                if pr: bad.append(s); errs.append(f'- {json.dumps(s, ensure_ascii=False)}: {"; ".join(pr)}')
                else: done[s] = en
            print(f'[{label} {min(b + batch, len(todo))}/{len(todo)}] ✓{len(left) - len(bad)} ✗{len(bad)} ({time.time() - t0:.0f} с)')
            if not bad: break
            left, notes = bad, 'Previous answer had errors, fix them:\n' + '\n'.join(errs)
        else:
            for s in left: print('  не вдалося:', s[:80])
    return done


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--url', default='http://127.0.0.1:8080')
    ap.add_argument('--texts', action='store_true')
    ap.add_argument('--force', action='store_true')
    ap.add_argument('--batch', type=int, default=16)
    a = ap.parse_args()

    if a.texts:
        src = json.loads((ROOT / 'data/texts.uk.json').read_text('utf-8'))
        out_p = ROOT / 'data/texts.en.json'
        old = {} if a.force or not out_p.exists() else json.loads(out_p.read_text('utf-8'))
        lines = []
        def collect(o):
            if isinstance(o, str): lines.append(o)
            elif isinstance(o, list): [collect(x) for x in o]
            elif isinstance(o, dict): [collect(x) for x in o.values()]
        collect(src)
        cache = {}
        def flat(u, e):
            if isinstance(u, str) and isinstance(e, str): cache[u] = e
            elif isinstance(u, list) and isinstance(e, list) and len(u) == len(e): [flat(x, y) for x, y in zip(u, e)]
            elif isinstance(u, dict) and isinstance(e, dict): [flat(u[k], e[k]) for k in u if k in e]
        flat(src, old)
        need = sorted({s for s in lines if s not in cache})
        print(f'Художніх рядків: {len(lines)}, до перекладу: {len(need)}')
        cache.update(translate(a.url, need, a.batch, 'тексти'))
        def build(o):
            if isinstance(o, str): return cache.get(o)
            if isinstance(o, list): return [x for x in (build(v) for v in o) if x]
            return {k: build(v) for k, v in o.items()}
        out_p.write_text(json.dumps(build(src), ensure_ascii=False, indent=1), 'utf-8')
        print('Записано', out_p)
        return

    keys = [x['k'] for x in json.loads(KEYS.read_text('utf-8'))]
    old = {} if a.force or not OUT.exists() else json.loads(OUT.read_text('utf-8'))
    need = [k for k in keys if k not in old]
    print(f'Ключів: {len(keys)}, нових: {len(need)}')
    old.update(translate(a.url, need, a.batch, 'інтерфейс'))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({k: old[k] for k in keys if k in old}, ensure_ascii=False, indent=1), 'utf-8')
    print(f'Записано {OUT}: {sum(k in old for k in keys)}/{len(keys)}')
    if any(k not in old for k in keys): sys.exit(1)


if __name__ == '__main__':
    main()
