import { BAL } from '../data.js';
import { S, baseAP } from '../state.js';
import { itemHTML } from './format.js';
import { act } from './common.js';

export function vGear() {
  const P = BAL.player, C = BAL.combat;
  const ws = S.inv.filter(i => i.k === 'w'), as = S.inv.filter(i => i.k === 'a');
  const cell = it => {
    const on = S.eq.includes(it.id) || S.armor === it.id;
    return `<div class="item" style="${on ? 'border-color:var(--acc)' : ''}">${itemHTML(it)}<div class="row" style="margin-top:6px">
    <button class="sm ${on ? 'pri' : ''}" ${act('toggleEq', it.id)}>${on ? '✔ Екіпіровано' : 'Екіпірувати'}</button>
    ${on ? '' : `<button class="sm" ${act('dismantle', it.id)}>Розібрати</button>`}</div></div>`;
  };
  const tr = Object.entries(S.trophies).filter(([k, v]) => v > 0);
  return `<div class="card"><h2>🎒 Спорядження</h2><div class="mut">До ${P.maxWeapons} зброй у бою: кожна дає ${C.copiesPerWeapon} картки в колоду, щоходу тягнеш ${C.handSize} випадкові. ОД за хід: ${baseAP()} (більше на рів. ${P.apBonusLevels.join(' і ')}).</div>
  <h3>Зброя (${S.eq.length}/${P.maxWeapons})</h3><div class="grid">${ws.map(cell).join('')}</div>
  <h3>Броня</h3><div class="grid">${as.map(cell).join('') || '<span class="mut">Немає</span>'}</div>
  <h3>✨ Трофеї</h3>${tr.length ? tr.map(([k, v]) => `<span class="chip">${k} ×${v}</span>`).join(' ') : '<span class="mut">Поки нічого. Шукай рідкісних монстрів (найчастіше — у Туманному розломі).</span>'}
  <h3>Статистика</h3><div class="mut">Перемог: ${S.kills} · Захист: рівень/${P.defLvlDivisor} + броня · HP: ${P.hpBase} + ${P.hpPerLvl}/рівень + броня</div></div>
  <div class="row"><button ${act('newGameConfirm')}>🔄 Нова гра</button></div>`;
}
