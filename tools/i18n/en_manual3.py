# Ручний переклад рядків ПК-версії (етап 9). python tools/i18n/en_manual3.py
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from translate import problems
EN = {
 "Збережено: ": "Saved: ",
 '<div class="card"><h2>Журнал</h2><div class="log">{0}</div></div>': '<div class="card"><h2>Log</h2><div class="log">{0}</div></div>',
 "за добу": "per day", "День {0}": "Day {0}", "Рівень {0}": "Level {0}", "⚡ Сили": "⚡ Stamina", "⭐ Досвід": "⭐ Experience",
 "Захист": "Defense", "Хід бою": "Battle log", "Журнал": "Log", "спати": "sleep", "поїсти": "eat", "розділи бази": "base sections",
 "розвідка": "scout", "вирушити на локацію": "set out to a location", "обшукати": "search", "додому": "go home", "аптечка": "medkit",
 "зіграти карту": "play a card", "блок": "block", "супер": "super", "втекти": "flee", "кінець ходу": "end turn", "Клавіші": "Keys",
 "кнопка у вікні": "dialog button", "повний екран": "fullscreen", "🖥️ Повний екран": "🖥️ Fullscreen", "Перемкнути": "Toggle",
 "💾 Зберегти копію у файл": "💾 Save backup to file", "📤 Скопіювати резервну копію": "📤 Copy backup", "📂 Відкрити копію з файлу": "📂 Open backup file",
 "📥 Відновити з копії": "📥 Restore from backup",
 '<div class="row" style="justify-content:center"><button {0}>🚪 Вийти з гри</button></div>': '<div class="row" style="justify-content:center"><button {0}>🚪 Quit game</button></div>',
}
root = Path(__file__).resolve().parents[2]
keys = [x['k'] for x in json.loads((root / 'tools/i18n/keys.json').read_text('utf-8'))]
out_p = root / 'data/i18n/en.json'; out = json.loads(out_p.read_text('utf-8'))
old = json.loads(out_p.read_text('utf-8'))
# Довгі шаблони, які змінилися: беремо старий переклад і вставляємо нові шматки
for k in keys:
    if k in out or k in EN: continue
    if k.startswith('{0}\n  {1}\n  {2}\n  {3}\n  <div class="card" style="margin-top:10px"><h2>Дім</h2>'):
        EN[k] = '''{0}
  {1}
  {2}
  {3}
  <div class="card" style="margin-top:10px"><h2>Home</h2>
    <div class="row">
      <button {4} {5}>🍖 Eat your fill (+{6}⚡) {7} <span class="mut">{8}/{9}</span></button>
      <button {10} {11}>💊 Medkit</button>
      <button {12} {13}>☕ Stimulant (+{14}⚡)</button>
      <button class="pri" {15}>🌙 Sleep (end the day)</button>
    </div>
    <div class="mut" style="margin-top:6px">Per day now: {16}{17}. Shortage → −{18} HP (and −{19} more for each day in a row){20}. Missing heat is covered by burning wood in the stove.</div>
  </div>
  {21}'''
    if k.startswith('<div class="card"><h2>⚙️ Налаштування</h2>'):
        EN[k] = '''<div class="card"><h2>⚙️ Settings</h2>
    {0}{1}
    {2}
    {3}
    {4}
    <div class="set"><span>{5}</span><button class="sm" {6}>{7} <kbd>F11</kbd></button></div>
    {8}
  </div>
  <div class="card"><h2>💾 Saves</h2><div class="mut">The game saves itself after every action. {9} slots — separate games.</div>
    <div style="margin:8px 0">{10}</div>
    <div class="row"><button {11}>{12}</button><button {13}>{14}</button><button {15}>🔄 New game in this slot</button></div>
    <div class="mut" style="margin-top:6px">A backup is plain text: keep it in your notes or send it to yourself, then paste it into «Restore».</div>
  </div>
  <div class="card"><h2>📊 Stats</h2>
    <div class="stats">
      <div><b>{16}</b><span>day</span></div><div><b>{17}</b><span>wins</span></div><div><b>{18}</b><span>built</span></div>
      <div><b>{19}</b><span>crafted</span></div><div><b>{20}</b><span>animals found</span></div><div><b>{21}</b><span>trophies</span></div>
    </div>
    <h3>🏆 Records</h3>
    <div class="stats">
      <div><b>{22}</b><span>most days</span></div><div><b>{23}</b><span>highest level</span></div>
      <div><b>{24}</b><span>games finished</span></div><div><b>{25}</b><span>total wins</span></div>
    </div>
  </div>
  <details class="card"><summary><b>🎨 Art (for the developer)</b></summary>{26}</details>
  {27}
  <div class="mut" style="text-align:center;margin:8px 0">Ash and Fog · v{28}</div>'''
bad = 0
for k, v in EN.items():
    if k not in keys: print('нема ключа:', k[:50]); continue
    p = problems(k, v)
    if p: bad += 1; print(p, k[:60])
    else: out[k] = v
out['[Система]'] = '[Система]'  # маркер у даних сюжету, не текст для екрана
out_p.write_text(json.dumps({k: out[k] for k in keys if k in out}, ensure_ascii=False, indent=1), 'utf-8')
print(f'en.json: {sum(k in out for k in keys)}/{len(keys)}, помилок {bad}')
