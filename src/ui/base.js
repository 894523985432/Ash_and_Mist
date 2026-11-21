import { BLD, BAL, bldCost } from '../data.js';
import { S, canPay, resStr } from '../state.js';
import { dailyConsumeText } from '../day.js';
import { act, dis, artBox } from './common.js';

export function vBase() {
  const A = BAL.actions, E = A.eat, D = BAL.day;
  const lvlSum = Object.values(S.bld).reduce((a, b) => a + b, 0);
  const b = Object.entries(BLD).map(([k, B]) => {
    const l = S.bld[k], mx = l >= B.max, c = mx ? null : bldCost(k, l);
    return `<div class="item"><b>${B.e} ${B.n}</b> <span class="mut">рів. ${l}/${B.max}</span><div class="mut">${B.d}</div>
      ${mx ? '<div class="mut">✔ максимум</div>' : `<button class="sm" style="margin-top:6px" ${act('build', k)} ${dis(canPay(c) && S.sily >= A.buildSily)}>${l ? 'Покращити' : 'Збудувати'}: ${resStr(c)} ⚡${A.buildSily}</button>`}</div>`;
  }).join('');
  const C = BAL.craft;
  return `${artBox('base', '🏚️', '', `База · покращень: ${lvlSum}`)}
  <div class="card" style="margin-top:10px"><h2>Дім</h2>
    <div class="row">
      <button ${act('eat')} ${dis(S.eaten < E.max && canPay(E.cost))}>🍖 Поїсти досхочу (+${E.sily}⚡) <span class="mut">${E.max - S.eaten}/${E.max}</span></button>
      <button ${act('heal')} ${dis(S.res.med)}>💊 Аптечка</button>
      <button ${act('stim')} ${dis(S.res.stim)}>☕ Стимулятор (+${A.stim.sily}⚡)</button>
      <button class="pri" ${act('sleep')}>🌙 Спати (кінець дня)</button>
    </div>
    <div class="mut" style="margin-top:6px">Щодоби: ${dailyConsumeText()} (вночі холодніше). Нестача → −${D.shortageHp} HP (і ще −${D.shortageHpGrowth} за кожен наступний день поспіль)${D.noHealOnShortage ? ', сон не лікує' : ''} і менше сил наступного дня. Брак тепла добирається деревом із пічки.</div>
  </div>
  <div class="card"><h2>Будівництво</h2><div class="grid">${b}</div></div>
  ${S.bld.shop ? `<div class="card"><h2>🔧 Майстерня</h2><div class="row">
    <button ${act('craft', 'w')}>Зброя: ${resStr(C.weapon)} ⚡${A.craftSily}</button><button ${act('craft', 'a')}>Броня: ${resStr(C.armor)} ⚡${A.craftSily}</button></div>
    <div class="mut" style="margin-top:6px">Рів.1 — звичайна/незвичайна, рів.2 — незвичайна/рідкісна.</div></div>` : ''}
  <div class="card"><h2>Журнал</h2><div class="log">${S.log.map(l => `<div>${l}</div>`).join('')}</div></div>`;
}
