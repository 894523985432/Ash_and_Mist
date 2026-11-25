// Подарунки й обмін спорядженням між друзями — частина без мережі (сервер — online/net.js).
// Річ, що йде іншому гравцю, знімається з інвентаря одразу (поки обмін не закрито, вона «в дорозі»),
// а отримана збирається заново з даних гри за типом і рідкістю — так через обмін не пройде «накручена» річ.
import { WPN, ARM, RAR } from './data.js';
import { S } from './state.js';
import { mkWeapon, mkArmor } from './items.js';

/** Речі, які можна віддати: не екіпіровані. */
export const spareItems = () => S.inv.filter(i => !S.eq.includes(i.id) && S.armor !== i.id);

/** Короткий опис речі для сервера й для інших гравців. */
export const itemCard = it => ({ id: it.id, k: it.k, type: it.type, rar: it.rar, ...(it.k === 'w' ? { dmg: it.dmg, ap: it.ap } : { def: it.def, hp: it.hp }) });

/** Забрати річ з інвентаря (якщо вона є й не екіпірована). Повертає її опис або null. */
export function takeItem(id) {
  const it = spareItems().find(i => i.id === id); if (!it) return null;
  S.inv = S.inv.filter(i => i.id !== id);
  return itemCard(it);
}

/** Чи є в мене ця річ і чи можна її віддати. */
export const hasSpare = id => spareItems().some(i => i.id === id);

/** Покласти отриману річ в інвентар: нова, з чесними характеристиками свого типу й рідкості. */
export function receiveItem(card) {
  if (!card || !RAR[card.rar]) return null;
  const it = card.k === 'w' && WPN[card.type] ? mkWeapon(card.type, card.rar)
    : card.k === 'a' && ARM[card.type] ? mkArmor(card.type, card.rar) : null;
  if (it) S.inv.push(it);
  return it;
}
