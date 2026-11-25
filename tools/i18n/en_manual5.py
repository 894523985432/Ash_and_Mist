# Ручний переклад рядків оновлення гри. python tools/i18n/en_manual5.py <файл зі списком нових ключів JSON>
EN = [
"<button {0}>🆕 Check for updates</button>",
"<button {0}>🚪 Quit game</button>",
"The update is already downloading…",
"You have the latest version ({0})",
"Couldn't check for updates: ",
"Your version is {0}.",
"What's new",
"<br><span class=\"mut\">The game will download the update by itself and install it after a restart. Your saves stay.</span>",
"⬇️ Update",
"<br><span class=\"mut\">Download the new APK and install it over this one — your saves stay. Android may ask for permission to install from the browser.</span>",
"<br><span class=\"mut\">Download the new file and run it instead of the old one — your saves stay.</span>",
"⬇️ Download",
"Version {0} is out",
"Later",
"Downloading the update…",
"Update failed",
"{0}<br><span class=\"mut\">You can download the new installer from the releases page and run it — your saves stay.</span>",
"Open the page",
"Close",
"Update: {0}%",
"Version {0} is ready",
"Restart the game now? If not, the update will install when you quit the game.",
"🔄 Restart",
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
