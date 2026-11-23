"""Етап 8: розширення вмісту (одноразово). Локації ×2 (4 зони по 9), нові монстри глибокої зони, зброя 32, броня 12.
Існуючі записи не чіпає (лише додає tier і переносить Розлом у глибоку зону)."""
import json
from pathlib import Path

D = Path(__file__).resolve().parents[1] / 'data'
def j(n): return json.loads((D / n).read_text('utf-8'))
def w(n, d): (D / n).write_text(json.dumps(d, ensure_ascii=False), 'utf-8')

# ---------- локації ----------
L = j('locations.json')
L['zones'] = [
    {'n': 'Близька', 'travel': 2, 'col': '#5fd38a'},
    {'n': 'Середня', 'travel': 4, 'col': '#ffb23f'},
    {'n': 'Далека', 'travel': 6, 'col': '#ff5a6a'},
    {'n': 'Глибока', 'travel': 7, 'col': '#b779ff', 'locked': True},
]
for loc in L['locations']:
    if loc['id'] == 'rift': loc['z'] = 3; loc['mon'] = ['knight', 'wraith', 'angel']
NEW = [
    # близька
    ('pharmacy', 0, 'Аптека на розі', '💊', {'med': [0, 1], 'parts': [0, 10], 'water': [10, 20]}, ['rat', 'centi', 'goblin']),
    ('garage', 0, 'Гаражний кооператив', '🔧', {'metal': [10, 30], 'parts': [0, 10], 'fuel': [0, 10]}, ['dog', 'goblin', 'slime']),
    ('kiosk', 0, 'Зупинка з кіосками', '🏪', {'food': [10, 30], 'water': [10, 20]}, ['rat', 'dog', 'centi']),
    # середня
    ('bakery', 1, 'Хлібозавод', '🍞', {'food': [30, 50], 'wood': [10, 20]}, ['toad', 'crawler', 'scav']),
    ('parking', 1, 'Підземний паркінг', '🅿️', {'fuel': [20, 40], 'metal': [10, 30]}, ['raider', 'beetle', 'bwolf']),
    ('church', 1, 'Стара церква', '⛪', {'wood': [20, 30], 'med': [0, 2], 'food': [0, 20]}, ['necro', 'wasp', 'scav']),
    # далека
    ('power', 2, 'Покинута ТЕЦ', '🏭', {'fuel': [30, 50], 'parts': [20, 30], 'metal': [10, 30]}, ['golem', 'drone', 'chem']),
    ('port', 2, 'Річковий порт', '⚓', {'water': [30, 60], 'food': [20, 30], 'metal': [10, 20]}, ['spider', 'eyes', 'hive']),
    ('mall', 2, 'Торговий центр', '🏬', {'food': [30, 50], 'parts': [20, 30], 'med': [0, 2]}, ['knight', 'chem', 'wraith']),
    ('prison', 2, 'Покинута вʼязниця', '⛓️', {'metal': [30, 50], 'med': [1, 2]}, ['golem', 'spider', 'knight']),
    # глибока
    ('lab', 3, 'Підземна лабораторія', '🧬', {'parts': [40, 60], 'med': [1, 3]}, ['hybrid', 'puppet', 'chem']),
    ('airport', 3, 'Мертвий аеропорт', '🛫', {'fuel': [40, 60], 'metal': [30, 50]}, ['sniper', 'drone', 'hound']),
    ('bridge', 3, 'Зруйнований міст', '🌉', {'metal': [40, 60], 'wood': [20, 40]}, ['hound', 'giant', 'wraith']),
    ('stadium', 3, 'Стадіон-кубло', '🏟️', {'food': [40, 60], 'water': [30, 50]}, ['worm', 'hybrid', 'hound']),
    ('dam', 3, 'Гребля', '🌊', {'water': [50, 80], 'parts': [20, 40]}, ['sentinel', 'worm', 'giant']),
    ('crater', 3, 'Кратер падіння', '☄️', {'parts': [40, 70], 'fuel': [20, 40]}, ['sentinel', 'angel', 'giant']),
    ('tvcenter', 3, 'Телецентр', '📺', {'parts': [30, 50], 'metal': [20, 40], 'med': [0, 2]}, ['puppet', 'sniper', 'angel']),
    ('core', 3, 'Серце Туману', '🌫️', {'parts': [50, 80], 'med': [1, 3], 'fuel': [30, 50]}, ['angel', 'sentinel', 'puppet']),
]
have = {l['id'] for l in L['locations']}
for i, z, n, e, res, mon in NEW:
    if i not in have: L['locations'].append({'id': i, 'n': n, 'e': e, 'z': z, 'res': res, 'mon': mon})
