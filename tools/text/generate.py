#!/usr/bin/env python3
"""Генерація текстів гри через локальну LLM (OpenAI-сумісний API llama.cpp, лише стандартна бібліотека).

    tools\\text\\start-llm.cmd                     — підняти Qwen3.5-9B на 127.0.0.1:8080
    python tools/text/generate.py                 — догенерувати все, чого немає в data/texts.uk.json
    python tools/text/generate.py --only npcs.kai,locations --force
    python tools/text/generate.py --dry-run       — показати, що буде згенеровано

Кожна відповідь іде строго за JSON-схемою і проходить перевірку: українська мова (без ы/э/ъ/ё),
довжина рядків, обов'язкові підстановки на кшталт {toll}. Невдалу відповідь перепитуємо (до --retries разів).
"""
import argparse, json, os, re, sys, time
import urllib.request, urllib.error

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, 'data', 'texts.uk.json')


def load(p):
    with open(p, encoding='utf-8') as f:
        return json.load(f)


def data(name):
    return load(os.path.join(ROOT, 'data', name))


# ---------- перевірка тексту ----------

RU = re.compile(r'[ыэъёЫЭЪЁ]')
UK = re.compile(r'[іїєґІЇЄҐ]')
# Часті русизми та суржик, які дрібні моделі підсовують в українські тексти
RUSSISMS = re.compile(r'\b(ржав\w*|промолч\w*|ничего|тоже|сейчас|кушать|конечно|вообще|пока что|хорошо|ладно|шо|дєлать|получа\w*|являєт\w*|приймати участь|на протязі|у відповідності|слідуючий|вивісок|вижив(і|ими|их|ам)|виживш\w*)\b', re.I)
CYR = re.compile(r'[а-щьюяіїєґА-ЩЬЮЯІЇЄҐ]')
LAT = re.compile(r'[A-Za-z]')


def clean(s):
    s = s.strip().strip('"«»„“”').strip()
    return re.sub(r'\s+', ' ', s)


