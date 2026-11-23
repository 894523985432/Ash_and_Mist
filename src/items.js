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
export function randomItem(z) {
  return chance(BAL.loot.itemWeaponChance) ? mkWeapon(pick(Object.keys(WPN)), rollRar(z)) : mkArmor(pick(Object.keys(ARM)), rollRar(z));
}
export const itemName = it => (it.k === 'w' ? WPN[it.type].n : ARM[it.type].n);
export const itemEmoji = it => (it.k === 'w' ? WPN[it.type].e : ARM[it.type].e);
