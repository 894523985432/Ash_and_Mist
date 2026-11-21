import { ZONE, BAL } from '../data.js';
import { S, locById, resStr } from '../state.js';
import { bagCount } from '../trip.js';
import { itemEmoji } from '../items.js';
import { act, dis, artBox } from './common.js';

export function vLoc() {
  const L = locById(S.trip.loc), t = S.trip, A = BAL.actions;
  return `${artBox('loc_' + L.id, L.e, '', L.n)}
  <div class="card" style="margin-top:10px"><h2>${L.e} ${L.n}</h2>
    <div class="mut">${ZONE[L.z].n} зона${S.depleted[L.id] ? ' · ⚠ хтось тут уже нишпорив' : ''}</div>
    <h3>Рюкзак ${bagCount()}/${BAL.trip.bagCap}</h3><div>${resStr(t.bag)} ${t.items.map(i => itemEmoji(i)).join(' ')} ${t.trophies.map(() => '✨').join('')}</div>
    <div class="row" style="margin-top:10px">
      <button class="pri" ${act('search')} ${dis(S.sily >= A.searchSily)}>🔍 Обшукати (${A.searchSily}⚡)</button>
      <button ${act('heal')} ${dis(S.res.med)}>💊</button><button ${act('stim')} ${dis(S.res.stim)}>☕</button>
      <button ${act('goHome')}>🏠 Додому</button>
    </div><div class="mut" style="margin-top:6px">Аптечки й стимулятори — зі складу вдома. Програєш бій — рюкзак пропаде.</div></div>`;
}
