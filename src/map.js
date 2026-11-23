// Карта: розвідка, вилазки, обшук.
import { LOCS, ZONE, RARE, BAL } from './data.js';
import { rnd, pick, chance } from './util.js';
import { ui } from './hooks.js';
import { S, log, locById, resStr, useSily } from './state.js';
import { randomItem, itemEmoji } from './items.js';
import { bagCount, addBag, rollLoot, lootMult, lose, takeStock } from './trip.js';
import { startFight, mkEnemy } from './combat.js';
import { survivor } from './survivors.js';
import { itemHTML } from './ui/format.js';
import { travelCost, evNum } from './events.js';
import { petPerk, petFound } from './economy.js';
import { t } from './i18n.js';

export const scoutCost = () => Math.max(1, BAL.actions.scoutSily - petPerk('scoutDiscount').reduce((a, b) => a + b, 0));

export function scout() {
  const A = BAL.actions, hidden = LOCS.filter(l => !S.open.includes(l.id));
  if (!hidden.length) return ui.toast(t('Усе вже розвідано'));
  if (!useSily(scoutCost())) return;
  const L = hidden.sort((a, b) => a.z - b.z)[chance(A.scoutNearestChance) ? 0 : rnd(0, hidden.length - 1)];
  S.open.push(L.id); log(t`🔭 Розвідка: знайдено «${L.n}» (${ZONE[L.z].n} зона)`);
  ui.showEvent({ e: L.e, t: t('Нова локація!'), txt: t`${L.n}<br><span class="mut">${ZONE[L.z].n} зона · дорога ${travelCost(L.z)}⚡</span>`, b: [[t('Ок'), null]] });
  ui.render();
}

export function goTo(id) {
  const L = locById(id); if (!useSily(travelCost(L.z))) return;
  S.trip = { loc: id, bag: {}, items: [], trophies: [] }; log(t`Вирушив до «${L.n}»`); ui.go('loc');
}

export function search() {
  const SR = BAL.search;
  if (!useSily(BAL.actions.searchSily)) return;
  const L = locById(S.trip.loc), empty = lootMult(L) === 0, mult = lootMult(L) * evNum('lootMult', 1) * petPerk('lootMult', true).reduce((a, b) => a * b, 1);
  takeStock(L.id, BAL.stock.perSearch[L.z]);
  const rareP = (SR.rareBase + L.z * SR.rarePerZone + (L.rareBoost ? SR.rareBoost : 0)) * evNum('rareMult', 1);
  if (chance(rareP)) return startFight(mkEnemy(pick(Object.keys(RARE)), true, L.z));
  if (S.day >= BAL.pets.fromDay && chance(BAL.pets.findChance)) return petFound();
  const r = Math.random(), rivalHere = S.rivalAt[L.id] !== undefined;
  const fightP = SR.fight + evNum('fightAdd', 0);
  if (r < fightP) return startFight(mkEnemy(pick(L.mon), false, L.z));
  if (r < SR.loot) { // лут займає частину від fightP до SR.loot
    const o = rollLoot(L.res, mult), got = addBag(o); ui.sfx(Object.keys(got).length ? 'loot' : 'empty');
    const full = bagCount() >= BAL.trip.bagCap ? t('<br><span class="mut">Рюкзак повний!</span>') : '';
    return ui.showEvent({ e: '📦', t: t('Знахідка'), txt: (Object.keys(got).length ? t('Знайшов: ') + resStr(got) : t('Тут уже все винесли…') + (empty ? t(' Запас вичерпано — місце відновиться за кілька днів.') : '')) + full, b: [[t('Ок'), null]] });
  }
  if (r < SR.survivor || (rivalHere && r < SR.survivorWithRival)) return survivor(L, rivalHere);
  if (r < SR.cache) { const it = randomItem(L.z); S.trip.items.push(it); return ui.showEvent({ e: itemEmoji(it), t: t('Схованка!'), txt: itemHTML(it), b: [[t('Забрати'), null]] }); }
  const d = rnd(...SR.trapDmg); S.hp -= d;
  if (S.hp <= 0) return lose(t('Пастка виявилась смертельною…'));
  ui.showEvent({ e: '🪤', t: t('Пастка'), txt: t`Ти наступив на розтяжку. −${d} HP`, b: [[t('Ох'), null]] });
}

export function goHome() {
  const tp = S.trip; for (const k in tp.bag) S.res[k] += tp.bag[k];
  tp.items.forEach(i => S.inv.push(i)); tp.trophies.forEach(n => { S.trophies[n] = (S.trophies[n] || 0) + 1; S.collection[n] = true; });
  log(t`Повернувся додому: ${resStr(tp.bag)}${tp.items.length ? ' + ' + tp.items.length + t(' предм.') : ''}`);
  S.trip = null; ui.go('base');
}
