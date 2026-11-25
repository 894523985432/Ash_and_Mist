import { zoneOpen } from '../map.js';
import { RES, LOCS, ZONE, BAL } from '../data.js';
import { S, bagCap } from '../state.js';
import { stockHTML } from './common.js';
import { travelCost, event } from '../events.js';
import { act, dis, artBox } from './common.js';
import { t } from '../i18n.js';

export function vMap() {
  const hidden = LOCS.filter(l => !S.open.includes(l.id) && zoneOpen(l.z)).length, A = BAL.actions;
  return t`<div class="card"><h2>🗺️ Карта</h2><div class="mut">Дорога в один бік коштує сили, назад — безкоштовно. Кожен обшук — ${A.searchSily}⚡. Рюкзак: ${bagCap()} од.</div>
  <div class="row" style="margin-top:8px"><button ${act('scout')} ${dis(hidden && S.sily >= A.scoutSily)}>🔭 Розвідка (${A.scoutSily}⚡) — ще не знайдено: ${hidden}</button></div></div>
  ${ZONE.map((Z, z) => {
    const ls = LOCS.filter(l => l.z === z && S.open.includes(l.id)); if (!ls.length) return '';
    return t`<h3 style="color:${Z.col}">${Z.n} зона · ${travelCost(z)}⚡${travelCost(z) !== Z.travel ? ' (' + event().e + ')' : ''}</h3><div class="grid">${ls.map(L => {
      const rv = S.rivalAt[L.id] !== undefined ? S.rivals[S.rivalAt[L.id]] : null;
      return t`<div class="item">${artBox('loc_' + L.id, L.e)}<b>${L.n}</b>
      <div class="mut">${Object.keys(L.res).map(k => RES[k][0]).join(' ')}${L.rareBoost ? t(' · ✨ часто рідкісні') : ''}</div>
      ${stockHTML(L.id)}${rv ? t`<div style="color:var(--acc)">${rv.e} Тут ${rv.n}</div>` : ''}
      <button class="sm out" style="margin-top:6px;width:100%" ${act('goTo', L.id)} ${dis(S.sily >= travelCost(z))}>Вирушити</button></div>`;
    }).join('')}</div>`;
  }).join('')}`;
}
