import { WPN, ARM, RAR, BAL } from './data.js';
import { pick, chance, uid } from './util.js';

export function mkWeapon(type, rar) {
  const b = WPN[type], R = RAR[rar];
  return { id: uid(), k: 'w', type, rar, dmg: Math.round(b.dmg * R.dm) + (R.dmgAdd || 0), ap: Math.max(BAL.minAp, b.ap + R.ap) };
}
export function mkArmor(type, rar) {
  const b = ARM[type], R = RAR[rar];
  return { id: uid(), k: 'a', type, rar, def: b.def + (R.defAdd || 0), hp: b.hp + (R.hpAdd || 0) };
}
export function rollRar(z) {
  const { base, perZone } = BAL.loot.rarityWeights, w = {};
  for (const k in base) w[k] = base[k] + perZone[k] * z;
  const t = Object.values(w).reduce((a, b) => a + b, 0);
  let r = Math.random() * t;
  for (const k in w) { if ((r -= w[k]) < 0) return k; }
  return 'c';
}
/** Випадковий тип речі рівня зони: переважно свого рівня, іноді на рівень нижче. */
export function pickType(tbl, z) {
  const keys = Object.keys(tbl), tier = k => tbl[k].tier ?? 0;
  const own = keys.filter(k => tier(k) === Math.min(z, 3)), low = keys.filter(k => tier(k) < z && tier(k) >= z - (BAL.loot.itemTierSpread ?? 1));
  const pool = own.length && (!low.length || chance(0.7)) ? own : low.length ? low : keys;
  return pick(pool);
}
export function randomItem(z) {
  return chance(BAL.loot.itemWeaponChance) ? mkWeapon(pickType(WPN, z), rollRar(z)) : mkArmor(pickType(ARM, z), rollRar(z));
}
export const itemName = it => (it.k === 'w' ? WPN[it.type].n : ARM[it.type].n);
export const itemEmoji = it => (it.k === 'w' ? WPN[it.type].e : ARM[it.type].e);
