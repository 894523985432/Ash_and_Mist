// База: будівництво, крафт, розбирання, екіпірування.
import { WPN, ARM, BLD, BAL, bldCost } from './data.js';
import { pick, chance } from './util.js';
import { ui } from './hooks.js';
import { S, item, maxHP, log, canPay, pay, useSily, bl } from './state.js';
import { bldCostNow, missingNeeds, bldName, startCraft } from './economy.js';
import { mkWeapon, mkArmor, itemName, itemEmoji, pickType } from './items.js';
import { itemHTML } from './ui/format.js';
import { t } from './i18n.js';

export function build(k) {
  const B = BLD[k], l = S.bld[k]; if (l >= B.max) return;
  if (S.broken?.[k]) return ui.toast(t('Спершу полагодь'));
  const need = missingNeeds(k); if (need.length) return ui.toast(t('Потрібно: ') + need.join(', '));
  const c = bldCostNow(k, l); if (!canPay(c)) return ui.toast(t('Не вистачає ресурсів'));
  if (!useSily(BAL.actions.buildSily)) return;
  pay(c); S.bld[k]++; ui.sfx('build'); log(t`${B.e} Побудовано: ${bldName(k)} (рів. ${S.bld[k]})`);
  (S.stats ||= {}).built = (S.stats.built || 0) + 1;
  if (B.sily) S.sily += B.sily;
  ui.render();
}

export function craft(kind) {
  const C = BAL.craft, c = kind === 'w' ? C.weapon : C.armor;
  if (!bl('shop')) return ui.toast(t('Майстерня зламана'));
  if (S.job) return ui.toast(t('Майстерня ще зайнята'));
  if (!canPay(c)) return ui.toast(t('Не вистачає ресурсів'));
  if (!useSily(BAL.actions.craftSily)) return;
  pay(c);
  const lv = Math.min(S.bld.shop, Math.max(...Object.keys(C.rarityByShopLvl).map(Number)));
  const RR = C.rarityByShopLvl[lv];
  const rar = chance(RR.mainChance) ? RR.main : RR.alt;
  startCraft(kind, rar, pickType(kind === 'w' ? WPN : ARM, Math.min(3, S.bld.shop)));
}

export function dismantle(id) {
  const it = item(id); if (!it || S.eq.includes(id) || S.armor === id) return;
  const g = BAL.craft.dismantleParts[it.rar]; S.res.parts += g; S.inv = S.inv.filter(i => i.id !== id);
  log(t`Розібрав ${itemName(it)} → ⚙️${g}`); ui.render();
}

export function toggleEq(id) {
  const it = item(id), P = BAL.player;
  if (it.k === 'a') { S.armor = S.armor === id ? null : id; S.hp = Math.min(S.hp, maxHP()); return ui.render(); }
  if (S.eq.includes(id)) { if (S.eq.length <= P.minWeapons) return ui.toast(t('Потрібна хоч одна зброя')); S.eq = S.eq.filter(x => x !== id); }
  else { if (S.eq.length >= P.maxWeapons) return ui.toast(t`Максимум ${P.maxWeapons} зброї`); S.eq.push(id); }
  ui.render();
}
