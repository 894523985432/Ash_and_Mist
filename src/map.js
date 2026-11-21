// Карта: розвідка, вилазки, обшук.
import { LOCS, ZONE, RARE, BAL } from './data.js';
import { rnd, pick, chance } from './util.js';
import { ui } from './hooks.js';
import { S, log, locById, resStr, useSily } from './state.js';
import { randomItem, itemEmoji } from './items.js';
import { bagCount, addBag, rollLoot, lootMult, lose } from './trip.js';
import { startFight, mkEnemy } from './combat.js';
import { survivor } from './survivors.js';
import { itemHTML } from './ui/format.js';

export function scout() {
  const A = BAL.actions, hidden = LOCS.filter(l => !S.open.includes(l.id));
  if (!hidden.length) return ui.toast('Усе вже розвідано');
  if (!useSily(A.scoutSily)) return;
  const L = hidden.sort((a, b) => a.z - b.z)[chance(A.scoutNearestChance) ? 0 : rnd(0, hidden.length - 1)];
  S.open.push(L.id); log(`🔭 Розвідка: знайдено «${L.n}» (${ZONE[L.z].n} зона)`);
  ui.showEvent({ e: L.e, t: 'Нова локація!', txt: `${L.n}<br><span class="mut">${ZONE[L.z].n} зона · дорога ${ZONE[L.z].travel}⚡</span>`, b: [['Ок', null]] });
  ui.render();
}

export function goTo(id) {
  const L = locById(id); if (!useSily(ZONE[L.z].travel)) return;
  S.trip = { loc: id, bag: {}, items: [], trophies: [] }; log(`Вирушив до «${L.n}»`); ui.go('loc');
}

export function search() {
  const SR = BAL.search;
  if (!useSily(BAL.actions.searchSily)) return;
  const L = locById(S.trip.loc), dep = !!S.depleted[L.id], mult = lootMult(L);
  S.exhaust[L.id] = (S.exhaust[L.id] || 0) + 1;
  const rareP = SR.rareBase + L.z * SR.rarePerZone + (L.rareBoost ? SR.rareBoost : 0);
  if (chance(rareP)) return startFight(mkEnemy(pick(Object.keys(RARE)), true, L.z));
  const r = Math.random(), rivalHere = S.rivalAt[L.id] !== undefined;
  if (r < SR.fight) return startFight(mkEnemy(pick(L.mon), false, L.z));
  if (r < SR.loot) {
    const o = rollLoot(L.res, mult), got = addBag(o);
    const full = bagCount() >= BAL.trip.bagCap ? '<br><span class="mut">Рюкзак повний!</span>' : '';
    return ui.showEvent({ e: '📦', t: 'Знахідка', txt: (Object.keys(got).length ? 'Знайшов: ' + resStr(got) : 'Тут уже все винесли…' + (dep ? ' (хтось був тут до тебе)' : mult < 1 ? ' (ти сам тут усе вигріб)' : '')) + full, b: [['Ок', null]] });
  }
  if (r < SR.survivor || (rivalHere && r < SR.survivorWithRival)) return survivor(L, rivalHere);
  if (r < SR.cache) { const it = randomItem(L.z); S.trip.items.push(it); return ui.showEvent({ e: itemEmoji(it), t: 'Схованка!', txt: itemHTML(it), b: [['Забрати', null]] }); }
  const d = rnd(...SR.trapDmg); S.hp -= d;
  if (S.hp <= 0) return lose('Пастка виявилась смертельною…');
  ui.showEvent({ e: '🪤', t: 'Пастка', txt: `Ти наступив на розтяжку. −${d} HP`, b: [['Ох', null]] });
}

export function goHome() {
  const t = S.trip; for (const k in t.bag) S.res[k] += t.bag[k];
  t.items.forEach(i => S.inv.push(i)); t.trophies.forEach(n => S.trophies[n] = (S.trophies[n] || 0) + 1);
  log(`Повернувся додому: ${resStr(t.bag)}${t.items.length ? ' + ' + t.items.length + ' предм.' : ''}`);
  S.trip = null; ui.go('base');
}
