// Бої з героями інших гравців: дуель із другом (спаринг біля бази) і випадкова зустріч у вилазці.
// Суперником керує той самий ШІ, що й мародерами; сила — зі знімка героя (online/hero.js → heroSnapshot).
// Сервер і DOM тут не чіпаємо: результат іде через ui.pvpResult, а онлайн-модуль записує його в базу.
import { BAL } from './data.js';
import { ui } from './hooks.js';
import { S, maxHP, pDef, item, armor } from './state.js';
import { startFight } from './combat.js';
import { spareItems, itemCard } from './trade.js';
import { t } from './i18n.js';

/** Знімок свого героя для інших гравців. */
export function heroSnapshot() {
  const ws = S.eq.map(item).filter(Boolean);
  const best = ws.reduce((a, w) => Math.max(a, w.dmg), 0);
  const avg = ws.length ? ws.reduce((a, w) => a + w.dmg / Math.max(1, w.ap), 0) / ws.length : 2;
  const pet = (S.pets || []).find(p => p.id === S.petOut);
  return {
    lvl: S.lvl, day: S.day, hp: maxHP(), def: pDef(),
    weapons: ws.map(w => ({ type: w.type, rar: w.rar, dmg: w.dmg, ap: w.ap })),
    armor: armor() ? { type: armor().type, rar: armor().rar } : null,
    best, perAp: Math.round(avg * 10) / 10,
    pet: pet ? pet.type : null,
    spare: spareItems().slice(0, 16).map(itemCard), // що можна попросити в обмін
  };
}

/** Ворог зі знімка героя: шкода за хід ≈ ОД × шкода на ОД, без переваги в броні. */
export function mkPlayerEnemy(nick, hero, kind) {
  const P = BAL.player, ap = P.apBase + P.apBonusLevels.filter(l => hero.lvl >= l).length;
  const hp = Math.max(20, Math.round(hero.hp * (kind === 'duel' ? 1.6 : 1.4)));
  return {
    key: 'player', n: nick, e: '🧑‍🎤', hp, max: hp,
    atk: Math.max(3, Math.round(hero.perAp * ap * 0.55)), def: Math.min(6, Math.floor(hero.def / 2)),
    xp: kind === 'duel' ? 2 : 6 + hero.lvl * 3, loot: kind === 'encounter' ? { metal: [10, 30], parts: [10, 20], food: [0, 20] } : {},
    human: true, traits: {}, pvp: { id: null, nick, kind },
  };
}

/** Дуель із другом: спаринг біля бази — без втрати рюкзака й здоровʼя. */
export function startDuel(id, nick, hero) {
  if (S.trip || S.fight) return ui.toast(t('Спершу повернись на базу'));
  const en = mkPlayerEnemy(nick, hero, 'duel'); en.pvp.id = id;
  S.trip = { loc: null, base: true, z: Math.min(3, Math.floor((hero.lvl - 1) / 3)), bag: {}, items: [], trophies: [], duel: { hp0: S.hp } };
  startFight(en);
}

/** Випадкова зустріч у вилазці: справжній бій з лутом і ризиком. */
export function startEncounter(id, nick, hero) {
  const en = mkPlayerEnemy(nick, hero, 'encounter'); en.pvp.id = id;
  startFight(en);
}

/** Після бою з гравцем (викликає combat/trip). won — чи переміг ти. */
export function pvpDone(en, won, turns) {
  if (!en?.pvp) return;
  ui.pvpResult?.(en.pvp, won, turns);
  if (S.trip?.duel) S.hp = Math.max(S.hp, S.trip.duel.hp0); // спаринг: здоровʼя повертається
}
