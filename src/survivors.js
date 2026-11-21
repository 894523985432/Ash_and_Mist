// Вижилі, яких зустрічаєш на вилазці: торговці, рейдери, відлюдники.
import { RES, LOCS, NAMES, BAL } from './data.js';
import { pick, chance } from './util.js';
import { ui } from './hooks.js';
import { S, log, resStr } from './state.js';
import { startFight } from './combat.js';

const pct = p => Math.round(p * 100) + '%';

export function mkHuman(name, z) {
  const H = BAL.survivors.human, v = s => s.base + s.perZone * z, hp = v(H.hp);
  return { n: name.replace(/^\S+\s/, ''), e: '🧟', hp, max: hp, atk: v(H.atk), def: v(H.def), xp: v(H.xp), loot: H.loot, human: true };
}

export function survivor(L, rivalHere) {
  const V = BAL.survivors;
  const rv = rivalHere ? S.rivals[S.rivalAt[L.id]] : null;
  const name = rv ? rv.e + ' ' + rv.n : '🧟 ' + pick(NAMES);
  const type = rv ? (chance(V.rivalTraderChance) ? 'trader' : 'raider')
    : (r => r < V.traderChance ? 'trader' : r < V.raiderThreshold ? 'raider' : 'hermit')(Math.random());

  if (type === 'trader') {
    const tr = Object.keys(S.trophies).filter(k => S.trophies[k] > 0);
    const have = [...V.tradeRes].sort((a, b) => S.res[b] - S.res[a]);
    const give = have[0], get = have[have.length - 1], G = V.tradeGive, T = V.tradeGet;
    const btns = [];
    if (give !== get && S.res[give] >= G) btns.push([`Обміняти ${G}${RES[give][0]} → ${T}${RES[get][0]}`, () => { S.res[give] -= G; S.res[get] += T; log(`Обмін із ${name}: ${G}${RES[give][0]} → ${T}${RES[get][0]}`); }]);
    if (tr.length) {
      const t = tr[0];
      btns.push([`Продати «${t}» → ${resStr(V.trophySale)}`, () => { S.trophies[t]--; for (const k in V.trophySale) S.res[k] += V.trophySale[k]; log(`Продав трофей «${t}»`); }]);
    }
    btns.push(['Піти', null]);
    return ui.showEvent({ e: '🤝', t: name, txt: 'Вижилий пропонує обмін (зі складу вдома).' + (tr.length ? '<br>Його дуже цікавлять твої трофеї…' : ''), b: btns });
  }

  if (type === 'raider') {
    const k = pick(V.tollRes), N = V.toll;
    const btns = [];
    if (S.res[k] >= N) btns.push([`Віддати ${N}${RES[k][0]}`, () => { S.res[k] -= N; log(`Віддав ${name} ${N}${RES[k][0]}`); }]);
    btns.push(['Битися', () => startFight(mkHuman(name, L.z))]);
    btns.push([`Тікати (${pct(V.fleeChance)})`, () => { if (chance(V.fleeChance)) { log('Втік від ' + name); ui.render(); } else { ui.toast('Не вдалося!'); startFight(mkHuman(name, L.z)); } }]);
    return ui.showEvent({ e: '🔪', t: name, txt: `«Гей! Плати мито: ${N}${RES[k][0]}, або ляжеш тут».`, b: btns });
  }

  const hidden = LOCS.filter(l => !S.open.includes(l.id));
  if (hidden.length && chance(V.hermitRevealChance)) {
    const H = pick(hidden); S.open.push(H.id); log(`Відлюдник ${name} розповів про «${H.n}»`);
    return ui.showEvent({ e: '🧓', t: name, txt: `Старий відлюдник показав на мапі місце: <b>${H.n}</b>.`, b: [['Дякую', null]] });
  }
  for (const k in V.hermitGift) S.trip.bag[k] = (S.trip.bag[k] || 0) + V.hermitGift[k];
  ui.showEvent({ e: '🧓', t: name, txt: `Відлюдник мовчки дав тобі ${resStr(V.hermitGift)}.`, b: [['Дякую', null]] });
}
