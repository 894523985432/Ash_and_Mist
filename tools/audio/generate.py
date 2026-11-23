"""Генерація звуків і музики через ComfyUI (P102-100) → public/audio/*.ogg + manifest.json.

  python tools/audio/generate.py              — згенерувати все, чого ще нема
  python tools/audio/generate.py --only hit   — лише вказані ключі (через кому)
  python tools/audio/generate.py --force      — перегенерувати
  python tools/audio/generate.py --sync       — лише переписати manifest.json з наявних файлів

Звуки — Stable Audio Open 1.0 (checkpoints/stable-audio-open-1.0.safetensors + text_encoders/t5-base.safetensors),
музика — ACE-Step 1.5 turbo (checkpoints/ace_step_1.5_turbo_aio.safetensors). Формат — Ogg Opus.
"""
import argparse, json, random, sys, time, urllib.parse, urllib.request, uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / 'tools/audio/assets.json'
OUT = ROOT / 'public/audio'


class Comfy:
    def __init__(self, url):
        self.url, self.client = url.rstrip('/'), str(uuid.uuid4())
        self._info = None

    def _req(self, path, data=None, headers=None, timeout=60):
        req = urllib.request.Request(self.url + path, data=data, headers=headers or {})
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.read()

    def get(self, path): return json.loads(self._req(path))
    def post(self, path, obj): return json.loads(self._req(path, json.dumps(obj).encode(), {'Content-Type': 'application/json'}))

    def info(self, node):
        if self._info is None: self._info = self.get('/object_info')
        return self._info.get(node)

    def alive(self):
        try: self.get('/system_stats'); return True
        except OSError: return False

    def run(self, wf, timeout):
        pid = self.post('/prompt', {'prompt': wf, 'client_id': self.client})['prompt_id']
        t0 = time.time()
        while time.time() - t0 < timeout:
            time.sleep(2)
            h = self.get('/history/' + pid)
            if pid not in h: continue
            st = h[pid].get('status', {})
            if st.get('status_str') == 'error':
                m = [x for x in st.get('messages', []) if x[0] == 'execution_error']
                raise RuntimeError(m[0][1].get('exception_message', 'помилка') if m else 'помилка')
            for out in h[pid].get('outputs', {}).values():
                for a in out.get('audio', []): return a
            raise RuntimeError('ComfyUI не повернув аудіо')
        raise TimeoutError(f'нема результату за {timeout} с')

    def download(self, a):
        q = urllib.parse.urlencode({'filename': a['filename'], 'subfolder': a.get('subfolder', ''), 'type': a.get('type', 'output')})
        return self._req('/view?' + q, timeout=120)


def combo(spec):
    """Варіанти COMBO: старий формат [[...], {...}] або новий ['COMBO', {'options': [...]}]."""
    if isinstance(spec[0], list): return spec[0]
    return (spec[1] if len(spec) > 1 else {}).get('options', [])


