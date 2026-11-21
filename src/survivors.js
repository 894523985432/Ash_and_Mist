// Вижилі, яких зустрічаєш на вилазці: торговці, рейдери, відлюдники.
// Звичайні зустрічі — це постійні NPC з npcs.js (пам'ятають тебе), біля суперника — сам суперник.
import { RES, LOCS, BAL } from './data.js';
import { pick, chance } from './util.js';
import { ui } from './hooks.js';
import { S, log, resStr } from './state.js';
import { startFight } from './combat.js';
import { pickNpc, npcMood, relChange, greet, npcPowMult, isFriend, relEmoji } from './npcs.js';

const pct = p => Math.round(p * 100) + '%';

export function mkHuman(name, z, npc) {
  const H = BAL.survivors.human, k = npcPowMult(npc), v = s => Math.round((s.base + s.perZone * z) * k), hp = v(H.hp);
  return { n: name.replace(/^\S+\s/, ''), e: npc?.e || '🧟', hp, max: hp, atk: v(H.atk), def: v(H.def), xp: v(H.xp), loot: H.loot, human: true, npc: npc?.id, traits: {} };
}

export function survivor(L, rivalHere) {
  const V = BAL.survivors;
  const rv = rivalHere ? S.rivals[S.rivalAt[L.id]] : null;
  const npc = rv ? null : pickNpc();
  const name = rv ? rv.e + ' ' + rv.n : npc ? npc.e + ' ' + npc.n : '🧟 Незнайомець';
  const type = rv ? (chance(V.rivalTraderChance) ? 'trader' : 'raider')
    : npc ? npcMood(npc)
    : (r => r < V.traderChance ? 'trader' : r < V.raiderThreshold ? 'raider' : 'hermit')(Math.random());
  const hello = npc ? greet(npc) + '<br>' : '';
  const relTxt = npc ? `<br><span class="mut">Стосунки: ${relEmoji(npc)} ${npc.rel}</span>` : '';
  if (npc) npc.met++;
  const rel = (key, mem) => { if (npc) relChange(npc, key, mem); };

  if (type === 'trader') {
    const tr = Object.keys(S.trophies).filter(k => S.trophies[k] > 0);
    const have = [...V.tradeRes].sort((a, b) => S.res[b] - S.res[a]);
    const give = have[0], get = have[have.length - 1], G = V.tradeGive;
    const T = V.tradeGet + (npc && isFriend(npc) ? BAL.npc.friendTradeBonus : 0);
    const btns = [];
    if (give !== get && S.res[give] >= G) btns.push([`Обміняти ${G}${RES[give][0]} → ${T}${RES[get][0]}`, () => { S.res[give] -= G; S.res[get] += T; rel('trade', 'traded'); log(`Обмін із ${name}: ${G}${RES[give][0]} → ${T}${RES[get][0]}`); }]);
    if (tr.length) {
      const t = tr[0];
      btns.push([`Продати «${t}» → ${resStr(V.trophySale)}`, () => { S.trophies[t]--; for (const k in V.trophySale) S.res[k] += V.trophySale[k]; rel('sellTrophy', 'traded'); log(`Продав трофей «${t}»`); }]);
    }
    btns.push(['Піти', null]);
    return ui.showEvent({ e: '🤝', t: name, txt: hello + 'Вижилий пропонує обмін (зі складу вдома).' + (npc && isFriend(npc) ? ' Другові — краща ціна.' : '') + (tr.length ? '<br>Його дуже цікавлять твої трофеї…' : '') + relTxt, b: btns });
  }

  if (type === 'raider') {
    const k = pick(V.tollRes), N = V.toll;
    const fight = () => { rel('fight', 'fought'); startFight(mkHuman(name, L.z, npc)); };
    const btns = [];
    if (S.res[k] >= N) btns.push([`Віддати ${N}${RES[k][0]}`, () => { S.res[k] -= N; rel('payToll', 'paid'); log(`Віддав ${name} ${N}${RES[k][0]}`); }]);
    btns.push(['Битися', fight]);
    btns.push([`Тікати (${pct(V.fleeChance)})`, () => { if (chance(V.fleeChance)) { rel('fledFrom'); log('Втік від ' + name); ui.render(); } else { ui.toast('Не вдалося!'); fight(); } }]);
    return ui.showEvent({ e: '🔪', t: name, txt: hello + `«Гей! Плати мито: ${N}${RES[k][0]}, або ляжеш тут».` + relTxt, b: btns });
  }

  rel('hermit');
  const hidden = LOCS.filter(l => !S.open.includes(l.id));
  if (hidden.length && chance(V.hermitRevealChance)) {
    const H = pick(hidden); S.open.push(H.id); log(`Відлюдник ${name} розповів про «${H.n}»`);
    return ui.showEvent({ e: '🧓', t: name, txt: hello + `Показав на мапі місце: <b>${H.n}</b>.` + relTxt, b: [['Дякую', null]] });
  }
  for (const k in V.hermitGift) S.trip.bag[k] = (S.trip.bag[k] || 0) + V.hermitGift[k];
  ui.showEvent({ e: '🧓', t: name, txt: hello + `Мовчки дав тобі ${resStr(V.hermitGift)}.` + relTxt, b: [['Дякую', null]] });
}
