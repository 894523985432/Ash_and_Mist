"""Охайне форматування data/*.json: короткі обʼєкти й масиви — в один рядок, решта — з відступами.
  python tools/fmt_json.py data/balance.json data/buildings.json ..."""
import json, sys

WIDTH = 140
NL = '\n'


def fmt(v, depth=0, used=0):
    """used — скільки символів уже зайнято в рядку перед значенням."""
    one = json.dumps(v, ensure_ascii=False, separators=(', ', ': '))
    if isinstance(v, dict) and one != '{}': one = '{ ' + one[1:-1] + ' }'
    if not isinstance(v, (dict, list)) or used + len(one) <= WIDTH: return one
    pad, end = '  ' * (depth + 1), '  ' * depth
    if isinstance(v, list):
        body = (',' + NL).join(pad + fmt(x, depth + 1, len(pad)) for x in v)
        return '[' + NL + body + NL + end + ']'
    items = []
    for k, x in v.items():
        head = pad + json.dumps(k, ensure_ascii=False) + ': '
        items.append(head + fmt(x, depth + 1, len(head)))
    return '{' + NL + (',' + NL).join(items) + NL + end + '}'


def clean(v):
    """5.0 → 5"""
    if isinstance(v, float) and v.is_integer(): return int(v)
    if isinstance(v, list): return [clean(x) for x in v]
    if isinstance(v, dict): return {k: clean(x) for k, x in v.items()}
    return v


for p in sys.argv[1:]:
    with open(p, encoding='utf-8') as f: d = clean(json.load(f))
    out = fmt(d) + NL
    assert json.loads(out) == d
    with open(p, 'w', encoding='utf-8') as f: f.write(out)
    print('ok', p)