def save_node(c, audio_ref, prefix):
    """Ogg Opus, якщо є вузол SaveAudioOpus; інакше — звичайний SaveAudio (flac)."""
    if c.info('SaveAudioOpus'):
        inp = {'audio': audio_ref, 'filename_prefix': prefix}
        q = c.info('SaveAudioOpus')['input'].get('optional', {}).get('quality') or c.info('SaveAudioOpus')['input'].get('required', {}).get('quality')
        if q: inp['quality'] = '96k' if '96k' in combo(q) else combo(q)[len(combo(q)) // 2]
        return {'class_type': 'SaveAudioOpus', 'inputs': inp}, 'ogg'
    return {'class_type': 'SaveAudio', 'inputs': {'audio': audio_ref, 'filename_prefix': prefix}}, 'flac'


def wf_sfx(c, prompt, sec, seed):
    save, ext = save_node(c, ['7', 0], 'ashfog/sfx')
    return {
        '1': {'class_type': 'CheckpointLoaderSimple', 'inputs': {'ckpt_name': 'stable-audio-open-1.0.safetensors'}},
        '2': {'class_type': 'CLIPLoader', 'inputs': {'clip_name': 't5-base.safetensors', 'type': 'stable_audio', 'device': 'default'}},
        '3': {'class_type': 'CLIPTextEncode', 'inputs': {'text': prompt, 'clip': ['2', 0]}},
        '4': {'class_type': 'CLIPTextEncode', 'inputs': {'text': 'music, melody, speech, voice, singing, low quality, noise, hiss, distorted', 'clip': ['2', 0]}},
        '5': {'class_type': 'EmptyLatentAudio', 'inputs': {'seconds': sec, 'batch_size': 1}},
        '6': {'class_type': 'KSampler', 'inputs': {'model': ['1', 0], 'positive': ['3', 0], 'negative': ['4', 0], 'latent_image': ['5', 0],
              'seed': seed, 'steps': 50, 'cfg': 5, 'sampler_name': 'dpmpp_3m_sde_gpu', 'scheduler': 'exponential', 'denoise': 1}},
        '7': {'class_type': 'VAEDecodeAudio', 'inputs': {'samples': ['6', 0], 'vae': ['1', 2]}},
        '8': save,
    }, ext


def wf_music(c, tags, sec, seed, bpm=90):
    save, ext = save_node(c, ['7', 0], 'ashfog/music')
    req = c.info('TextEncodeAceStepAudio1.5')['input']
    names = {**req.get('required', {}), **req.get('optional', {})}
    enc = {'clip': ['1', 1]}
    want = {'tags': tags, 'lyrics': '[Instrumental]', 'seed': seed, 'duration': sec, 'bpm': bpm, 'timesignature': '4', 'language': 'en'}
    for k, spec in names.items():
        if k == 'clip': continue
        opts = combo(spec) if (isinstance(spec[0], list) or spec[0] == 'COMBO') else None
        cfg = spec[1] if len(spec) > 1 and isinstance(spec[1], dict) else {}
        if k in want and (opts is None or want[k] in opts): enc[k] = want[k]
        elif 'default' in cfg: enc[k] = cfg['default']
        elif opts: enc[k] = opts[0]
    return {
        '1': {'class_type': 'CheckpointLoaderSimple', 'inputs': {'ckpt_name': 'ace_step_1.5_turbo_aio.safetensors'}},
        '2': {'class_type': 'TextEncodeAceStepAudio1.5', 'inputs': enc},
        '3': {'class_type': 'ConditioningZeroOut', 'inputs': {'conditioning': ['2', 0]}},
        '4': {'class_type': 'EmptyAceStep1.5LatentAudio', 'inputs': {'seconds': sec, 'batch_size': 1}},
        '5': {'class_type': 'ModelSamplingAuraFlow', 'inputs': {'model': ['1', 0], 'shift': 3}},
        '6': {'class_type': 'KSampler', 'inputs': {'model': ['5', 0], 'positive': ['2', 0], 'negative': ['3', 0], 'latent_image': ['4', 0],
              'seed': seed, 'steps': 8, 'cfg': 1, 'sampler_name': 'euler', 'scheduler': 'simple', 'denoise': 1}},
        '7': {'class_type': 'VAEDecodeAudio', 'inputs': {'samples': ['6', 0], 'vae': ['1', 2]}},
        '8': save,
    }, ext


def write_manifest(A):
    m = {'version': int(time.time()), 'sfx': {}, 'music': {}}
    for k, a in A['sfx'].items():
        files = sorted(p.name for p in OUT.glob(f'sfx_{k}_*.*') if p.suffix in ('.ogg', '.opus', '.flac'))
        if files: m['sfx'][k] = {'files': files, 'gain': a.get('gain', 1)}
    for k, a in A['music'].items():
        f = next((p.name for p in OUT.glob(f'music_{k}.*') if p.suffix in ('.ogg', '.opus', '.flac')), None)
        if f: m['music'][k] = {'file': f, 'gain': a.get('gain', 1)}
    (OUT / 'manifest.json').write_text(json.dumps(m, ensure_ascii=False, indent=1), 'utf-8')
    size = sum(p.stat().st_size for p in OUT.glob('*.*')) / 1e6
    print(f'manifest.json: {len(m["sfx"])} звуків, {len(m["music"])} треків, {size:.1f} МБ')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--url', default='http://127.0.0.1:8188')
    ap.add_argument('--only'); ap.add_argument('--force', action='store_true'); ap.add_argument('--sync', action='store_true')
    ap.add_argument('--seed', type=int)
    a = ap.parse_args()
    A = json.loads(ASSETS.read_text('utf-8'))
    OUT.mkdir(parents=True, exist_ok=True)
    if a.sync: return write_manifest(A)
    c = Comfy(a.url)
    if not c.alive(): sys.exit('ComfyUI не відповідає на ' + a.url)
    only = set(a.only.split(',')) if a.only else None
    jobs = []
    for k, s in A['sfx'].items():
        for v in range(s.get('variants', 1)): jobs.append(('sfx', k, v, s))
    for k, s in A['music'].items(): jobs.append(('music', k, 0, s))
    jobs = [j for j in jobs if not only or j[1] in only]
    for n, (kind, k, v, s) in enumerate(jobs, 1):
        stem = f'sfx_{k}_{v}' if kind == 'sfx' else f'music_{k}'
        if not a.force and any(OUT.glob(stem + '.*')): continue
        seed = a.seed if a.seed is not None else random.randint(1, 2**31)
        wf, ext = (wf_sfx(c, s['p'], s['sec'], seed) if kind == 'sfx' else wf_music(c, s['tags'], s['sec'], seed, s.get('bpm', 90)))
        t0 = time.time()
        for attempt in range(3):
            try:
                ref = c.run(wf, 1800 if kind == 'music' else 300)
                data = c.download(ref)
                for old in OUT.glob(stem + '.*'): old.unlink()
                (OUT / f'{stem}.{ref["filename"].rsplit(".", 1)[-1]}').write_bytes(data)
                print(f'[{n}/{len(jobs)}] ✓ {stem} ({time.time() - t0:.0f} с, {len(data) // 1024} КБ, seed {seed})', flush=True)
                break
            except Exception as e:
                print(f'[{n}/{len(jobs)}] ✗ {stem}: {e}', flush=True); time.sleep(5)
    write_manifest(A)


if __name__ == '__main__':
    main()
