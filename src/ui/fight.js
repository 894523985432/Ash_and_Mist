import { WPN, RAR, BAL, NPCS } from '../data.js';
import { S, item, baseAP } from '../state.js';
import { itemName } from '../items.js';
import { traitText } from '../combat.js';
import { act, dis, artBox } from './common.js';
import { lineStable } from '../texts.js';

export function vFight() {
  const F = S.fight, en = F.en, C = BAL.combat, mins = en.minions || [];
  const it = { atk: `🗡️ Атакує на ${en.intent.v}`, heavy: `💢 Важкий удар: ${en.intent.v}`, guard: `🛡️ У захисті (+${C.guardDef}) і б'є на ${en.intent.v}`, flee: '💨 Збирається втекти!' }[en.intent.t];
  const npc = en.npc && S.npcs?.find(p => p.id === en.npc), npcKey = npc && NPCS.names.find(x => x.n === npc.n)?.key;
  const key = en.human ? [npcKey && 'survivor_' + npcKey, 'survivor'].filter(Boolean) : 'mon_' + en.key;
  const chips = [
    en.stun && '💫 оглушений', en.bleedT && `🩸 ${en.bleedT}`, en.burnT && `🔥 ${en.burnT}`,
    en.shield > 0 && `🛡️ панцир ${en.shield}`, mins.length && `👥 ${en.summon.n} ×${mins.length} (${mins.map(m => m.hp).join('/')} HP)`,
  ].filter(Boolean).map(c => `<span class="chip">${c}</span>`).join('');
  const tt = traitText(en);
  return `${artBox(key, en.e, '', en.n + (en.rare ? ' ✨' : ''))}
  <div class="card" style="margin-top:10px">
    <div class="row"><b>${en.n}</b><div class="bar"><i style="width:${Math.max(0, en.hp / en.max * 100)}%"></i></div><span class="mut">${Math.max(0, en.hp)}/${en.max} · 🛡️${en.def + (en.guard ? C.guardDef : 0)}</span></div>
    ${!en.human && lineStable(`monsters.${en.key}`, en.key + S.day) ? `<div style="margin-top:4px"><i>${lineStable(`monsters.${en.key}`, en.key + S.day)}</i></div>` : ''}
    ${tt ? `<div class="mut" style="margin-top:4px">${tt}</div>` : ''}
    <div class="row" style="margin-top:8px"><span class="intent">Намір: ${it}${mins.length ? ` + прислужники ${mins.length * en.summon.atk}` : ''}</span> ${chips}</div>
  </div>
  <div class="card"><div class="row" style="margin-bottom:8px"><b>Хід ${F.turn}</b><span class="chip">⚡ ОД: ${F.ap}/${baseAP()}</span><span class="chip">🛡️ Блок: ${F.block}</span>${F.poisonT ? `<span class="chip low">☠️ отрута ${F.poison}×${F.poisonT}</span>` : ''}
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