L['locations'].sort(key=lambda l: l['z'])
w('locations.json', L)

# ---------- монстри глибокої зони ----------
M = j('monsters.json')
M.update({k: v for k, v in {
    'hound':    {'n': 'Розломний пес', 'e': '🐕‍🦺', 'hp': 46, 'atk': 11, 'def': 2, 'xp': 20, 'loot': {'food': [10, 30], 'parts': [10, 20]}},
    'giant':    {'n': 'Туманний велетень', 'e': '👹', 'hp': 70, 'atk': 12, 'def': 3, 'xp': 26, 'loot': {'metal': [30, 60]}},
    'hybrid':   {'n': 'Плоть-гібрид', 'e': '🧟', 'hp': 55, 'atk': 10, 'def': 2, 'xp': 22, 'loot': {'med': [1, 2], 'food': [10, 20]}, 'traits': {'poison': {'dmg': 5, 'turns': 3}}},
    'sniper':   {'n': 'Снайпер-відступник', 'e': '🎯', 'hp': 40, 'atk': 14, 'def': 1, 'xp': 22, 'loot': {'metal': [20, 30], 'fuel': [10, 30]}, 'traits': {'flee': {'hpPct': 0.3}}},
    'worm':     {'n': 'Туманний черв', 'e': '🪱', 'hp': 60, 'atk': 11, 'def': 2, 'xp': 24, 'loot': {'food': [20, 40]}, 'traits': {'summon': {'every': 2, 'max': 3, 'hp': 10, 'atk': 5, 'n': 'личинка'}}},
    'puppet':   {'n': 'Лялькар', 'e': '🎭', 'hp': 48, 'atk': 9, 'def': 2, 'xp': 24, 'loot': {'parts': [20, 40]}, 'traits': {'summon': {'every': 2, 'max': 3, 'hp': 9, 'atk': 5, 'n': 'лялька'}}},
    'sentinel': {'n': 'Страж Розлому', 'e': '🔰', 'hp': 58, 'atk': 12, 'def': 4, 'xp': 26, 'loot': {'parts': [30, 50], 'metal': [20, 30]}, 'traits': {'armor': {'shield': 24}}},
    'angel':    {'n': 'Сірий янгол', 'e': '🪽', 'hp': 52, 'atk': 13, 'def': 2, 'xp': 28, 'loot': {'med': [1, 3], 'parts': [20, 30]}},
}.items() if k not in M})
w('monsters.json', M)

