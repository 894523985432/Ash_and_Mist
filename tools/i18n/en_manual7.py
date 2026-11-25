# Ручний переклад рядків подарунків і обміну. python tools/i18n/en_manual7.py <файл зі списком нових ключів JSON>
EN = [
"🤝 {0} agreed to the trade: {1}",
"🎁 {0} accepted the gift",
"↩️ {0} didn't take it — the item came back: {1}",
"Choose what you give",
"You can't give this item — unequip it first",
"Offer sent: {0}",
"Gift sent: {0}",
"You no longer have the requested item, or it's equipped",
"Failed: the offer was already cancelled",
"Received: {0}",
"<div class=\"card\" style=\"margin-top:10px\"><h2>Home</h2>\n    <div class=\"row\">\n      <button class=\"pri\" {0}>🌙 Sleep (end the day)</button>\n      <button {1} {2}>🍖 Eat your fill (+{3}⚡) {4} <span class=\"mut\">{5}/{6}</span></button>\n      <button {7} {8}>💊 Medkit</button>\n      <button {9} {10}>☕ Stimulant (+{11}⚡)</button>\n    </div>\n    <div class=\"mut\" style=\"margin-top:6px\">Daily use now: {12}{13}. Shortage → −{14} HP (and −{15} more for each following day in a row){16}. Missing heat is made up with wood from the stove.</div>\n  </div>",
"Trophy wall: the whole collection is complete",
"<div style=\"margin-bottom:8px\">{0}<div class=\"mut\" style=\"margin-top:6px\">You've collected all {1} trophies of rare creatures. The survivors gossip about it.</div></div>",
"<div class=\"card\"><h2>🎒 Gear</h2><div class=\"mut\">Up to {0} weapons in battle: each adds {1} cards to the deck, and every turn you draw {2} at random. AP per turn: {3} (more at lvl {4}).</div>\n  <h3>Weapons ({5}/{6})</h3><div class=\"grid\">{7}</div>\n  <h3>Armor</h3><div class=\"grid\">{8}</div>\n  <h3>✨ Trophies in storage</h3>{9}\n  <h3>🏆 Collection {10}/{11}</h3>{12}<div class=\"mut\" style=\"margin-bottom:6px\">A collected trophy stays in the collection even if you sell it. A full collection unlocks the trophy wall.</div>\n  <div class=\"coll\">{13}</div>\n  <h3>👥 Survivors you know</h3>{14}\n  <h3>Stats</h3><div class=\"mut\">Wins: {15} · Defense: level/{16} + armor · HP: {17} + {18}/level + armor</div></div>\n  <div class=\"row\"><button {19}>🔄 New game</button></div>",
"Gift or trade",
"<button class=\"sm pri\" {0} {1}>⚔️ Duel</button><button class=\"sm\" {2} aria-label=\"{3}\">🎁</button><button class=\"sm\" {4}>💬</button>",
"<b>{0}</b> offers a trade:",
"<b>{0}</b> gives you:",
"<div class=\"item\"><div class=\"mut\">In return asks for your:</div>{0}</div>",
"Trade",
"Accept",
"<div class=\"trade\">{0}\n    <div class=\"grid\">{1}{2}</div>\n    <div class=\"row\" style=\"margin-top:6px\"><button class=\"sm pri\" {3}>{4}</button><button class=\"sm\" {5}>Decline</button></div></div>",
"<div class=\"item\"><div class=\"mut\">In return:</div>{0}</div>",
"<div class=\"trade\"><span class=\"mut\">Waiting for {0} to answer:</span>\n    <div class=\"grid\">{1}{2}</div>\n    <div class=\"row\" style=\"margin-top:6px\"><button class=\"sm\" {3}>Cancel</button></div></div>",
"<div class=\"card\"><h2>🎁 Gifts and trades</h2>{0}{1}</div>",
"<div class=\"mut\">No free items: everything is equipped.</div>",
"<div class=\"mut\" style=\"margin-top:6px\">Your friend has no free items (or hasn't played in a while).</div>",
"🤝 Offer a trade",
"🎁 Give",
"<div class=\"card\"><h2>🎁 {0}</h2>\n    <div class=\"mut\">The item goes to your friend as soon as they agree. Until they answer, you can take it back. Equipped items can't be given.</div>\n    <h3>What you give</h3>{1}\n    <h3>What you ask in return</h3><div class=\"grid\"><button class=\"item tradeitem{2}\" {3}><b>🎁 Nothing</b><div class=\"mut\">It's a gift</div></button>{4}</div>\n    {5}\n    <div class=\"row\" style=\"margin-top:12px\"><button class=\"pri\" {6} {7}>{8}</button><button {9}>Back</button></div></div>",
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
