# Ручний переклад рядків нового бою й інтерфейсу «Попіл». python tools/i18n/en_manual6.py <файл зі списком нових ключів JSON>
EN = [
"Not enough AP — deselect another card or block",
"Not enough AP to block",
"<div class=\"top tripbar\"><div class=\"top-a\"><b class=\"day\">Day {0}</b><span class=\"chip\">{1}</span><span class=\"lvl\">🎒 {2}/{3}</span></div>{4}</div>",
"Lvl {0}",
"<div class=\"top\"><div class=\"top-a\">\n    <b class=\"day\">Day {0}</b><span class=\"chip tap\" {1}>{2} {3}</span>{4}\n    <span class=\"lvl\">⭐ {5}<div class=\"bar xp\"><i style=\"width:{6}%\"></i></div></span></div>\n    {7}<div class=\"rgs\">{8}</div></div>",
"pick a card",
"block + / −",
"turn",
"💫 Stunned",
"🗡️ Hit {0}",
"💢 Heavy hit {0}",
"🛡️ Guard +{0} · hit {1}",
"💨 Fleeing!",
"hit",
"dmg",
"finishes the enemy",
"≈{0} to the enemy",
"block {0}",
"nothing selected",
"Turn",
"AP",
"Flee",
"You",
"you'll take",
"Super",
"Less block",
"Block",
"More block",
"Super ✔",
"{0} zone",
"Medkit",
"Stimulant",
"<div class=\"loc\">{0}\n  <div class=\"card\" style=\"margin-top:10px\"><h2>{1}</h2>\n    {2}\n    {3}\n    {4}\n    <h3>Backpack {5}/{6}</h3><div class=\"bagline\">{7}</div>\n    <div class=\"loc-acts\">\n      <button class=\"pri\" {8} {9}>🔍 Search · {10}⚡</button>\n      <button {11} {12} aria-label=\"{13}\">💊 {14}</button><button {15} {16} aria-label=\"{17}\">☕ {18}</button>\n      <button class=\"home\" {19}>🏠 Go home</button>\n    </div><div class=\"mut\" style=\"margin-top:6px\">Medkits and stimulants come from your storage at home. Lose a fight and the backpack is gone.</div></div></div>",
"<div class=\"item\">{0}<b>{1}</b>\n      <div class=\"mut\">{2}{3}</div>\n      {4}{5}\n      <button class=\"sm out\" style=\"margin-top:6px;width:100%\" {6} {7}>Set out</button></div>",
"<div class=\"card tip\"><h2>💡 {0}</h2><div style=\"margin:6px 0 10px\">{1}</div>\n    <div class=\"row\"><button class=\"sm pri\" {2}>Got it</button><button class=\"sm\" {3}>Turn off tutorial</button></div></div>",
"Mark the cards your AP can cover (the number is the order of hits), add a 🛡️ block if needed and press «Turn» — it all happens at once, then the enemy strikes. Its intent is on the plate above it. 🌟 Super charges every turn and from hits you take.",
]

if __name__ == '__main__':
    import json, sys
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).parent))
    from translate import problems
    root = Path(__file__).resolve().parents[2]
    new = json.loads(Path(sys.argv[1]).read_text('utf-8'))
    assert len(new) == len(EN), (len(new), len(EN))
    out_p = root / 'data/i18n/en.json'; out = json.loads(out_p.read_text('utf-8'))
    bad = 0
    for uk, en in zip(new, EN):
        if en is None: continue
        p = problems(uk, en)
        if p: bad += 1; print(p, uk[:60])
        else: out[uk] = en
    keys = [x['k'] for x in json.loads((root / 'tools/i18n/keys.json').read_text('utf-8'))]
    out_p.write_text(json.dumps({k: out[k] for k in keys if k in out}, ensure_ascii=False, indent=1), 'utf-8')
    print(f'en.json: {sum(k in out for k in keys)}/{len(keys)}, помилок {bad}')
