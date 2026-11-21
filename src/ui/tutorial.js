// Навчання на перші дні: підказка вгорі екрана, поки її не закриють.
import { TUTORIAL, ZONE, BAL } from '../data.js';
import { S } from '../state.js';
import { act } from './common.js';

const VARS = () => ({ travel0: ZONE[0].travel, searchSily: BAL.actions.searchSily, handSize: BAL.combat.handSize, eatSily: BAL.actions.eat.sily });
const fill = t => t.replace(/\{(\w+)\}/g, (m, k) => VARS()[k] ?? m);

export function currentTip(screen) {
  if (!S.tut || S.tut.off) return null;
  return TUTORIAL.find(s => s.screen === screen && S.day >= s.day && !S.tut.seen[s.id]) || null;
}

export function tutorialCard(screen) {
  const s = currentTip(screen); if (!s) return '';
  return `<div class="card tip"><b>💡 ${s.t}</b><div style="margin:6px 0">${fill(s.txt)}</div>
    <div class="row"><button class="sm pri" ${act('tutOk', s.id)}>Зрозуміло</button><button class="sm" ${act('tutOff')}>Вимкнути навчання</button></div></div>`;
}

export function tutOk(id) { S.tut.seen[id] = true; }
export function tutOff() { S.tut.off = true; }
