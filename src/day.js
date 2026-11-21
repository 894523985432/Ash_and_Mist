// День і ніч: нова гра, сон, їжа, аптечки.
import { RES, LOCS, BLD, NPCS, BAL } from './data.js';
import { rnd, pick, chance } from './util.js';
import { ui } from './hooks.js';
import { S, setState, log, maxHP, maxSily, resStr, canPay, pay } from './state.js';
import { mkWeapon, mkArmor } from './items.js';
import { rivalsMove } from './ai-rivals.js';

export function newGame() {
  const st = BAL.start;
  setState({
    day: st.day, sily: st.sily, hp: BAL.player.hpBase, lvl: 1, xp: 0, sup: 0,
    res: { ...st.res },
    bld: Object.fromEntries(Object.keys(BLD).map(k => [k, 0])),
    inv: [], eq: [], armor: null, trophies: {},
    open: LOCS.filter(l => l.z === 0).map(l => l.id),
    depleted: {}, rivals: NPCS.rivals.map(r => ({ ...r })),
    rivalAt: {}, exhaust: {}, starve: {}, eaten: 0, tired: 0, screen: 'base', trip: null, fight: null, log: [], over: false, kills: 0,
  });
  for (const d of st.items) {
    const it = d.k === 'w' ? mkWeapon(d.type, d.rar) : mkArmor(d.type, d.rar);
    S.inv.push(it);
    if (d.equip) { if (it.k === 'w') S.eq.push(it.id); else S.armor = it.id; }
  }
  S.hp = maxHP(); rivalsMove();
  log('День 1. Ти прокинувся у своєму домі на краю мертвого міста. Запасів вистачить на кілька днів.');
}

export function dailyConsumeText() {
  const c = BAL.day.consume;
  return `−${c.water}💧 −${c.food}🍖 −${c.heat + BAL.day.nightHeat}🔥`;
}

export function sleep() {
  const D = BAL.day, RD = BAL.raid, msgs = [];
  S.res.heat -= D.nightHeat; // ніч холодна
  if (S.day >= RD.fromDay && chance(RD.chance - S.bld.wall * BLD.wall.raidReduce)) {
    const keys = RD.targets.filter(k => S.res[k] > 0), lost = [];
    for (let i = 0; i < RD.rolls && keys.length; i++) { const k = pick(keys), n = Math.min(S.res[k], rnd(...RD.amount)); S.res[k] -= n; lost.push(RES[k][0] + n); }
    if (lost.length) msgs.push('🌙 Вночі хтось обчистив склад: ' + lost.join(' '));
  }
  S.day++;
  // виробництво
  for (const k in BLD) { const p = BLD[k].prod; if (p) for (const r in p) S.res[r] += p[r] * S.bld[k]; }
  const G = BLD.gen.gen;
  if (S.bld.gen && S.res.fuel >= G.fuel) { S.res.fuel -= G.fuel; S.res.heat += G.heatBase + G.heatPerLvl * S.bld.gen; }
  // споживання
  for (const r in D.consume) S.res[r] -= D.consume[r];
  if (S.res.heat < 0 && S.res.wood > 0) { const b = Math.min(S.res.wood, -S.res.heat); S.res.wood -= b; S.res.heat += b; msgs.push(`🪵 Спалив ${b} дерева в пічці, щоб не замерзнути.`); }
  // Нестача: шкода росте з кожним днем поспіль без ресурсу
  let pen = 0, dmg = 0;
  const SHORT = { water: '💧 Спрага!', food: '🍖 Голод!', heat: '🥶 Холод у домі!' };
  for (const r in SHORT) {
    if (S.res[r] < 0) {
      pen++; S.res[r] = 0; S.starve[r] = (S.starve[r] || 0) + 1;
      const d = D.shortageHp + D.shortageHpGrowth * (S.starve[r] - 1); dmg += d;
      msgs.push(`${SHORT[r]} −${d} HP, менше сил.` + (S.starve[r] > 1 ? ` (${S.starve[r]}-й день поспіль)` : ''));
    } else S.starve[r] = 0;
  }
  S.tired = pen * D.shortageTired;
  const healed = pen && D.noHealOnShortage ? S.hp : Math.min(maxHP(), S.hp + Math.round(maxHP() * D.sleepHealPct));
  if (pen && D.noHealOnShortage) msgs.push('😣 У нестачі сон не лікує.');
  S.hp = healed - dmg;
  S.sily = maxSily(); S.eaten = 0;
  for (const k in S.depleted) { if (--S.depleted[k] <= 0) delete S.depleted[k]; }
  // Виснажені тобою локації потроху відновлюються
  for (const k in S.exhaust) { S.exhaust[k] = Math.max(0, S.exhaust[k] - BAL.exhaust.regenPerDay); if (!S.exhaust[k]) delete S.exhaust[k]; }
  rivalsMove();
  msgs.forEach(m => log(m)); log('☀️ Новий день.');
  if (S.hp <= 0) S.over = true;
  ui.showEvent({ e: '🌅', t: 'День ' + S.day, txt: (msgs.length ? msgs.join('<br>') : 'Ніч минула спокійно.') + `<br><br><span class="mut">Вранці: ${dailyConsumeText()} за добу. Виробництво бази вже враховано.</span>`, b: [['Далі', null]] });
  ui.go(S.over ? 'over' : 'base');
}

export function eat() {
  const E = BAL.actions.eat;
  if (S.eaten >= E.max) return ui.toast('Більше не лізе');
  if (!canPay(E.cost)) return ui.toast('Треба ' + resStr(E.cost));
  pay(E.cost);
  S.eaten++; S.sily = Math.min(maxSily() + E.capBonus, S.sily + E.sily); log(`Поїв досхочу: +${E.sily}⚡`); ui.render();
}
export function heal() {
  if (S.res.med < 1) return;
  if (S.hp >= maxHP()) return ui.toast('Ти й так цілий');
  const p = BAL.actions.med.healPct;
  S.res.med--; S.hp = Math.min(maxHP(), S.hp + Math.round(maxHP() * p)); log(`💊 Аптечка: +${Math.round(p * 100)}% HP`); ui.render();
}
export function stim() {
  if (S.res.stim < 1) return;
  const n = BAL.actions.stim.sily;
  S.res.stim--; S.sily += n; log(`☕ Стимулятор: +${n}⚡`); ui.render();
}
