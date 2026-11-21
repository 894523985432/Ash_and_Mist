// База: будівництво, крафт, розбирання, екіпірування.
import { WPN, ARM, BLD, BAL, bldCost } from './data.js';
import { pick, chance } from './util.js';
import { ui } from './hooks.js';
import { S, item, maxHP, log, canPay, pay, useSily } from './state.js';
import { mkWeapon, mkArmor, itemName, itemEmoji } from './items.js';
import { itemHTML } from './ui/format.js';

export function build(k) {
  const B = BLD[k], l = S.bld[k]; if (l >= B.max) return;
  const c = bldCost(k, l); if (!canPay(c)) return ui.toast('Не вистачає ресурсів');
  if (!useSily(BAL.actions.buildSily)) return;
  pay(c); S.bld[k]++; log(`${B.e} Побудовано: ${B.n} (рів. ${S.bld[k]})`);
  if (B.sily) S.sily += B.sily;
  ui.render();
}

export function craft(kind) {
  const C = BAL.craft, c = kind === 'w' ? C.weapon : C.armor;
  if (!canPay(c)) return ui.toast('Не вистачає ресурсів');
  if (!useSily(BAL.actions.craftSily)) return;
  pay(c);
  const lv = Math.min(S.bld.shop, Math.max(...Object.keys(C.rarityByShopLvl).map(Number)));
  const RR = C.rarityByShopLvl[lv];
  const rar = chance(RR.mainChance) ? RR.main : RR.alt;
  const it = kind === 'w' ? mkWeapon(pick(Object.keys(WPN)), rar) : mkArmor(pick(Object.keys(ARM)), rar);
  S.inv.push(it); log('🔧 Скрафчено: ' + itemName(it));
  ui.showEvent({ e: itemEmoji(it), t: 'Скрафчено!', txt: itemHTML(it), b: [['Ок', null]] }); ui.render();
}

export function dismantle(id) {
  const it = item(id); if (!it || S.eq.includes(id) || S.armor === id) return;
  const g = BAL.craft.dismantleParts[it.rar]; S.res.parts += g; S.inv = S.inv.filter(i => i.id !== id);
  log(`Розібрав ${itemName(it)} → ⚙️${g}`); ui.render();
}

export function toggleEq(id) {
  const it = item(id), P = BAL.player;
  if (it.k === 'a') { S.armor = S.armor === id ? null : id; S.hp = Math.min(S.hp, maxHP()); return ui.render(); }
  if (S.eq.includes(id)) { if (S.eq.length <= P.minWeapons) return ui.toast('Потрібна хоч одна зброя'); S.eq = S.eq.filter(x => x !== id); }
  else { if (S.eq.length >= P.maxWeapons) return ui.toast(`Максимум ${P.maxWeapons} зброї`); S.eq.push(id); }
  ui.render();
}
