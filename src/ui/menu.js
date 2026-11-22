// Меню: налаштування, збереження (слоти, резервна копія), статистика й рекорди, арт для розробника.
import { S } from '../state.js';
import { settings, records, FONT_SIZES } from '../settings.js';
import { slotInfo, SLOTS } from '../save.js';
import { act } from './common.js';
import { vArt } from './art.js';

const LANGS = [['uk', 'Українська'], ['en', 'English']];

const range = (k, label) => `<label class="set"><span>${label}</span><input type="range" min="0" max="1" step="0.1" value="${settings[k]}" data-set="${k}"><b>${Math.round(settings[k] * 100)}%</b></label>`;
const choice = (k, label, opts) => `<div class="set"><span>${label}</span><div class="seg sm">${opts.map(([v, n]) => `<button class="${settings[k] === v ? 'on' : ''}" ${act('setting', `${k}:${v}`)}>${n}</button>`).join('')}</div></div>`;
const toggle = (k, label) => `<div class="set"><span>${label}</span><button class="sm ${settings[k] ? 'pri' : ''}" ${act('setting', `${k}:${!settings[k]}`)}>${settings[k] ? 'Увімк.' : 'Вимк.'}</button></div>`;

export function vMenu() {
  const R = records(), st = S.stats || {};
  const slots = slotInfo().map(s => {
    const cur = s.n === settings.slot;
    const what = s.broken ? '<span class="miss">пошкоджене</span>' : s.day ? `День ${s.day} · рів. ${s.lvl}${s.over ? ' · 🪦' : ''}` : '<span class="mut">порожньо</span>';
    return `<div class="slot${cur ? ' on' : ''}"><b>Слот ${s.n}</b> ${what}<div class="row" style="margin-left:auto">${cur ? '<span class="pill okb">зараз</span>' : `<button class="sm" ${act('slotLoad', s.n)}>${s.day ? 'Грати' : 'Нова гра'}</button>`}</div></div>`;
  }).join('');
  return `<div class="card"><h2>⚙️ Налаштування</h2>
    ${range('sfx', '🔊 Звуки')}${range('music', '🎵 Музика')}
    ${toggle('vibro', '📳 Вібрація')}
    ${choice('lang', '🌐 Мова', LANGS)}
    ${choice('font', '🔠 Шрифт', Object.keys(FONT_SIZES).map(k => [k, { s: 'Малий', m: 'Звичайний', l: 'Великий', xl: 'Дуже великий' }[k]]))}
    ${choice('anim', '✨ Анімації', [['normal', 'Звичайні'], ['fast', 'Швидкі'], ['off', 'Вимк.']])}
  </div>
  <div class="card"><h2>💾 Збереження</h2><div class="mut">Гра зберігається сама після кожної дії. ${SLOTS} слоти — окремі ігри.</div>
    <div style="margin:8px 0">${slots}</div>
    <div class="row"><button ${act('exportSave')}>📤 Скопіювати резервну копію</button><button ${act('importOpen')}>📥 Відновити з копії</button><button ${act('newGameConfirm')}>🔄 Нова гра в цьому слоті</button></div>
    <div class="mut" style="margin-top:6px">Резервна копія — це текст: збережи його в нотатках чи надішли собі, а потім встав у «Відновити».</div>
  </div>
  <div class="card"><h2>📊 Статистика</h2>
    <div class="stats">
      <div><b>${S.day}</b><span>день</span></div><div><b>${S.kills}</b><span>перемог</span></div><div><b>${st.built || 0}</b><span>збудовано</span></div>
      <div><b>${st.crafted || 0}</b><span>скрафчено</span></div><div><b>${st.pets || 0}</b><span>тварин знайдено</span></div><div><b>${Object.keys(S.collection || {}).length}</b><span>трофеїв</span></div>
    </div>
    <h3>🏆 Рекорди</h3>
    <div class="stats">
      <div><b>${Math.max(R.bestDay, S.day)}</b><span>найдовше днів</span></div><div><b>${Math.max(R.bestLvl, S.lvl)}</b><span>найвищий рівень</span></div>
      <div><b>${R.games}</b><span>ігор завершено</span></div><div><b>${R.kills + S.kills}</b><span>перемог усього</span></div>
    </div>
  </div>
  <details class="card"><summary><b>🎨 Арт (для розробника)</b></summary>${vArt().replace(/^<div class="card">|<\/div>$/g, '')}</details>
  <div class="mut" style="text-align:center;margin:8px 0">Попіл і Туман · v${__APP_VERSION__}</div>`;
}
