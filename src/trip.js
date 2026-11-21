// Вилазка: рюкзак, лут, поразка.
import { BAL } from './data.js';
import { rnd } from './util.js';
import { ui } from './hooks.js';
import { S, maxHP, log } from './state.js';

export const bagCount = () => Object.values(S.trip.bag).reduce((a, b) => a + b, 0);

export function addBag(o) {
  const got = {}, cap = BAL.trip.bagCap;
  for (const [k, v] of Object.entries(o)) { const room = cap - bagCount(), n = Math.min(v, room); if (n > 0) { S.trip.bag[k] = (S.trip.bag[k] || 0) + n; got[k] = n; } }
  return got;
}

export function rollLoot(tbl, half) {
  const o = {};
  for (const [k, [a, b]] of Object.entries(tbl)) { let n = rnd(a, b); if (half) n = Math.floor(n / BAL.rivals.depletedLootDivisor); if (n > 0) o[k] = n; }
  return o;
}

export function lose(why) {
  S.trip = null; S.fight = null; S.hp = Math.max(1, Math.round(maxHP() * BAL.trip.loseHpPct)); S.sily = 0;
  log('💀 ' + why + ' Тебе дотягли додому, рюкзак втрачено.');
  ui.go('base');
  ui.showEvent({ e: '💀', t: 'Поразка', txt: why + '<br>Ти отямився вдома. Весь лут із вилазки втрачено, сил не лишилось.', b: [['…', null]] });
}
