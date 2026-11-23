// Господарство бази: енергія й тепло, теплиця, знос будівель, крафт у днях, тварини.
// Числа — у data/buildings.json, data/pets.json і balance.json (energy, wear, pets, craft.days).
import { BLD, BAL, PETS, bldCost, RES } from './data.js';
import { rnd, pick, chance } from './util.js';
import { ui } from './hooks.js';
import { S, log, bl, canPay, pay, resStr, useSily, maxHP } from './state.js';
import { season } from './events.js';
import { mkWeapon, mkArmor, itemName, itemEmoji } from './items.js';
import { itemHTML } from './ui/format.js';
import { t } from './i18n.js';

/* ---------- тепло і вартість ---------- */
export const heatMult = () => season().heatMult || 1;

/** Вартість наступного рівня зараз: тепло в ній множиться на сезон (взимку ×2). */
export function bldCostNow(k, l = S.bld[k]) {
  const c = bldCost(k, l);
  if (c.heat && BAL.energy.costHeatSeasonMult) c.heat = Math.ceil(c.heat * heatMult());
  return c;
}

/** Чого бракує для побудови (вимоги інших будівель). */
export function missingNeeds(k) {
  const n = BLD[k].needs || {};
  return Object.entries(n).filter(([b, lv]) => S.bld[b] < lv).map(([b, lv]) => t`${BLD[b].e} ${BLD[b].n} рів. ${lv}`);
}

export const bldName = (k, l = S.bld[k]) => (BLD[k].names && l > 0 ? BLD[k].names[l - 1] : BLD[k].n);

/* ---------- ранок: енергія → тепло → теплиця ---------- */
/** Виробництво бази зранку. Пише в msgs короткі рядки про збої. */
export function morningPower(msgs) {
  const cap = BAL.energy.cap, out = { energy: 0, heat: 0 };
  // Генератор: палить паливо (рів. 3 — пів одиниці, накопичуємо дріб)
  const g = bl('gen');
  if (g) {
    const G = BLD.gen; S.fuelAcc = (S.fuelAcc || 0) + G.fuel[g - 1];
    const need = Math.floor(S.fuelAcc + 1e-9);
    if (S.res.fuel >= need) { S.res.fuel -= need; S.fuelAcc -= need; out.energy += G.energy[g - 1]; }
    else { S.fuelAcc = 0; msgs.push(t('🔌 Генератор стоїть: немає ⛽ палива.')); }
  }
  const sp = bl('solar');
  if (sp) out.energy += Math.round(BLD.solar.energy[sp - 1] * (season().solarMult || 1));
  S.res.energy = Math.min(cap, S.res.energy + out.energy);
  // Обігрівач: енергія → тепло
  const h = bl('heater');
  if (h) {
    const use = BLD.heater.use[h - 1];
    if (S.res.energy >= use) { S.res.energy -= use; S.res.heat += BLD.heater.heat[h - 1]; out.heat += BLD.heater.heat[h - 1]; }
    else msgs.push(t`♨️ Обігрівачу бракує енергії (треба 🔋${use}).`);
  }
  // Город / теплиця
  const gl = bl('garden');
  if (gl) {
    const G = BLD.garden, U = G.upkeep;
    let lv = gl;
    if (gl >= U.fromLvl) {
      const up = {}; for (const r in U.perLvl) up[r] = U.perLvl[r] * (gl - U.fromLvl + 1);
      if (canPay(up)) pay(up); else { lv = U.fromLvl - 1; msgs.push(t`🥬 Теплиці бракує ${resStr(up)} — родить лише як грядки.`); }
    }
    for (const r in G.prod) S.res[r] += G.prod[r] * lv;
  }
  return out;
}

/* ---------- знос ---------- */
export const repairCost = k => {
  const c = bldCost(k, 0), o = {};
  for (const r in c) { const v = Math.ceil(c[r] * BAL.wear.repairMult); if (v) o[r] = v; }
  return o;
};

/** Вночі щось може зламатися. Повертає рядок для ранку або null. */
export function rollWear() {
  const W = BAL.wear; if (S.day < W.fromDay) return null;
  S.broken ||= {};
  const built = Object.keys(BLD).filter(k => S.bld[k] > 0 && !S.broken[k]);
  const lines = [];
  for (const k of built.sort(() => Math.random() - 0.5)) {
    if (lines.length >= W.maxPerNight) break;
    if (chance(W.chance)) { S.broken[k] = true; ui.sfx('break'); lines.push(t`🛠️ Зламалось: ${BLD[k].e} ${bldName(k)}. Поки не полагодиш — не працює.`); }
  }
  return lines.join('<br>') || null;
}

export function repair(k) {
  if (!S.broken?.[k]) return;
  const c = repairCost(k);
  if (!canPay(c)) return ui.toast(t('Не вистачає ресурсів'));
  if (!useSily(BAL.wear.repairSily)) return;
  pay(c); delete S.broken[k]; ui.sfx('build'); log(t`🛠️ Полагодив: ${BLD[k].e} ${bldName(k)}`); ui.render();
}

