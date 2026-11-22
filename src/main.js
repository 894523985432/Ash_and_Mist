// Точка входу браузерної версії.
import '@fontsource/rubik/latin-400.css';
import '@fontsource/rubik/cyrillic-400.css';
import '@fontsource/rubik/latin-600.css';
import '@fontsource/rubik/cyrillic-600.css';
import '@fontsource/rubik/latin-800.css';
import '@fontsource/rubik/cyrillic-800.css';
import './style.css';
import { S } from './state.js';
import { ui } from './hooks.js';
import { load, save, LEGACY_KEYS, ALL_SAVE_KEYS, exportSave, importSave } from './save.js';
import { loadSettings, setSetting, settings, SETTINGS_KEY, RECORDS_KEY } from './settings.js';
import { repair, petFollow, petRelease } from './economy.js';
import { resInfo } from './ui/info.js';
import { initStorage } from './storage.js';
import { initPlatform } from './platform.js';
import { newGame, sleep, eat, heal, stim } from './day.js';
import { build, craft, dismantle, toggleEq } from './base.js';
import { scout, goTo, search, goHome } from './map.js';
import { playCard, blockAct, superAct, flee, endTurn } from './combat.js';
import { restoreArt, clearArt, loadArtFiles } from './art.js';
import { mountUI, render } from './ui/render.js';
import { caravanTrade, season, event } from './events.js';
import { tutOk, tutOff } from './ui/tutorial.js';

let confirmNew = false, confirmRelease = null;

async function copyText(t) {
  try { await navigator.clipboard.writeText(t); return true; } catch (e) { return false; }
}

const ACTIONS = {
  go: s => ui.go(s),
  sleep, eat, heal, stim,
  build, craft, dismantle, toggleEq,
  scout, goTo, search, goHome,
  playCard, blockAct, superAct, flee, endTurn,
  clearArt, caravanTrade,
  info: k => { const x = k === 'event' ? event() : season(); if (x) ui.toast(`${x.e} ${x.n}: ${x.d}`); },
  tutOk: id => { tutOk(id); render(); },
  tutOff: () => { tutOff(); render(); },
  resInfo,
  baseTab: t => { S.baseTab = t; render(); },
  repair, petFollow,
  petRelease: id => {
    if (confirmRelease === id) { confirmRelease = null; petRelease(id); }
    else { confirmRelease = id; ui.toast('Натисни ще раз, щоб відпустити'); }
  },
  setting: (kv, quiet) => { const i = kv.indexOf(':'); setSetting(kv.slice(0, i), kv.slice(i + 1)); if (!quiet) render(); },
  slotLoad: n => {
    save(); n = +n;
    if (!load(n)) { setSetting('slot', n); newGame(); }
    if (S.screen === 'fight' && !S.fight) S.screen = S.trip ? 'loc' : 'base';
    ui.go('base'); ui.toast('Слот ' + n);
  },
  exportSave: async () => {
    const t = exportSave();
    if (await copyText(t)) return ui.toast('Копію скопійовано — встав її в нотатки');
    ui.showEvent({ e: '📤', t: 'Резервна копія', txt: `<div class="mut">Скопіюй цей текст вручну:</div><textarea rows="6" readonly onclick="this.select()">${t.replace(/</g, '&lt;')}</textarea>`, b: [['Готово', null]] });
  },
  importOpen: () => ui.showEvent({
    e: '📥', t: 'Відновити з копії', txt: '<div class="mut">Встав текст резервної копії. Поточна гра в цьому слоті буде замінена.</div><textarea id="imptxt" rows="6"></textarea>',
    b: [['Відновити', () => {
      try { importSave(document.querySelector('#imptxt').value.trim()); ui.toast('Гру відновлено'); S.screen = 'base'; }
      catch (e) { ui.toast('Не вдалося: ' + e.message); }
    }], ['Скасувати', null]],
  }),
  newGame: () => { newGame(); ui.go('base'); },
  newGameConfirm: () => {
    if (confirmNew) { newGame(); ui.go('base'); }
    else { confirmNew = true; ui.toast('Натисни ще раз, щоб почати заново'); }
  },
};

mountUI(ACTIONS);
await initStorage([...ALL_SAVE_KEYS, ...LEGACY_KEYS, SETTINGS_KEY, RECORDS_KEY]);
loadSettings();
if (!load()) newGame();
if (S.screen === 'fight' && !S.fight) S.screen = S.trip ? 'loc' : 'base';
render();
loadArtFiles().then(restoreArt);
initPlatform();
