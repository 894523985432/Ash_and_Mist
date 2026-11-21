// Точка входу браузерної версії.
import './style.css';
import { S } from './state.js';
import { ui } from './hooks.js';
import { load } from './save.js';
import { newGame, sleep, eat, heal, stim } from './day.js';
import { build, craft, dismantle, toggleEq } from './base.js';
import { scout, goTo, search, goHome } from './map.js';
import { playCard, blockAct, superAct, flee, endTurn } from './combat.js';
import { restoreArt, clearArt } from './art.js';
import { mountUI, render } from './ui/render.js';

let confirmNew = false;

const ACTIONS = {
  go: s => ui.go(s),
  sleep, eat, heal, stim,
  build, craft, dismantle, toggleEq,
  scout, goTo, search, goHome,
  playCard, blockAct, superAct, flee, endTurn,
  clearArt,
  newGame: () => { newGame(); ui.go('base'); },
  newGameConfirm: () => {
    if (confirmNew) { newGame(); ui.go('base'); }
    else { confirmNew = true; ui.toast('Натисни ще раз, щоб почати заново'); }
  },
};

mountUI(ACTIONS);
if (!load()) newGame();
if (S.screen === 'fight' && !S.fight) S.screen = S.trip ? 'loc' : 'base';
render();
restoreArt();
