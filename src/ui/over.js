import { S } from '../state.js';
import { act } from './common.js';

export function vOver() {
  return `<div class="card" style="text-align:center"><div style="font-size:60px">🪦</div><h2>Ти не пережив пустку</h2>
  <p>Протримався днів: <b>${S.day}</b> · Рівень ${S.lvl} · Перемог ${S.kills}</p><button class="pri" ${act('newGame')}>Почати заново</button></div>`;
}
