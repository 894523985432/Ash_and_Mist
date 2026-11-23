import { RES, LOCS, BLD, BAL } from './data.js';
import { ui } from './hooks.js';
import { line } from './texts.js';
import { t } from './i18n.js';

/** Поточний стан гри. Міняти посилання — тільки через setState. */
export let S = null;
export function setState(s) { S = s; }

const P = BAL.player;
/** Рівень будівлі, що реально працює (зламана — 0). */
export const bl = k => (S.broken?.[k] ? 0 : S.bld[k]);
export const item = id => S.inv.find(i => i.id === id);
export const armor = () => S.armor ? item(S.armor) : null;
export const maxHP = () => P.hpBase + (S.lvl - 1) * P.hpPerLvl + (armor()?.hp || 0);
export const pDef = () => Math.floor(S.lvl / P.defLvlDivisor) + (armor()?.def || 0);
export const baseAP = () => P.apBase + P.apBonusLevels.filter(l => S.lvl >= l).length;
export const maxSily = () => Math.max(P.silyMin, P.silyBase + bl('bed') * BLD.bed.sily - S.tired);
/** Місткість рюкзака: базова + будівля «Рюкзак». */
export const bagCap = () => BAL.trip.bagCap + bl('bag') * (BLD.bag?.cap || 0);
export const xpNeed = () => P.xpBase + S.lvl * P.xpPerLvl;
export const locById = id => LOCS.find(l => l.id === id);

export function log(msg) { S.log.unshift(t('Д') + S.day + ': ' + msg); S.log.length = Math.min(S.log.length, BAL.logMax); }

export const resStr = o => Object.entries(o).filter(([k, v]) => v > 0).map(([k, v]) => RES[k][0] + v).join(' ') || '—';
export const canPay = o => Object.entries(o).every(([k, v]) => S.res[k] >= v);
export const pay = o => { for (const k in o) S.res[k] -= o[k]; };
export function useSily(n) { if (S.sily < n) { ui.toast(t('Не вистачає сил ⚡')); return false; } S.sily -= n; return true; }

export function gainXP(x) {
  S.xp += x; let up = false;
  while (S.xp >= xpNeed()) { S.xp -= xpNeed(); S.lvl++; up = true; S.hp += P.hpPerLvl; }
  if (up) { ui.sfx('level'); log(t`⭐ [Система] Рівень ${S.lvl}. ` + line('system.levelUp').replace(/^\[(Система|System)\]\s*/, '')); ui.toast(t('⭐ Рівень ') + S.lvl + '!'); }
}
