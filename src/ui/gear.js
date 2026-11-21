import { BAL, RARE } from '../data.js';
import { relEmoji } from '../npcs.js';
import { trophyCount, trophyTotal } from './base.js';
import { S, baseAP } from '../state.js';
import { itemHTML } from './format.js';
import { act } from './common.js';

function npcList() {
  const met = (S.npcs || []).filter(p => p.met);
  if (!met.length) return '<span class="mut">Ще ні з ким не зустрічався.</span>';
  return met.map(p => {
    const m = p.mem, mem = [m.traded && `торгували ${m.traded}`, m.paid && `платив мито ${m.paid}`, m.fought && `бились ${m.fought}`, m.beaten && `ти переміг ${m.beaten}`, m.lostTo && `він переміг ${m.lostTo}`].filter(Boolean).join(', ');
    return `<div class="npc">${p.e} <b>${p.n}</b> ${relEmoji(p)} ${p.rel}${p.gone ? ' · <span class="mut">пішов із міста</span>' : ''}<span class="mut" style="margin-left:auto">${mem || 'лише бачились'}</span></div>`;
  }).join('');
}

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
  <h3>✨ Трофеї на складі</h3>${tr.length ? tr.map(([k, v]) => `<span class="chip">${k} ×${v}</span>`).join(' ') : '<span class="mut">Поки нічого. Шукай рідкісних монстрів (найчастіше — у Туманному розломі).</span>'}
  <h3>🏆 Колекція ${trophyCount()}/${trophyTotal()}</h3><div class="mut" style="margin-bottom:6px">Зібраний трофей лишається в колекції, навіть якщо його продати. Повна колекція — трофейна стіна на базі.</div>
  <div class="coll">${Object.values(RARE).map(r => `<div class="item ${S.collection?.[r.trophy] ? '' : 'no'}">${S.collection?.[r.trophy] ? r.e : '❔'} <b>${r.trophy}</b><div class="mut">${S.collection?.[r.trophy] ? r.n : '???'}</div></div>`).join('')}</div>
  <h3>👥 Знайомі вижилі</h3>${npcList()}
  <h3>Статистика</h3><div class="mut">Перемог: ${S.kills} · Захист: рівень/${P.defLvlDivisor} + броня · HP: ${P.hpBase} + ${P.hpPerLvl}/рівень + броня</div></div>
  <div class="row"><button ${act('newGameConfirm')}>🔄 Нова гра</button></div>`;
}
