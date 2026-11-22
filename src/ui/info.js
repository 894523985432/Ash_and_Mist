// Довідка по ресурсу: що це, скільки зараз приходить і йде, де взяти і на що йде.
import { RES, CODEX } from '../data.js';
import { S, maxSily } from '../state.js';
import { ui } from '../hooks.js';
import { dailyConsume } from '../day.js';
import { dayModifiers } from '../events.js';
import { forecast } from '../economy.js';
import { t } from '../i18n.js';

const list = a => t`<ul class="ul">${a.map(x => t`<li>${x}</li>`).join('')}</ul>`;

export function resInfo(k) {
  const C = CODEX.res[k]; if (!C) return;
  const e = C.e || RES[k][0], n = C.n || RES[k][1];
  let now = '';
  if (k === 'sily') now = t`Зараз: <b>${S.sily}/${maxSily()}</b>`;
  else {
    const f = forecast(dailyConsume(dayModifiers()), dayModifiers()), i = f.in[k] || 0, o = f.out[k] || 0, net = i - o;
    now = t`Є: <b>${S.res[k]}</b>` + (i || o ? t` · щодня приблизно <span class="ok">+${i}</span> / <span class="bad">−${o}</span> = <b class="${net < 0 ? 'bad' : 'ok'}">${net >= 0 ? '+' : '−'}${Math.abs(net)}</b>` : '');
  }
  const grp = CODEX.groups.find(g => g.res.includes(k));
  ui.showEvent({
    e, t: n,
    txt: t`${grp ? t`<div class="mut" style="text-align:center;margin:-6px 0 8px">${grp.n}</div>` : ''}<div>${C.d}</div><div class="sys" style="margin:10px 0">${now}</div>
      <h3>Де взяти</h3>${list(C.get)}<h3>На що йде</h3>${list(C.use)}`,
    b: [[t('Зрозуміло'), null]],
  });
}
