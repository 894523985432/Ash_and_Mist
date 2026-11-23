// День і ніч: нова гра, сон, їжа, аптечки.
import { RES, LOCS, BLD, NPCS, BAL } from './data.js';
import { rnd, pick, chance } from './util.js';
import { ui } from './hooks.js';
import { S, setState, log, maxHP, maxSily, resStr, canPay, pay, bl } from './state.js';
import { heatMult, morningPower, rollWear, craftTick, petConsume, petsMorning, petPerk } from './economy.js';
import { mkWeapon, mkArmor } from './items.js';
import { rivalsMove } from './ai-rivals.js';
import { regenStock } from './trip.js';
import { initNpcs, npcsDaily, npcNightRaid } from './npcs.js';
import { rollEvent, dayModifiers, evNum } from './events.js';
import { TEXTS, line } from './texts.js';
import { recordGame } from './settings.js';
import { t } from './i18n.js';

export function newGame() {
  const st = BAL.start;
  if (S && !S.over && S.day > 1) recordGame(S, false);
  setState({
    day: st.day, sily: st.sily, hp: BAL.player.hpBase, lvl: 1, xp: 0, sup: 0,
    res: { ...st.res },
    bld: { ...Object.fromEntries(Object.keys(BLD).map(k => [k, 0])), ...(st.bld || {}) },
    inv: [], eq: [], armor: null, trophies: {},
    open: [...st.open],
    rivals: NPCS.rivals.map(r => ({ ...r })),
    rivalAt: {}, stock: {}, starve: {}, broken: {}, job: null, pets: [], petOut: null, fuelAcc: 0, stats: {}, npcs: initNpcs(), event: null, caravan: null, collection: {}, tut: { seen: {}, off: false }, eaten: 0, tired: 0, screen: 'base', trip: null, fight: null, log: [], over: false, kills: 0,
  });
  for (const d of st.items) {
    const it = d.k === 'w' ? mkWeapon(d.type, d.rar) : mkArmor(d.type, d.rar);
    S.inv.push(it);
    if (d.equip) { if (it.k === 'w') S.eq.push(it.id); else S.armor = it.id; }
  }
  S.hp = maxHP(); rivalsMove();
  const intro = TEXTS.intro?.length ? TEXTS.intro : [t('Ти прокинувся у своєму домі на краю мертвого міста.')];
  [...intro].reverse().forEach(l => log(l));
  ui.showEvent({ e: '🌀', t: t('Друге життя'), txt: intro.map(l => `<p style="margin:0 0 8px">${l}</p>`).join(''), b: [[t('Почати'), null]] });
}

/** Добова витрата (з урахуванням сезону й події, якщо передати mods). */
export function dailyConsume(mods) {
  const c = { ...BAL.day.consume }; c.heat += BAL.day.nightHeat;
  for (const r in mods?.consume || {}) c[r] = (c[r] || 0) + mods.consume[r];
  c.heat = Math.ceil(c.heat * heatMult());
  const pc = petConsume(); for (const r in pc) c[r] = (c[r] || 0) + pc[r];
  return c;
}
export function dailyConsumeText(mods) {
  const c = dailyConsume(mods);
  return Object.entries(c).filter(([, v]) => v > 0).map(([r, v]) => `−${v}${RES[r][0]}`).join(' ');
}

