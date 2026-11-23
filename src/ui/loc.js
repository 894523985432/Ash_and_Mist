import { ZONE, BAL } from '../data.js';
import { S, locById, resStr, bagCap } from '../state.js';
import { bagCount } from '../trip.js';
import { stockHTML } from './common.js';
import { itemEmoji } from '../items.js';
import { act, dis, artBox } from './common.js';
import { lineStable } from '../texts.js';
import { maxHP } from '../state.js';
import { t } from '../i18n.js';

export function vLoc() {
  const L = locById(S.trip.loc), tp = S.trip, A = BAL.actions;
  return t`${artBox('loc_' + L.id, L.e, '', L.n)}
  <div class="card" style="margin-top:10px"><h2>${L.e} ${L.n}</h2>
    ${lineStable(t`locations.${L.id}`, S.day + L.id) ? t`<p style="margin:4px 0 8px"><i>${lineStable(t`locations.${L.id}`, S.day + L.id)}</i></p>` : ''}
    ${S.hp < maxHP() * BAL.flavor.dangerHpPct ? t`<div class="sys">${lineStable('system.danger', S.day, {}, t('[Система] Мало HP — час додому.'))}</div>` : ''}
    <div class="mut">${ZONE[L.z].n} зона</div>${stockHTML(L.id)}
    <h3>Рюкзак ${bagCount()}/${bagCap()}</h3><div>${resStr(tp.bag)} ${tp.items.map(i => itemEmoji(i)).join(' ')} ${tp.trophies.map(() => '✨').join('')}</div>
    <div class="row" style="margin-top:10px">
      <button class="pri" ${act('search')} ${dis(S.sily >= A.searchSily)}>🔍 Обшукати (${A.searchSily}⚡)</button>
      <button ${act('heal')} ${dis(S.res.med)}>💊</button><button ${act('stim')} ${dis(S.res.stim)}>☕</button>
      <button ${act('goHome')}>🏠 Додому</button>
    </div><div class="mut" style="margin-top:6px">Аптечки й стимулятори — зі складу вдома. Програєш бій — рюкзак пропаде.</div></div>`;
}
