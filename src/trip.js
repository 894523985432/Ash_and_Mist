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

/** Лут із таблиці {res: [min, max]}, помножений на mult (дробова частина — з імовірністю). */
export function rollLoot(tbl, mult = 1) {
  const o = {};
  for (const [k, [a, b]] of Object.entries(tbl)) {
    const x = rnd(a, b) * mult, n = Math.floor(x) + (Math.random() < x % 1 ? 1 : 0);
    if (n > 0) o[k] = n;
  }
  return o;
}

/** Наскільки зону вже вигребли інші вижилі до цього дня (1 — ціла). */
export function zoneDecay(z, day = S.day) {
  const D = BAL.exhaust.zoneDecay[z];
  if (!D || day <= D.from) return 1;
  return Math.max(D.min, 1 - (day - D.from) * D.perDay);
}

/** Множник луту локації: вигребена зона × твоє власне виснаження × суперник (÷ дільник). */
export function lootMult(L) {
  const E = BAL.exhaust;
  const ex = Math.max(E.minMult, 1 - (S.exhaust[L.id] || 0) * E.perSearch[L.z]);
  return zoneDecay(L.z) * ex / (S.depleted[L.id] ? BAL.rivals.depletedLootDivisor : 1);
}

export function lose(why) {
  S.trip = null; S.fight = null; S.hp = Math.max(1, Math.round(maxHP() * BAL.trip.loseHpPct)); S.sily = 0;
  log('💀 ' + why + ' Тебе дотягли додому, рюкзак втрачено.');
  ui.go('base');
  ui.showEvent({ e: '💀', t: 'Поразка', txt: why + '<br>Ти отямився вдома. Весь лут із вилазки втрачено, сил не лишилось.', b: [['…', null]] });
}