/* ---------- крафт у днях ---------- */
export function craftDays(rar) { return BAL.craft.days[rar] ?? 0; }

/** Запускає виріб: рідкісність кидаємо одразу, звичайне готове відразу, решта — за кілька днів. */
export function startCraft(kind, rar, type) {
  const days = craftDays(rar);
  const job = { kind, rar, type, left: days };
  if (!days) return finishCraft(job);
  S.job = job;
  log(t`🔧 Майстерня взялася за ${kind === 'w' ? t('зброю') : t('броню')} — готово через ${days} дн.`);
  ui.showEvent({ e: '🔧', t: t('Робота почалась'), txt: t`Складна річ: буде готова через <b>${days}</b> дн. (рідкісність: ${BAL.rarity[rar].n.toLowerCase()}).<br><span class="mut">Поки майстерня зайнята, нового не почати.</span>`, b: [[t('Ок'), null]] });
  ui.render();
}

function finishCraft(job) {
  ui.sfx('craft');
  const it = job.kind === 'w' ? mkWeapon(job.type, job.rar) : mkArmor(job.type, job.rar);
  S.inv.push(it); S.job = null; log(t('🔧 Скрафчено: ') + itemName(it));
  (S.stats ||= {}).crafted = (S.stats.crafted || 0) + 1;
  ui.showEvent({ e: itemEmoji(it), t: t('Скрафчено!'), txt: itemHTML(it), b: [[t('Ок'), null]] }); ui.render();
  return it;
}

/** Вранці: робота в майстерні просувається (якщо майстерня ціла). */
export function craftTick() {
  if (!S.job) return null;
  if (!bl('shop')) return t('🔧 Майстерня зламана — робота стоїть.');
  if (--S.job.left > 0) return null;
  const it = job2item(S.job); S.job = null;
  return t`🔧 Майстерня закінчила: ${itemEmoji(it)} ${itemName(it)}!`;
}
function job2item(job) {
  const it = job.kind === 'w' ? mkWeapon(job.type, job.rar) : mkArmor(job.type, job.rar);
  S.inv.push(it); log(t('🔧 Скрафчено: ') + itemName(it)); (S.stats ||= {}).crafted = (S.stats.crafted || 0) + 1;
  return it;
}

/* ---------- тварини ---------- */
const PB = () => BAL.pets;
export const isAdult = p => p.age >= PB().growDays;
export const petName = p => (isAdult(p) ? PETS[p.type].n : PETS[p.type].baby);
export const petMaxHp = p => PETS[p.type].hp;
/** Дієслово в роді тварини: маля — середній рід, доросла — за полем g. */
export const pv = (p, m, f, n) => (!isAdult(p) ? n : PETS[p.type].g === 'f' ? f : m);
/** Тварина, що ходить з тобою: доросла, здорова, не лишена вдома. */
export const companion = () => (S.pets || []).find(p => p.id === S.petOut && isAdult(p) && !p.hurt) || null;
/** Сумарний ефект дорослих тварин за ключем perk (companionOnly — лише та, що з тобою). */
export function petPerk(key, companionOnly = false) {
  const list = companionOnly ? [companion()].filter(Boolean) : (S.pets || []).filter(isAdult);
  return list.map(p => PETS[p.type].perk?.[key]).filter(v => v !== undefined);
}

/** Щоденна витрата на тварин. */
export function petConsume() {
  const o = {};
  for (const p of S.pets || []) {
    const c = isAdult(p) ? { ...PB().consume } : { ...PB().babyConsume };
    if (isAdult(p)) for (const [r, v] of Object.entries(PETS[p.type].perk?.consume || {})) c[r] = (c[r] || 0) + v;
    if (heatMult() > 1) for (const [r, v] of Object.entries(PB().coldConsume || {})) c[r] = (c[r] || 0) + v; // восени й узимку тваринам теж холодно
    for (const r in c) o[r] = (o[r] || 0) + c[r];
  }
  return o;
}

/** Ранок для тварин: ростуть, лікуються, приносять. */
export function petsMorning(msgs) {
  for (const p of S.pets || []) {
    const wasBaby = !isAdult(p); p.age++;
    if (wasBaby && isAdult(p)) msgs.push(t`${PETS[p.type].e} ${PETS[p.type].baby} підросло — тепер це ${PETS[p.type].n.toLowerCase()}! ${PETS[p.type].d}.`);
    if (p.hp < petMaxHp(p)) {
      p.hp = Math.min(petMaxHp(p), p.hp + Math.ceil(petMaxHp(p) * PB().healPctPerDay));
      if (p.hurt && p.hp >= petMaxHp(p)) { p.hurt = false; msgs.push(t`${PETS[p.type].e} ${petName(p)} ${pv(p, t('одужав і знову готовий'), t('одужала і знову готова'), t('одужало і знову готове'))} йти з тобою.`); }
    }
    if (!isAdult(p)) continue;
    const pk = PETS[p.type].perk || {};
    if (pk.nightParts && chance(pk.nightParts.chance)) { const n = rnd(...pk.nightParts.amount); S.res.parts += n; msgs.push(t`${PETS[p.type].e} ${petName(p)} ${pv(p, t('приніс'), t('принесла'), t('принесло'))} вночі ⚙️${n}.`); }
    for (const [r, v] of Object.entries(pk.prod || {})) S.res[r] += v;
  }
}

