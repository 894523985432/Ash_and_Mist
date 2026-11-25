// Навчання на перші дні: підказка вгорі екрана, поки її не закриють.
import { TUTORIAL, ZONE, BAL } from '../data.js';
import { S } from '../state.js';
import { act } from './common.js';
import { t, tr } from '../i18n.js';

const VARS = () => ({ travel0: ZONE[0].travel, searchSily: BAL.actions.searchSily, handSize: BAL.combat.handSize, eatSily: BAL.actions.eat.sily });
const fill = s => s.replace(/\{(\w+)\}/g, (m, k) => VARS()[k] ?? m);
/** Текст підказки з підставленими числами (перекладений). */
export const tipText = s => fill(tr(s.txt));

export function currentTip(screen) {
  if (!S.tut || S.tut.off) return null;
  return TUTORIAL.find(s => s.screen === screen && S.day >= s.day && !S.tut.seen[s.id]) || null;
}

export function tutorialCard(screen) {
  if (screen === 'fight') return ''; // у бою підказка — тонкою смужкою всередині екрана бою
  const s = currentTip(screen); if (!s) return '';
  return t`<div class="card tip"><h2>💡 ${s.t}</h2><div style="margin:6px 0 10px">${tipText(s)}</div>
    <div class="row"><button class="sm pri" ${act('tutOk', s.id)}>Зрозуміло</button><button class="sm" ${act('tutOff')}>Вимкнути навчання</button></div></div>`;
}

export function tutOk(id) { S.tut.seen[id] = true; }
export function tutOff() { S.tut.off = true; }