export function sleep() {
  ui.sfx('sleep');
  const D = BAL.day, RD = BAL.raid, msgs = [];
  const mods = dayModifiers(); // сезон і подія дня, що минає
  const consume = dailyConsume(mods); // рахуємо до зміни дня: сезон і тварини цього вечора
  const npcRaid = npcNightRaid();
  if (npcRaid) msgs.push(npcRaid);
  else if (S.day >= RD.fromDay && chance(RD.chance + evNum('raidAdd', 0) - bl('wall') * BLD.wall.raidReduce - petPerk('raidReduce').reduce((a, b) => a + b, 0))) {
    const keys = RD.targets.filter(k => S.res[k] > 0), lost = [];
    for (let i = 0; i < RD.rolls && keys.length; i++) { const k = pick(keys), n = Math.min(S.res[k], rnd(...RD.amount)); S.res[k] -= n; lost.push(RES[k][0] + n); }
    if (lost.length) msgs.push(t('🌙 Вночі хтось обчистив склад: ') + lost.join(' '));
  }
  S.day++;
  npcsDaily();
  // виробництво (+ сезон і подія)
  for (const k in BLD) { const p = BLD[k].prod; if (p && k !== 'garden') for (const r in p) S.res[r] += p[r] * bl(k); }
  for (const r in mods.prod) S.res[r] += mods.prod[r];
  morningPower(msgs); // генератор і панель → енергія → обігрівач і теплиця
  petsMorning(msgs);
  // споживання (тепло з урахуванням сезону, плюс тварини)
  for (const r in consume) S.res[r] -= consume[r];
  if (S.res.heat < 0 && S.res.wood > 0) { const b = Math.min(S.res.wood, -S.res.heat); S.res.wood -= b; S.res.heat += b; msgs.push(t`🪵 Спалив ${b} дерева в пічці, щоб не замерзнути.`); }
  // Нестача: шкода росте з кожним днем поспіль без ресурсу
  let pen = 0, dmg = 0;
  const SHORT = { water: t('💧 Спрага!'), food: t('🍖 Голод!'), heat: t('🥶 Холод у домі!') };
  for (const r in SHORT) {
    if (S.res[r] < 0) {
      pen++; S.res[r] = 0; S.starve[r] = (S.starve[r] || 0) + 1;
      const d = D.shortageHp + D.shortageHpGrowth * (S.starve[r] - 1); dmg += d;
      msgs.push(t`${SHORT[r]} −${d} HP, менше сил.` + (S.starve[r] > 1 ? t` (${S.starve[r]}-й день поспіль)` : ''));
    } else S.starve[r] = 0;
  }
  S.tired = pen * D.shortageTired;
  const healed = pen && D.noHealOnShortage ? S.hp : Math.min(maxHP(), S.hp + Math.round(maxHP() * D.sleepHealPct));
  if (pen && D.noHealOnShortage) msgs.push(t('😣 У нестачі сон не лікує.'));
  S.hp = healed - dmg;
  S.sily = maxSily(); S.eaten = 0;
  regenStock(); // запаси локацій потроху відновлюються
  rivalsMove();
  const job = craftTick(); if (job) msgs.push(job);
  const wear = rollWear(); if (wear) msgs.push(wear);
  S.stats.maxDay = Math.max(S.stats.maxDay || 0, S.day);
  const evLines = rollEvent(); // подія нового дня
  if (chance(BAL.flavor.systemMemoryChance)) { const m = line('system.memory'); if (m) evLines.push(`<div class="sys">${m}</div>`); }
  msgs.forEach(m => log(m)); log(t('☀️ Новий день.'));
  if (S.hp <= 0) { S.over = true; recordGame(S, true); }
  ui.showEvent({ e: '🌅', t: t('День ') + S.day, txt: (evLines.length ? evLines.join('<br>') + '<br><br>' : '') + (msgs.length ? msgs.join('<br>') : t('Ніч минула спокійно.')) + t`<br><br><span class="mut">Витрата за добу: ${Object.entries(consume).filter(([, v]) => v > 0).map(([r, v]) => `−${v}${RES[r][0]}`).join(' ')}. Виробництво бази вже враховано.</span>`, b: [[t('Далі'), null]] });
  ui.go(S.over ? 'over' : 'base');
}

export function eat() {
  const E = BAL.actions.eat;
  if (S.eaten >= E.max) return ui.toast(t('Більше не лізе'));
  if (!canPay(E.cost)) return ui.toast(t('Треба ') + resStr(E.cost));
  pay(E.cost);
  S.eaten++; S.sily = Math.min(maxSily() + E.capBonus, S.sily + E.sily); log(t`Поїв досхочу: +${E.sily}⚡`); ui.render();
}
export function heal() {
  if (S.res.med < 1) return;
  if (S.hp >= maxHP()) return ui.toast(t('Ти й так цілий'));
  const p = BAL.actions.med.healPct;
  S.res.med--; S.hp = Math.min(maxHP(), S.hp + Math.round(maxHP() * p)); log(t`💊 Аптечка: +${Math.round(p * 100)}% HP`); ui.render();
}
export function stim() {
  if (S.res.stim < 1) return;
  const n = BAL.actions.stim.sily;
  S.res.stim--; S.sily += n; log(t`☕ Стимулятор: +${n}⚡`); ui.render();
}
