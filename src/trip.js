// Вилазка: рюкзак, лут, поразка.
import { BAL, LOCS } from './data.js';
import { rnd } from './util.js';
import { ui } from './hooks.js';
import { S, maxHP, log, bagCap } from './state.js';
import { t } from './i18n.js';
import { raidSteal } from './day.js';

export const bagCount = () => Object.values(S.trip.bag).reduce((a, b) => a + b, 0);

export function addBag(o) {
  const got = {}, cap = bagCap();
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

/** Запас локації: 1 — повна, 0 — порожня. Відновлюється щодня (balance.stock). */
export const stock = id => S.stock?.[id] ?? 1;
export function takeStock(id, amount) { (S.stock ||= {})[id] = Math.max(0, stock(id) - amount); }
export function regenStock() {
  for (const id in S.stock || {}) {
    const L = LOCS.find(l => l.id === id); S.stock[id] += BAL.stock.regenPerDay[L?.z ?? 0];
    if (S.stock[id] >= 1) delete S.stock[id];
  }
}
/** Множник луту: від minMult при майже порожній до 1 при повній; порожня — нічого. */
export function lootMult(L) {
  const v = stock(L.id), K = BAL.stock;
  return v <= K.empty ? 0 : K.minMult + (1 - K.minMult) * v;
}
/** Підпис запасу для інтерфейсу: [текст, рівень 0..3]. */
export function stockLabel(id) {
  const v = stock(id), L = BAL.stock.labels, i = L.findIndex(([min]) => v >= min && (min > 0 || v <= BAL.stock.empty));
  return [L[Math.max(0, i)][1], Math.max(0, i)];
}

export function lose(why) {
  ui.sfx('lose');
  if (S.trip?.base) { // програв мародерам біля бази: обчищають склад
    const lost = raidSteal();
    S.trip = null; S.fight = null; S.hp = Math.max(1, Math.round(maxHP() * BAL.trip.loseHpPct));
    log('💀 ' + why); ui.go('base');
    return ui.showEvent({ e: '💀', t: t('Базу пограбовано'), txt: why + t('<br>Мародери забрали своє: ') + (lost || '—'), b: [['…', null]] });
  }
  S.trip = null; S.fight = null; S.hp = Math.max(1, Math.round(maxHP() * BAL.trip.loseHpPct)); S.sily = 0;
  log('💀 ' + why + t(' Тебе дотягли додому, рюкзак втрачено.'));
  ui.go('base');
  ui.showEvent({ e: '💀', t: t('Поразка'), txt: why + t('<br>Ти отямився вдома. Весь лут із вилазки втрачено, сил не лишилось.'), b: [['…', null]] });
}
