# Ручний переклад рядків онлайну (етап 10–11). python tools/i18n/en_manual4.py <файл зі списком нових ключів JSON>
EN = [
"Duel conceded",
"☁️ The game you played offline was sent to the cloud",
"the cloud copy is damaged",
"☁️ Took the save from the cloud (day {0})",
"☁️ Loaded the game from the cloud (day {0})",
"☁️ Saved to the cloud",
"Cloud unavailable: ",
"Nickname: 3–20 letters, digits, spaces, _ . -",
"That nickname is already taken",
"Check your email",
"We sent you a confirmation email. Open the link in it, then sign in in the game.",
"Failed to sign in: ",
"Welcome, {0}!",
"☁️ Connected",
"No player with that nickname",
"That's you 🙂",
"Request sent: {0}",
"This player hasn't saved a hero to the cloud yet",
"Among the ruins you spot another survivor — it's <b>{0}</b> (lvl {1}, day {2}). Doesn't look like they plan to share their finds.",
"Go around",
"Player blocked: you won't see their messages anymore",
"Report already sent",
"Report sent. After three reports a message is hidden",
"Game updated — restarting…",
"Go back to your base first",
"Duel lost",
"{0} is stronger this time. Your health and items are intact — it was just sparring.",
None,
"Online", "Profile", "Friends", "Chat",
"<div class=\"sys\">Server unavailable: {0}</div>",
"<label>Nickname (visible to others)<input id=\"on-nick\" maxlength=\"20\" autocomplete=\"nickname\"></label>",
"<button class=\"pri\" {0}>Sign up</button><button {1}>I already have an account</button>",
"<button class=\"pri\" {0}>Sign in</button><button {1}>Create an account</button>",
"""<div class="card"><h2>🌐 Online</h2>
    <div class="mut">An account is only needed to play with friends: cloud saves (one game on your phone, PC and browser), duels, random encounters with other players on runs, and chat. Without signing in the game works as before.</div>
    {0}
    <div class="form">
      {1}
      <label>Email<input id="on-email" type="email" autocomplete="email"></label>
      <label>Password<input id="on-pass" type="password" autocomplete="{2}" minlength="6"></label>
      <div class="row">{3}</div>
    </div></div>""",
"☁️ connected",
"⚠️ offline",
" · last at {0}",
"<div class=\"sys\">Error: {0}</div>",
"<button class=\"pri\" {0}>🔄 Reconnect</button>",
"""<div class="card"><h2>👤 {0}</h2>
    <div class="stats"><div><b>{1}</b><span>duel wins</span></div><div><b>{2}</b><span>losses</span></div><div><b>{3}</b><span>friends</span></div></div>
    <div class="sys" style="margin-top:8px">Cloud: {4}{5}</div>
    <div class="mut">The game saves to the cloud by itself — at the end of every day and a few minutes after you act. On launch the cloud copy is checked against this one: if you got further on another device, that game is loaded.</div>
    {6}
    <div class="row" style="margin-top:8px">{7}<button {8}>☁️ Save now</button><button {9}>Sign out</button></div></div>""",
"<button class=\"sm pri\" {0}>Accept</button>",
"<span class=\"pill\">pending</span>",
"<button class=\"sm pri\" {0} {1}>⚔️ Duel</button><button class=\"sm\" {2}>💬</button>",
"""<div class="slot"><b>{0}</b> <span class="mut">lvl {1} · day {2}</span>
    <div class="row" style="margin-left:auto">{3}
      <button class="sm" {4}>✕</button></div></div>""",
"Friend's nickname",
"<div class=\"mut\">No one yet. Add a friend by nickname — they'll see the request on their side.</div>",
"""<div class="card"><h2>🤝 Friends</h2>
    <div class="row"><input id="on-friend" placeholder="{0}" maxlength="20" style="flex:1"><button class="pri" {1}>Add</button></div>
    <div style="margin-top:10px">{2}</div>
    <div class="mut" style="margin-top:6px">A duel is sparring with a copy of your friend's hero, controlled by the game: no risk to your health or items, once every 10 minutes with the same opponent. On runs you sometimes meet other players' heroes — those fights are real.</div></div>""",
"Report", "Block", "Global chat",
"<button class=\"sm\" {0} style=\"margin-left:auto\">Back to global</button>",
"<div class=\"mut\">It's quiet here. Write first.</div>",
"Message…",
"""<div class="card chat"><div class="row"><h2 style="margin:0">💬 {0}</h2>{1}</div>
    <div class="msgs" id="msgs">{2}</div>
    <div class="row"><input id="on-msg" maxlength="500" placeholder="{3}" style="flex:1" enterkeyhint="send"><button class="pri" {4}>➤</button></div>
    <div class="mut" style="margin-top:6px">Be decent. Swearing is masked, ⚑ — report (after three reports a message is hidden), 🚫 — stop seeing a player.</div></div>""",
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
