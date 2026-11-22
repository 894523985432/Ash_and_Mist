// Спільні шматки інтерфейсу: верхня панель, вкладки, блок арту.
import { RES } from '../data.js';
import { S, maxHP, maxSily, pDef, xpNeed } from '../state.js';
import { ART, artKey } from '../art.js';
import { season, event } from '../events.js';

/** Атрибути для кнопки: клік викликає ACTIONS[name](arg) (див. ui/render.js). */
export const act = (name, arg) => `data-act="${name}"${arg !== undefined ? ` data-arg="${arg}"` : ''}`;
export const dis = ok => (ok ? '' : 'disabled');

/** Картинка за ключем (або першим наявним зі списку ключів), інакше — емодзі. */
export function artBox(keys, emoji, cls = '', cap = '') {
  const k = artKey(keys);
  return `<div class="art ${cls}">${k ? `<img src="${ART[k]}" alt="">` : emoji}${cap ? `<span class="cap">${cap}</span>` : ''}</div>`;
}

export function topBar() {
  const r = S.res, low = k => (r[k] < 2 ? 'low' : '');
  return `<div class="top"><div class="row" style="margin-bottom:6px">
    <b>День ${S.day}</b><span class="chip tap" ${act('info', 'season')}>${season().e} ${season().n}</span>${event() ? `<span class="chip ev tap" ${act('info', 'event')}>${event().e} ${event().n}</span>` : ''}<span class="chip">⭐ Рів. ${S.lvl} <span class="mut">${S.xp}/${xpNeed()}</span></span>
    <span class="chip ${S.sily < 2 ? 'low' : ''}">⚡ ${S.sily}/${maxSily()}</span><span class="chip">🛡️ ${pDef()}</span>
    <div class="bar"><i style="width:${Math.max(0, S.hp / maxHP() * 100)}%"></i></div><span class="mut">❤️ ${Math.max(0, S.hp)}/${maxHP()}</span></div>
    <div class="row">${['water', 'food', 'heat'].map(k => `<span class="chip ${low(k)}">${RES[k][0]} ${r[k]}</span>`).join('')}
    ${['fuel', 'wood', 'metal', 'parts', 'med', 'stim'].map(k => `<span class="chip">${RES[k][0]} ${r[k]}</span>`).join('')}
    <span class="chip">🌟 ${S.sup}%</span></div></div>`;
}

export function tabs() {
  if (S.trip || S.screen === 'over') return '';
  const t = [['base', '🏠', 'База'], ['map', '🗺️', 'Карта'], ['gear', '🎒', 'Спорядження'], ['art', '🎨', 'Арт']];
  return `<nav class="tabs">${t.map(([k, e, n]) => `<button class="${S.screen === k ? 'on' : ''}" ${act('go', k)}><span class="ti">${e}</span>${n}</button>`).join('')}</nav>`;
}
