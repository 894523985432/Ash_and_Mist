import { BAL, RARE } from '../data.js';
import { relEmoji } from '../npcs.js';
import { trophyCount, trophyTotal } from './base.js';
import { S, baseAP } from '../state.js';
import { itemHTML } from './format.js';
import { act, artBox } from './common.js';
import { t } from '../i18n.js';

function npcList() {
  const met = (S.npcs || []).filter(p => p.met);
  if (!met.length) return t('<span class="mut">Ще ні з ким не зустрічався.</span>');
  return met.map(p => {
    const m = p.mem, mem = [m.traded && t`торгували ${m.traded}`, m.paid && t`платив мито ${m.paid}`, m.fought && t`бились ${m.fought}`, m.beaten && t`ти переміг ${m.beaten}`, m.lostTo && t`він переміг ${m.lostTo}`].filter(Boolean).join(', ');
    return t`<div class="npc">${p.e} <b>${p.n}</b> ${relEmoji(p)} ${p.rel}${p.gone ? t(' · <span class="mut">пішов із міста</span>') : ''}<span class="mut" style="margin-left:auto">${mem || t('лише бачились')}</span></div>`;
  }).join('');
}

/** Повна колекція — трофейна стіна (раніше була на головному екрані бази). */
function trophyWall() {
  if (trophyCount() < trophyTotal()) return '';
  return t`<div style="margin-bottom:8px">${artBox('base_trophy', '🏆', '', t('Трофейна стіна: уся колекція зібрана'))}<div class="mut" style="margin-top:6px">Ти зібрав усі ${trophyTotal()} трофеїв рідкісних істот. Вижилі про це пліткують.</div></div>`;
}

export function vGear() {
  const P = BAL.player, C = BAL.combat;
  const ws = S.inv.filter(i => i.k === 'w'), as = S.inv.filter(i => i.k === 'a');
  const cell = it => {
    const on = S.eq.includes(it.id) || S.armor === it.id;
    return t`<div class="item" style="${on ? 'border-color:var(--acc)' : ''}">${itemHTML(it)}<div class="row" style="margin-top:6px">
    <button class="sm ${on ? 'out' : ''}" ${act('toggleEq', it.id)}>${on ? t('✔ Екіпіровано') : t('Екіпірувати')}</button>
    ${on ? '' : t`<button class="sm" ${act('dismantle', it.id)}>Розібрати</button>`}</div></div>`;
  };
  const tr = Object.entries(S.trophies).filter(([k, v]) => v > 0);
  return t`<div class="card"><h2>🎒 Спорядження</h2><div class="mut">До ${P.maxWeapons} зброй у бою: кожна дає ${C.copiesPerWeapon} картки в колоду, щоходу тягнеш ${C.handSize} випадкові. ОД за хід: ${baseAP()} (більше на рів. ${P.apBonusLevels.join(t(' і '))}).</div>
  <h3>Зброя (${S.eq.length}/${P.maxWeapons})</h3><div class="grid">${ws.map(cell).join('')}</div>
  <h3>Броня</h3><div class="grid">${as.map(cell).join('') || t('<span class="mut">Немає</span>')}</div>
  <h3>✨ Трофеї на складі</h3>${tr.length ? t`<div class="chips">${tr.map(([k, v]) => t`<span class="chip">${k} ×${v}</span>`).join('')}</div>` : t('<span class="mut">Поки нічого. Шукай рідкісних монстрів (найчастіше — у Туманному розломі).</span>')}
  <h3>🏆 Колекція ${trophyCount()}/${trophyTotal()}</h3>${trophyWall()}<div class="mut" style="margin-bottom:6px">Зібраний трофей лишається в колекції, навіть якщо його продати. Повна колекція відкриває трофейну стіну.</div>
  <div class="coll">${Object.values(RARE).map(r => t`<div class="item ${S.collection?.[r.trophy] ? '' : 'no'}">${S.collection?.[r.trophy] ? r.e : '❔'} <b>${r.trophy}</b><div class="mut">${S.collection?.[r.trophy] ? r.n : '???'}</div></div>`).join('')}</div>
  <h3>👥 Знайомі вижилі</h3>${npcList()}
  <h3>Статистика</h3><div class="mut">Перемог: ${S.kills} · Захист: рівень/${P.defLvlDivisor} + броня · HP: ${P.hpBase} + ${P.hpPerLvl}/рівень + броня</div></div>
  <div class="row"><button ${act('newGameConfirm')}>🔄 Нова гра</button></div>`;
}
