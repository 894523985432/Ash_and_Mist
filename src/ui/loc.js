// Вилазка на локацію: картинка, опис, запас, рюкзак і дії — так, щоб усе влазило в екран телефона.
import { ZONE, BAL } from '../data.js';
import { S, locById, resStr, bagCap, maxHP } from '../state.js';
import { bagCount } from '../trip.js';
import { stockHTML, act, dis, artBox } from './common.js';
import { itemEmoji } from '../items.js';
import { lineStable } from '../texts.js';
import { t } from '../i18n.js';

export function vLoc() {
  const L = locById(S.trip.loc), tp = S.trip, A = BAL.actions;
  const line = lineStable(t`locations.${L.id}`, S.day + L.id);
  const bag = [resStr(tp.bag), tp.items.map(i => itemEmoji(i)).join(' '), tp.trophies.map(() => '✨').join('')].filter(Boolean).join(' ');
  return t`<div class="loc">${artBox('loc_' + L.id, L.e, '', t`${ZONE[L.z].n} зона`)}
  <div class="card" style="margin-top:10px"><h2>${L.n}</h2>
    ${line ? t`<p style="margin:0 0 8px"><i>${line}</i></p>` : ''}
    ${S.hp < maxHP() * BAL.flavor.dangerHpPct ? t`<div class="sys">${lineStable('system.danger', S.day, {}, t('[Система] Мало HP — час додому.'))}</div>` : ''}
    ${stockHTML(L.id)}
    <h3>Рюкзак ${bagCount()}/${bagCap()}</h3><div class="bagline">${bag || t('<span class="mut">порожньо</span>')}</div>
    <div class="loc-acts">
      <button class="pri" ${act('search')} ${dis(S.sily >= A.searchSily)}>🔍 Обшукати · ${A.searchSily}⚡</button>
      <button ${act('heal')} ${dis(S.res.med)} aria-label="${t('Аптечка')}">💊 ${S.res.med}</button><button ${act('stim')} ${dis(S.res.stim)} aria-label="${t('Стимулятор')}">☕ ${S.res.stim}</button>
      <button class="home" ${act('goHome')}>🏠 Додому</button>
    </div><div class="mut" style="margin-top:6px">Аптечки й стимулятори — зі складу вдома. Програєш бій — рюкзак пропаде.</div></div></div>`;
}