def check_lines(lines, spec, where):
    """Повертає список проблем (порожній — усе добре)."""
    errs = []
    lo, hi = spec.get('len', [10, 220])
    for s in lines:
        if RU.search(s):
            errs.append(f'{where}: російські літери: {s!r}')
        m = RUSSISMS.search(s)
        if m:
            errs.append(f'{where}: русизм «{m.group(0)}»: {s!r}')
        bare = re.sub(r'\{\w+\}|\bHP\b', '', s)  # підстановки й «HP» — не латиниця тексту
        letters = len(CYR.findall(bare)) + len(LAT.findall(bare))
        if letters and len(LAT.findall(bare)) / letters > 0.1:
            errs.append(f'{where}: латиниця: {s!r}')
        if not lo <= len(s) <= hi:
            errs.append(f'{where}: довжина {len(s)} поза {lo}–{hi}: {s!r}')
        for ph in spec.get('require', []):
            if ph not in s:
                errs.append(f'{where}: немає {ph}: {s!r}')
        if spec.get('noDigits') and re.search(r'\d', s):
            errs.append(f'{where}: не має бути чисел: {s!r}')
        if spec.get('prefix') and not s.startswith(spec['prefix']):
            errs.append(f"{where}: має починатися з {spec['prefix']!r}: {s!r}")
        for ph in re.findall(r'\{\w+\}', s):
            if not any(ph in r for r in spec.get('require', []) + spec.get('allow', [])):
                errs.append(f'{where}: зайва підстановка {ph}: {s!r}')
    if lines and sum(bool(UK.search(s)) for s in lines) < max(1, len(lines) // 3):
        errs.append(f'{where}: замало українських літер (і/ї/є) — схоже не українська')
    if len(set(lines)) < len(lines):
        errs.append(f'{where}: повтори')
    return errs


# ---------- завдання ----------

def lines_schema(fields):
    """Схема: об'єкт, де кожне поле — масив рядків заданої кількості."""
    return {
        'type': 'object',
        'properties': {k: {'type': 'array', 'items': {'type': 'string'}, 'minItems': n, 'maxItems': n} for k, (n, _) in fields.items()},
        'required': list(fields),
        'additionalProperties': False,
    }


NPC_FIELDS = {
    'first':   (2, 'перша зустріч: привітання незнайомця, характерне для нього'),
    'again':   (2, 'вже бачились раніше, нейтрально'),
    'friend':  (2, 'вітає як друга, тепло'),
    'hostile': (2, 'ворожий, злий, памʼятає образи'),
    'trade':   (3, 'пропонує обмін'),
    'threat':  (3, 'вимагає мито і погрожує; ОБОВʼЯЗКОВО містить {toll} — це місце, куди гра підставить розмір мита, напр. «2💧»'),
    'bye':     (2, 'прощання'),
    'beaten':  (2, 'памʼятає, що герой побив його в бійці'),
    'lostTo':  (2, 'памʼятає, що сам переміг героя і забрав рюкзак, глузує'),
}
RIVAL_FIELDS = {k: NPC_FIELDS[k] for k in ['trade', 'threat', 'bye']}


def jobs():
    """Усі завдання: (шлях у texts.uk.json, промпт, схема, правила перевірки)."""
    art = data('art.json')
    temper = {'trader': 'торговець', 'raider': 'грабіжник, задирака', 'hermit': 'відлюдник, мовчазний і мудрий'}
    out = []
    for L in data('locations.json')['locations']:
        out.append((f"locations.{L['id']}", f"Опиши локацію «{L['n']}» ({art['locations'].get(L['id'], '')}) так, ніби герой туди щойно зайшов. "
                    f"Дай 3 різні короткі описи по 1–2 речення: що видно, чути, чим пахне, яка небезпека.",
                    lines_schema({'lines': (3, '')}), {'len': [40, 220]}))
    for k, m in {**data('monsters.json'), **data('rare.json')}.items():
        desc = art['monsters'].get(k) or art['rare'].get(k, '')
        rare = ' Це рідкісна чарівна істота: не ворожа за природою, тікає, з неї падає трофей.' if k in data('rare.json') else ''
        out.append((f"monsters.{k}", f"Монстр «{m['n']}» ({desc}).{rare} Дай 2 різні короткі описи по одному реченню: як він виглядає і як поводиться, коли бачить героя.",
                    lines_schema({'lines': (2, '')}), {'len': [30, 180]}))
    looks = art.get('npcs', {})
    for p in data('npcs.json')['names']:
        fields = '\n'.join(f'- {k} ({n} шт.): {d}' for k, (n, d) in NPC_FIELDS.items())
        out.append((f"npcs.{p['key']}", f"Персонаж-вижилий {p['n']}: {'жінка' if p.get('g') == 'f' else 'чоловік'}, {temper[p['temper']]}; зовнішність: {looks.get(p['key'], '')}. "
                    f"{'Вона говорить про себе ТІЛЬКИ в жіночому роді (бачила, рада, забрала). ' if p.get('g') == 'f' else ''}"
                    f"Напиши його репліки до героя — коротко (одне речення), у його характері, з упізнаваною манерою мовлення. Поля:\n{fields}",
                    lines_schema(NPC_FIELDS), {'len': [8, 150], 'fields': {'threat': {'require': ['{toll}']}}}))
    for r in data('npcs.json')['rivals']:
        fields = '\n'.join(f'- {k} ({n} шт.): {d}' for k, (n, d) in RIVAL_FIELDS.items())
        out.append((f"rivals.{r['n']}", f"{r['n']} — інший вижилий, суперник героя: теж нишпорить по місту і вичищає локації раніше за нього. "
                    f"Напиши його репліки до героя, одне речення кожна. Поля:\n{fields}",
                    lines_schema(RIVAL_FIELDS), {'len': [8, 150], 'fields': {'threat': {'require': ['{toll}']}}}))
    out.append(('strangers', 'Випадковий незнайомий вижилий без імені. Напиши його репліки до героя, одне речення кожна. Поля:\n' +
                '\n'.join(f'- {k} ({n} шт.): {d}' for k, (n, d) in RIVAL_FIELDS.items()),
                lines_schema(RIVAL_FIELDS), {'len': [8, 150], 'fields': {'threat': {'require': ['{toll}']}}}))
    ev = load(os.path.join(ROOT, 'data', 'events.json'))
    for e in ev['events']:
        out.append((f"events.{e['id']}", f"Подія дня «{e['n']}»: {e['d']}. Дай 3 різні атмосферні рядки (одне речення кожен), якими герой помічає цю подію зранку. Без чисел і механік.",
                    lines_schema({'lines': (3, '')}), {'len': [30, 170]}))
    for s in ev['seasons']:
        out.append((f"seasons.{s['id']}", f"Настала пора року «{s['n']}» ({s['d']}). Дай 2 різні атмосферні рядки (одне речення), як це відчувається в мертвому місті. Без чисел.",
                    lines_schema({'lines': (2, '')}), {'len': [30, 170]}))
    out.append(('intro', 'Перший ранок другого життя героя: він прокидається у своєму домі, памʼятає перше життя і зраду друга, '
                'і вперше бачить вікно Системи. Дай 4 короткі рядки (по одному реченню) — послідовна сцена від першої особи героя.',
                lines_schema({'lines': (4, '')}), {'len': [30, 200]}))
    out.append(('system', 'Повідомлення Системи героєві — сухо, як інтерфейс гри, кожне починається рівно з «[Система] ». Поля:\n'
                '- levelUp (4 шт.): короткий сухий коментар Системи одразу після підвищення рівня (номер рівня гра допише сама, тож БЕЗ чисел і без слова «рівень»). Не вигадуй механік: можна згадати лише, що зросли здоровʼя, захист або витривалість; жодної магії\n'
                '- danger (3 шт.): попередження, що HP мало і час повертатися\n'
                '- memory (4 шт.): спогад із першого життя — коротка порада про виживання (голод і холод вбивають повільно, близькі околиці швидко вигрібають, ворожі вижилі приходять уночі, туман приносить рідкісних істот)',
                {'type': 'object', 'properties': {k: {'type': 'array', 'items': {'type': 'string'}, 'minItems': n, 'maxItems': n} for k, n in [('levelUp', 4), ('danger', 3), ('memory', 4)]},
                 'required': ['levelUp', 'danger', 'memory'], 'additionalProperties': False},
                {'len': [15, 170], 'prefix': '[Система] ', 'fields': {'levelUp': {'noDigits': True}}}))
    return out


# ---------- LLM ----------

def ask(url, system, prompt, schema, temp, timeout=300):
    body = {
        'model': 'ashfog', 'temperature': temp, 'top_p': 0.95,
        'messages': [{'role': 'system', 'content': system}, {'role': 'user', 'content': prompt}],
        'response_format': {'type': 'json_schema', 'json_schema': {'name': 'texts', 'schema': schema}},
        'chat_template_kwargs': {'enable_thinking': False},
    }
    req = urllib.request.Request(url.rstrip('/') + '/v1/chat/completions', json.dumps(body).encode(), {'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(json.loads(r.read())['choices'][0]['message']['content'])


def set_path(d, path, val):
    keys = path.split('.')
    for k in keys[:-1]:
        d = d.setdefault(k, {})
    d[keys[-1]] = val


def get_path(d, path):
    for k in path.split('.'):
        if not isinstance(d, dict) or k not in d:
            return None
        d = d[k]
    return d


def main():
    ap = argparse.ArgumentParser(description='Тексти «Попіл і Туман» з локальної LLM')
    ap.add_argument('--url', default='http://127.0.0.1:8080')
    ap.add_argument('--only', help='шляхи через кому, префікси теж: "npcs.kai,locations"')
    ap.add_argument('--force', action='store_true')
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--retries', type=int, default=4)
    ap.add_argument('--temp', type=float, default=0.8)
    args = ap.parse_args()

    world = open(os.path.join(HERE, 'world.md'), encoding='utf-8').read()
    system = (world + '\nВідповідай тільки JSON за заданою схемою. Кожен рядок — готовий текст для гри українською, '
              'без лапок навколо, без пояснень, без нумерації.')
    texts = load(OUT) if os.path.exists(OUT) else {}
    pats = [p.strip() for p in args.only.split(',')] if args.only else None
    todo = [j for j in jobs() if (not pats or any(j[0] == p or j[0].startswith(p + '.') for p in pats))
            and (args.force or get_path(texts, j[0]) is None)]
    print(f'До генерації: {len(todo)} блоків')
    if args.dry_run:
        for j in todo:
            print('  ' + j[0])
        return
    if not todo:
        return
    try:
        urllib.request.urlopen(args.url + '/health', timeout=5)
    except (urllib.error.URLError, OSError) as e:
        sys.exit(f'LLM недоступна на {args.url} ({e}). Запусти tools\\text\\start-llm.cmd')

    failed = []
    for i, (path, prompt, schema, rules) in enumerate(todo, 1):
        t0, errs = time.time(), ['не запускалось']
        for attempt in range(args.retries):
            try:
                res = ask(args.url, system, prompt, schema, args.temp)
            except Exception as e:
                errs = [f'запит: {e}']
                continue
            res = {k: [clean(s) for s in v] for k, v in res.items()}
            errs = []
            for k, v in res.items():
                spec = {**rules, **rules.get('fields', {}).get(k, {})}
                errs += check_lines(v, spec, f'{path}.{k}')
            if not errs:
                break
            prompt_note = '\nПопередня спроба мала помилки, виправ їх: ' + '; '.join(errs[:4])
            prompt = prompt.split('\nПопередня спроба')[0] + prompt_note
        if errs:
            failed.append(path)
            print(f'[{i}/{len(todo)}] ✗ {path}: ' + '; '.join(errs[:3]), flush=True)
            continue
        set_path(texts, path, res['lines'] if list(res) == ['lines'] else res)
        with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
            json.dump(texts, f, ensure_ascii=False, indent=1)
            f.write('\n')
        print(f'[{i}/{len(todo)}] ✓ {path} ({time.time() - t0:.0f} с, спроб {attempt + 1})', flush=True)
    print(f'Готово: {len(todo) - len(failed)} з {len(todo)}.' + (' Не вдалося: ' + ', '.join(failed) if failed else ''))
    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    main()