# ---------- зброя ----------
TD = {
    'bleed': 'Кровотеча: +2 шкоди 2 ходи', 'stun': '30% оглушити ворога', 'pierce': 'Ігнорує захист і панцир',
    'heavy': 'Ламає 2 захисту і 4 панцира', 'spread': 'Шкода ±50%', 'drain': 'Лікує 50% завданої шкоди',
    'reach': 'Бʼє повз прислужників просто у ватажка', 'multi': 'Три постріли (кожен окремо проти захисту)',
    'burn': 'Підпал: 3 шкоди 3 ходи, спалює всіх прислужників', 'shock': '50% оглушити ворога',
}
W = j('weapons.json')
TIER = {'knife': 0, 'bat': 0, 'nailgun': 0, 'taser': 0, 'xbow': 1, 'spear': 1, 'molotov': 1, 'staff': 1, 'axe': 2, 'shotgun': 2}
for k, t in TIER.items(): W[k]['tier'] = t
NW = [
    ('pipe', 0, 'Обрізок труби', '🪈', 4, 2, 'heavy'), ('slingshot', 0, 'Рогатка', '🪀', 2, 1, 'pierce'),
    ('machete', 0, 'Мачете', '🗡️', 4, 2, 'bleed'), ('crowbar', 0, 'Монтування', '⛏️', 4, 2, 'stun'),
    ('pistol', 1, 'Пістолет', '🔫', 6, 2, 'pierce'), ('katana', 1, 'Катана', '⚔️', 7, 2, 'bleed'),
    ('chainsaw', 1, 'Бензопила', '🪚', 9, 3, 'heavy'), ('flare', 1, 'Ракетниця', '🎆', 5, 2, 'burn'),
    ('rifle', 2, 'Гвинтівка', '🎯', 9, 2, 'pierce'), ('warhammer', 2, 'Бойовий молот', '⚒️', 11, 3, 'stun'),
    ('flamer', 2, 'Вогнемет', '🔥', 8, 3, 'burn'), ('grenade', 2, 'Саморобна граната', '🧨', 12, 3, 'spread'),
    ('chain', 2, 'Бойовий ланцюг', '⛓️', 3, 2, 'multi'), ('scythe', 2, 'Коса', '🌾', 8, 2, 'reach'),
    ('rail', 3, 'Рейкова гвинтівка', '🛰️', 14, 3, 'pierce'), ('fogblade', 3, 'Клинок туману', '🌫️', 10, 2, 'drain'),
    ('plasma', 3, 'Плазморіз', '🔆', 12, 3, 'burn'), ('titan', 3, 'Молот титана', '🔨', 15, 3, 'heavy'),
    ('riftrod', 3, 'Розломний жезл', '🌀', 5, 2, 'multi'), ('storm', 3, 'Грозовий спис', '🌩️', 9, 2, 'shock'),
    ('moonbow', 3, 'Лук Розлому', '🌙', 11, 2, 'reach'), ('harpoon', 3, 'Гарпун', '🪝', 12, 3, 'bleed'),
]
for k, t, n, e, dmg, ap, tr in NW:
    if k not in W: W[k] = {'n': n, 'e': e, 'dmg': dmg, 'ap': ap, 'trait': tr, 'td': TD[tr], 'tier': t}
w('weapons.json', W)

# ---------- броня ----------
A = j('armor.json')
A['jacket']['tier'] = 0; A['vest']['tier'] = 1; A['plate']['tier'] = 2
for k, t, n, e, d, hp in [
    ('helmet', 0, 'Будівельна каска', '⛑️', 1, 3), ('pads', 0, 'Щитки з шин', '🩹', 2, 0),
    ('biker', 1, 'Байкерська шкіра', '🧤', 2, 8), ('gasmask', 1, 'Протигаз і плащ', '😷', 1, 12),
    ('kevlar', 2, 'Кевлар', '🥋', 4, 10), ('tactical', 2, 'Тактичний костюм', '🎽', 3, 14),
    ('exo', 3, 'Екзоскелет', '🤖', 5, 16), ('fogcloak', 3, 'Плащ туману', '🧣', 4, 22), ('riftplate', 3, 'Броня Розлому', '💠', 6, 18),
]:
    if k not in A: A[k] = {'n': n, 'e': e, 'def': d, 'hp': hp, 'tier': t}
w('armor.json', A)

b = j('balance.json')
zs = b['combat']['zoneScale']
if len(zs) < 4: zs.append({'hp': 4.0, 'atk': 4.2})
for k, v in (('itemTierSpread', 1),):
    b['loot'][k] = v
w('balance.json', b)
print(len(L['locations']), 'локацій,', len(M), 'монстрів,', len(W), 'зброї,', len(A), 'броні')
