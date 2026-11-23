"""Одноразово: множить усі кількості ресурсів у data/*.json на K (етап 8, рішення «ресурси ×10»).
HP, шкода, сили, шанси, дні — не чіпаються. Запускати один раз: python tools/scale_resources.py 10"""
import json, sys
from pathlib import Path

K = int(sys.argv[1]) if len(sys.argv) > 1 else 10
D = Path(__file__).resolve().parents[1] / 'data'
# аптечки й стимулятори — штучні речі (витрачаються по одній), їх не множимо
RES = set(json.loads((D / 'resources.json').read_text('utf-8'))) - {'med', 'stim'}


def j(name): return json.loads((D / name).read_text('utf-8'))
def w(name, d): (D / name).write_text(json.dumps(d, ensure_ascii=False, indent=2), 'utf-8')


def res_map(o):
    """{res: n} або {res: [a, b]} → ×K."""
    for k, v in list(o.items()):
        if k not in RES: continue
        if isinstance(v, list): o[k] = [round(x * K) for x in v]
        elif isinstance(v, (int, float)): o[k] = round(v * K)
    return o


b = j('balance.json')
res_map(b['start']['res'])
res_map(b['day']['consume']); b['day']['nightHeat'] *= K
b['raid']['amount'] = [x * K for x in b['raid']['amount']]
res_map(b['actions']['eat']['cost'])
res_map(b['craft']['weapon']); res_map(b['craft']['armor'])
b['craft']['dismantleParts'] = {k: v * K for k, v in b['craft']['dismantleParts'].items()}
S = b['survivors']
S['tradeGive'] *= K; S['tradeGet'] *= K; S['toll'] *= K
res_map(S['trophySale']); res_map(S['hermitGift']); res_map(S['human']['loot'])
b['npc']['raid']['amount'] = [x * K for x in b['npc']['raid']['amount']]
b['trip']['bagCap'] *= K
b['energy']['cap'] *= K
P = b['pets']
for k in ('consume', 'coldConsume', 'babyConsume'): res_map(P[k])
w('balance.json', b)

bl = j('buildings.json')
for B in bl.values():
    res_map(B['cost']['base']); res_map(B['cost'].get('perLvl', {}))
    if 'prod' in B: res_map(B['prod'])
    if 'upkeep' in B: res_map(B['upkeep']['perLvl'])
    for k in ('energy', 'use', 'heat', 'fuel'):
        if k in B: B[k] = [x * K for x in B[k]]
w('buildings.json', bl)

L = j('locations.json')
for loc in L['locations']: res_map(loc['res'])
w('locations.json', L)
for f in ('monsters.json', 'rare.json'):
    m = j(f)
    for x in m.values():
        if 'loot' in x: res_map(x['loot'])
    w(f, m)

ev = j('events.json')
for s in ev['seasons']:
    if 'consume' in s: res_map(s['consume'])
    for p in s.get('prodIf', {}).values(): res_map(p)
for e in ev['events']:
    if 'consume' in e: res_map(e['consume'])
    if 'prod' in e: res_map(e['prod'])
for o in ev['caravanOffers']:
    res_map(o['give'])
    if 'get' in o: res_map(o['get'])
w('events.json', ev)

pets = j('pets.json')
for p in pets.values():
    pk = p.get('perk', {})
    if 'prod' in pk: res_map(pk['prod'])
    if 'consume' in pk: res_map(pk['consume'])
    if 'nightParts' in pk: pk['nightParts']['amount'] = [x * K for x in pk['nightParts']['amount']]
w('pets.json', pets)
print('×', K, 'готово')
