// Спільні шматки інтерфейсу: верхня панель, вкладки, блок арту.
import { RES, CODEX } from '../data.js';
import { S, maxHP, maxSily, pDef, xpNeed } from '../state.js';
import { ART, artKey } from '../art.js';
import { season, event } from '../events.js';
import { t } from '../i18n.js';

/** Атрибути для кнопки: клік викликає ACTIONS[name](arg) (див. ui/render.js). */
export const act = (name, arg) => t`data-act="${name}"${arg !== undefined ? t` data-arg="${arg}"` : ''}`;
export const dis = ok => (ok ? '' : 'disabled');

/** Картинка за ключем (або першим наявним зі списку ключів), інакше — емодзі. */
export function artBox(keys, emoji, cls = '', cap = '') {
  const k = artKey(keys);
  return t`<div class="art ${cls}">${k ? t`<img src="${ART[k]}" alt="">` : emoji}${cap ? t`<span class="cap">${cap}</span>` : ''}</div>`;
}

/** Ціна: кожен ресурс, якого не вистачає, світиться червоним. sily — скільки ⚡ сил треба. */
export function costHTML(c, sily = 0) {
  const parts = Object.entries(c || {}).filter(([, v]) => v > 0).map(([k, v]) => t`<span class="${S.res[k] < v ? 'miss' : ''}">${RES[k][0]}${v}</span>`);
  if (sily) parts.push(t`<span class="${S.sily < sily ? 'miss' : ''}">⚡${sily}</span>`);
  return t`<span class="cost">${parts.join(' ') || '—'}</span>`;
}

export function topBar() {
  const r = S.res, low = k => (['water', 'food', 'heat'].includes(k) && r[k] < 2 ? ' low' : '');
  const chip = k => t`<button class="rc${low(k)}" ${act('resInfo', k)} aria-label="${RES[k][1]}"><span>${RES[k][0]}</span><b>${r[k]}</b></button>`;
  const groups = CODEX.groups.map(g => t`<div class="rg" title="${g.n}">${g.res.map(chip).join('')}</div>`).join('');
  return t`<div class="top"><div class="row tl">
    <b>День ${S.day}</b><span class="chip tap" ${act('info', 'season')}>${season().e} ${season().n}</span>${event() ? t`<span class="chip ev tap" ${act('info', 'event')}>${event().e} ${event().n}</span>` : ''}<span class="chip">⭐ ${S.lvl} <span class="mut">${S.xp}/${xpNeed()}</span></span></div>
    <div class="row tl"><button class="rc${S.sily < 2 ? ' low' : ''}" ${act('resInfo', 'sily')}><span>⚡</span><b>${S.sily}/${maxSily()}</b></button><span class="chip">🛡️ ${pDef()}</span>
    <div class="bar"><i style="width:${Math.max(0, S.hp / maxHP() * 100)}%"></i></div><span class="mut">❤️ ${Math.max(0, S.hp)}/${maxHP()}</span></div>
    <div class="rgs">${groups}</div></div>`;
}

export function tabs() {
  if (S.trip || S.screen === 'over') return '';
  const list = [['base', '🏠', t('База')], ['map', '🗺️', t('Карта')], ['gear', '🎒', t('Спорядження')], ['menu', '☰', t('Меню')]];
  return t`<nav class="tabs">${list.map(([k, e, n]) => t`<button class="${(S.screen === k || (k === 'menu' && S.screen === 'art')) ? 'on' : ''}" ${act('go', k)}><span class="ti">${e}</span>${n}</button>`).join('')}</nav>`;
}