/** Під час обшуку: знайшли тваринку. */
export function petFound() {
  const type = pick(Object.keys(PETS)), P = PETS[type], full = (S.pets || []).length >= PB().max;
  const c = PB().babyConsume;
  const txt = t`${P.found}<br><br><b>${P.e} ${P.baby}</b> → виросте в: <b>${P.n}</b>. ${P.d}.<br><span class="mut">Маля їсть щодня ${resStr(c)}, доросла — ${resStr(PB().consume)} (восени й узимку ще ${resStr(PB().coldConsume)}). Виросте за ${PB().growDays} дн. Доросла ходить з тобою, бʼється і бере на себе частину ударів.</span>`
    + (full ? t`<br><br>Але вдома вже ${PB().max} тварини — більше не прогодуєш.` : '');
  const take = () => {
    S.pets ||= []; const p = { id: Date.now() + Math.random(), type, age: 0, hp: P.hp, hurt: false };
    S.pets.push(p); if (!S.petOut) S.petOut = p.id;
    (S.stats ||= {}).pets = (S.stats.pets || 0) + 1;
    log(t`${P.e} Забрав додому: ${P.baby}`);
  };
  ui.sfx('pet');
  ui.showEvent({ e: P.e, art: ['pet_' + type + '_baby', 'pet_' + type], t: t('Хтось маленький'), txt, b: full ? [[t('Лишити'), null]] : [[t('Забрати'), take], [t('Лишити'), null]] });
}

export function petFollow(id) {
  const p = (S.pets || []).find(x => String(x.id) === String(id)); if (!p) return;
  S.petOut = S.petOut === p.id ? null : p.id; ui.render();
}
export function petRelease(id) {
  const p = (S.pets || []).find(x => String(x.id) === String(id)); if (!p) return;
  S.pets = S.pets.filter(x => x !== p); if (S.petOut === p.id) S.petOut = null;
  log(t`${PETS[p.type].e} Відпустив: ${petName(p)}`); ui.render();
}

/* ---------- бій ---------- */
/** Атака тварини наприкінці твого ходу: шкода або null. */
export function petAttackDmg() {
  const p = companion(); if (!p) return null;
  return PETS[p.type].atk + Math.floor(S.lvl / 2);
}
/** Ділить удар між тобою і твариною. Повертає частину, що лишилась тобі. */
export function petTakeShare(raw, flog) {
  const p = companion(); if (!p || raw <= 0) return raw;
  const part = Math.round(raw * PB().dmgShare); if (!part) return raw;
  p.hp -= part;
  if (p.hp <= 0) { p.hp = 0; p.hurt = true; const w = pv(p, t('поранений'), t('поранена'), t('поранене')); flog.unshift(t`${PETS[p.type].e} ${petName(p)} ${w} і ховається. Лікуватиметься вдома кілька днів.`); log(t`${PETS[p.type].e} ${petName(p)} ${w} в бою`); }
  else flog.unshift(t`${PETS[p.type].e} ${petName(p)} ${pv(p, t('прийняв'), t('прийняла'), t('прийняло'))} на себе ${part}`);
  return raw - part;
}

/* ---------- прогноз на добу (для довідки по ресурсах) ---------- */
/** Скільки зараз приблизно приходить і йде за добу: { in: {res: n}, out: {res: n} }. */
export function forecast(consume, mods) {
  const inc = {}, out = {}, add = (o, r, v) => { if (v) o[r] = (o[r] || 0) + v; };
  for (const k in BLD) { const p = BLD[k].prod; if (p && k !== 'garden') for (const r in p) add(inc, r, p[r] * bl(k)); }
  for (const r in mods?.prod || {}) add(inc, r, mods.prod[r]);
  const g = bl('gen'); if (g) { add(inc, 'energy', BLD.gen.energy[g - 1]); add(out, 'fuel', BLD.gen.fuel[g - 1]); }
  const sp = bl('solar'); if (sp) add(inc, 'energy', Math.round(BLD.solar.energy[sp - 1] * (season().solarMult || 1)));
  const h = bl('heater'); if (h) { add(out, 'energy', BLD.heater.use[h - 1]); add(inc, 'heat', BLD.heater.heat[h - 1]); }
  const gl = bl('garden');
  if (gl) {
    const U = BLD.garden.upkeep; add(inc, 'food', BLD.garden.prod.food * gl);
    if (gl >= U.fromLvl) for (const r in U.perLvl) add(out, r, U.perLvl[r] * (gl - U.fromLvl + 1));
  }
  for (const p of (S.pets || []).filter(isAdult)) for (const [r, v] of Object.entries(PETS[p.type].perk?.prod || {})) add(inc, r, v);
  for (const r in consume) add(out, r, consume[r]);
  return { in: inc, out };
}
