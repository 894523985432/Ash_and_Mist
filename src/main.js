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
import { load, KEY, LEGACY_KEYS } from './save.js';
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

let confirmNew = false;

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
  newGame: () => { newGame(); ui.go('base'); },
  newGameConfirm: () => {
    if (confirmNew) { newGame(); ui.go('base'); }
    else { confirmNew = true; ui.toast('Натисни ще раз, щоб почати заново'); }
  },
};

mountUI(ACTIONS);
await initStorage([KEY, ...LEGACY_KEYS]);
if (!load()) newGame();
if (S.screen === 'fight' && !S.fight) S.screen = S.trip ? 'loc' : 'base';
render();
loadArtFiles().then(restoreArt);
initPlatform();
