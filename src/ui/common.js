// Спільні шматки інтерфейсу: верхня панель, вкладки, блок арту.
import { RES, CODEX } from '../data.js';
import { stock, stockLabel, bagCount } from '../trip.js';
import { S, maxHP, maxSily, pDef, xpNeed, bagCap } from '../state.js';
import { ART, artKey } from '../art.js';
import { season, event } from '../events.js';
import { t, tr } from '../i18n.js';

/** Атрибути для кнопки: клік викликає ACTIONS[name](arg) (див. ui/render.js). */
export const act = (name, arg) => t`data-act="${name}"${arg !== undefined ? t` data-arg="${arg}"` : ''}`;
export const dis = ok => (ok ? '' : 'disabled');

/** Картинка за ключем (або першим наявним зі списку ключів), інакше — емодзі (стане іконкою). extra — HTML поверх арту. */
export function artBox(keys, emoji, cls = '', cap = '', extra = '') {
  const k = artKey(keys);
  return t`<div class="art ${cls}">${k ? t`<img class="bg" src="${ART[k]}" alt=""><img src="${ART[k]}" alt="">` : emoji}${cap ? t`<span class="cap">${cap}</span>` : ''}${extra}</div>`;
}

/** Запас локації: смужка й підпис (Багато / Є / Мало / Порожньо). */
export function stockHTML(id) {
  const v = stock(id), [label, lvl] = stockLabel(id);
  return t`<div class="stock s${lvl}"><span>📦 ${tr(label)}</span><div class="bar"><i style="width:${Math.round(v * 100)}%"></i></div></div>`;
}

/** Ціна: кожен ресурс, якого не вистачає, світиться червоним. sily — скільки ⚡ сил треба. */
export function costHTML(c, sily = 0) {
  const parts = Object.entries(c || {}).filter(([, v]) => v > 0).map(([k, v]) => t`<span class="${S.res[k] < v ? 'miss' : ''}">${RES[k][0]}${v}</span>`);
  if (sily) parts.push(t`<span class="${S.sily < sily ? 'miss' : ''}">⚡${sily}</span>`);
  return t`<span class="cost">${parts.join(' ') || '—'}</span>`;
}

const pct = (v, max) => Math.max(0, Math.min(100, v / max * 100));

/** HP, сили й захист одним рядком. */
function vitals() {
  return t`<div class="vit">
    <div class="v${S.hp < maxHP() * 0.35 ? ' low' : ''}">❤️<div class="bar"><i style="width:${pct(S.hp, maxHP())}%"></i></div><b>${Math.max(0, S.hp)}/${maxHP()}</b></div>
    <button class="v${S.sily < 2 ? ' low' : ''}" ${act('resInfo', 'sily')}>⚡<div class="bar sily"><i style="width:${pct(S.sily, maxSily())}%"></i></div><b>${S.sily}/${maxSily()}</b></button>
    <span class="chip">🛡️ ${pDef()}</span></div>`;
}

export function topBar() {
  // На вилазці склад не потрібен — лише сили, здоровʼя і рюкзак
  if (S.trip) {
    return t`<div class="top tripbar"><div class="top-a"><b class="day">День ${S.day}</b><span class="chip">${t('Вилазка')}</span><span class="lvl">🎒 ${bagCount()}/${bagCap()}</span></div>${vitals()}</div>`;
  }
  const r = S.res, low = k => (['water', 'food', 'heat'].includes(k) && r[k] < 2 ? ' low' : '');
  const chip = k => t`<button class="rc${low(k)}" ${act('resInfo', k)} aria-label="${RES[k][1]}"><span>${RES[k][0]}</span><b>${r[k]}</b></button>`;
  const res = CODEX.groups.map(g => g.res.map(chip).join('')).join('');
  return t`<div class="top"><div class="top-a">
    <b class="day">День ${S.day}</b><span class="chip tap" ${act('info', 'season')}>${season().e} ${season().n}</span>${event() ? t`<span class="chip ev tap" ${act('info', 'event')}>${event().e} ${event().n}</span>` : ''}
    <span class="lvl">⭐ ${t`Рів. ${S.lvl}`}<div class="bar xp"><i style="width:${pct(S.xp, xpNeed())}%"></i></div></span></div>
    ${vitals()}<div class="rgs">${res}</div></div>`;
}

export function tabs() {
  if (S.trip || S.screen === 'over') return '';
  const list = [['base', '🏠', t('База')], ['map', '🗺️', t('Карта')], ['gear', '🎒', t('Спорядження')], ['online', '🌐', t('Онлайн')], ['menu', '☰', t('Меню')]];
  return t`<nav class="tabs">${list.map(([k, e, n]) => t`<button class="${(S.screen === k || (k === 'menu' && S.screen === 'art')) ? 'on' : ''}" ${act('go', k)}>${e}<span>${n}</span></button>`).join('')}</nav>`;
}
