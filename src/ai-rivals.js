// ШІ-суперники: щодня вичищають одну локацію в межах своєї сили.
import { LOCS, BAL } from './data.js';
import { pick } from './util.js';
import { S, log } from './state.js';
import { t } from './i18n.js';
import { takeStock } from './trip.js';

export function rivalsMove() {
  const R = BAL.rivals;
  S.rivalAt = {};
  S.rivals.forEach((r, i) => {
    const pool = LOCS.filter(l => l.z <= Math.floor(r.pow));
    const L = pick(pool); S.rivalAt[L.id] = i; takeStock(L.id, BAL.stock.rivalTake);
    r.pow = Math.min(R.powMax, r.pow + R.powGain);
    if (S.open.includes(L.id)) log(t`${r.e} ${r.n} нишпорить біля «${L.n}» — ресурсів там поменшає.`);
  });
}
