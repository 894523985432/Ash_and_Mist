import { WPN, RAR, BAL } from '../data.js';
import { S, item, baseAP } from '../state.js';
import { itemName } from '../items.js';
import { act, dis, artBox } from './common.js';

export function vFight() {
  const F = S.fight, en = F.en, C = BAL.combat;
  const it = { atk: `🗡️ Атакує на ${en.intent.v}`, heavy: `💢 Важкий удар: ${en.intent.v}`, guard: `🛡️ У захисті (+${C.guardDef}) і б'є на ${en.intent.v}`, flee: '💨 Збирається втекти!' }[en.intent.t];
  const key = en.human ? 'survivor' : 'mon_' + en.key;
  return `${artBox(key, en.e, '', en.n + (en.rare ? ' ✨' : ''))}
  <div class="card" style="margin-top:10px">
    <div class="row"><b>${en.n}</b><div class="bar"><i style="width:${Math.max(0, en.hp / en.max * 100)}%"></i></div><span class="mut">${Math.max(0, en.hp)}/${en.max} · 🛡️${en.def + (en.guard ? C.guardDef : 0)}</span></div>
    <div style="margin-top:8px"><span class="intent">Намір: ${it}</span> ${en.stun ? '<span class="chip">💫 оглушений</span>' : ''}${en.bleedT ? '<span class="chip">🩸 ' + en.bleedT + '</span>' : ''}</div>
  </div>
  <div class="card"><div class="row" style="margin-bottom:8px"><b>Хід ${F.turn}</b><span class="chip">⚡ ОД: ${F.ap}/${baseAP()}</span><span class="chip">🛡️ Блок: ${F.block}</span>
    <div class="bar sup"><i style="width:${S.sup / C.super.max * 100}%"></i></div><span class="mut">🌟 ${S.sup}%</span></div>
    <div class="hand">${F.hand.map((id, i) => {
      const w = item(id); if (!w) return ''; const R = RAR[w.rar];
      return `<button class="wcard" style="border-color:${R.col}" ${act('playCard', i)} ${dis(F.ap >= w.ap)}>
        <div class="row" style="width:100%"><span class="e">${WPN[w.type].e}</span><span class="ap">${w.ap}</span></div>
        <b>${itemName(w)}</b><span style="color:${R.col};font-size:12px">${R.n}</span><span>🗡️ ${w.dmg}</span><span class="mut" style="font-size:11px">${WPN[w.type].td}</span></button>`;
    }).join('')}</div>
    <div class="row" style="margin-top:10px">
      <button ${act('blockAct')} ${dis(F.ap >= C.block.cost)}>🛡️ Блок +${C.block.value} (${C.block.cost} ОД)</button>
      <button ${act('superAct')} ${S.sup >= C.super.max ? 'class="pri"' : 'disabled'}>🌟 Супер</button>
      <button ${act('flee')}>🏃 Втекти</button>
      <button class="pri" ${act('endTurn')}>Кінець ходу ▶</button>
    </div></div>
  <div class="card"><div class="log">${F.flog.slice(0, 8).map(l => `<div>${l}</div>`).join('')}</div></div>`;
}
