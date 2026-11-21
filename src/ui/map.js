import { RES, MON, LOCS, ZONE, BAL } from '../data.js';
import { S } from '../state.js';
import { lootMult } from '../trip.js';
import { travelCost, event } from '../events.js';
import { act, dis, artBox } from './common.js';

export function vMap() {
  const hidden = LOCS.length - S.open.length, A = BAL.actions;
  return `<div class="card"><h2>🗺️ Карта</h2><div class="mut">Дорога в один бік коштує сили, назад — безкоштовно. Кожен обшук — ${A.searchSily}⚡. Рюкзак: ${BAL.trip.bagCap} од.</div>
  <div class="row" style="margin-top:8px"><button ${act('scout')} ${dis(hidden && S.sily >= A.scoutSily)}>🔭 Розвідка (${A.scoutSily}⚡) — ще не знайдено: ${hidden}</button></div></div>
  ${ZONE.map((Z, z) => {
    const ls = LOCS.filter(l => l.z === z && S.open.includes(l.id)); if (!ls.length) return '';
    return `<h3 style="color:${Z.col}">${Z.n} зона · ${travelCost(z)}⚡${travelCost(z) !== Z.travel ? ' (' + event().e + ')' : ''}</h3><div class="grid">${ls.map(L => {
      const rv = S.rivalAt[L.id] !== undefined ? S.rivals[S.rivalAt[L.id]] : null;
      return `<div class="item">${artBox('loc_' + L.id, L.e, 'sq')}<b>${L.n}</b>
      <div class="mut">${Object.keys(L.res).map(k => RES[k][0]).join(' ')} · ${L.mon.map(m => MON[m].e).join('')}${L.rareBoost ? ' · ✨ часто рідкісні' : ''}</div>
      ${lootMult(L) < 0.99 ? `<div style="color:var(--warn)">⚠ ${S.depleted[L.id] ? 'Вичищено суперником' : 'Виснажено'} (лут ×${lootMult(L).toFixed(1)})</div>` : ''}${rv ? `<div style="color:var(--acc)">${rv.e} Тут ${rv.n}</div>` : ''}
      <button class="sm pri" style="margin-top:6px;width:100%" ${act('goTo', L.id)} ${dis(S.sily >= travelCost(z))}>Вирушити</button></div>`;
    }).join('')}</div>`;
  }).join('')}`;
}
