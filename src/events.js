// Сезони і події дня (data/events.json).
import { EVENTS, ZONE, WPN, ARM } from './data.js';
import { pick, chance } from './util.js';
import { ui } from './hooks.js';
import { S, log, canPay, pay, resStr } from './state.js';
import { mkWeapon, mkArmor, itemName, itemEmoji } from './items.js';
import { itemHTML } from './ui/format.js';

export const season = (day = S.day) => EVENTS.seasons[Math.floor((day - 1) / EVENTS.seasonLength) % EVENTS.seasons.length];
export const event = () => (S.event && EVENTS.events.find(e => e.id === S.event)) || null;
export const evNum = (key, dflt) => event()?.[key] ?? dflt;

/** Дорога в один бік з урахуванням події дня. */
export const travelCost = z => ZONE[z].travel + evNum('travelAdd', 0);

/** Додаткова витрата/виробництво цього дня від сезону й події. */
export function dayModifiers() {
  const s = season(), e = event() || {}, consume = {}, prod = {};
  const add = (o, src, k = 1) => { for (const r in src || {}) o[r] = (o[r] || 0) + src[r] * k; };
  add(consume, s.consume); add(consume, e.consume);
  add(prod, e.prod);
  for (const [b, p] of Object.entries(s.prodIf || {})) if (S.bld[b]) add(prod, p);
  return { consume, prod };
}

/** Вранці: кидаємо подію нового дня. Повертає текст для ранкового вікна. */
export function rollEvent() {
  S.event = null; S.caravan = null;
  const s = season(), lines = [];
  if (S.day > 1 && (S.day - 1) % EVENTS.seasonLength === 0) lines.push(`${s.e} Настала пора: <b>${s.n}</b>. ${s.d}.`);
  if (chance(EVENTS.eventChance)) {
    const pool = EVENTS.events.filter(e => S.day >= (e.fromDay || 1) && (!e.seasons || e.seasons.includes(s.id)));
    const total = pool.reduce((a, e) => a + e.w, 0);
    let r = Math.random() * total, ev = pool[0];
    for (const e of pool) { if ((r -= e.w) < 0) { ev = e; break; } }
    S.event = ev.id;
    lines.push(`${ev.e} <b>${ev.n}</b>: ${ev.d}.`);
    log(`${ev.e} ${ev.n}`);
    if (ev.caravan) {
      const offers = [...EVENTS.caravanOffers].sort(() => Math.random() - 0.5).slice(0, ev.caravan);
      S.caravan = offers.map(o => ({ ...o, done: false }));
    }
  }
  return lines;
}

export function offerText(o) {
  const got = o.item ? `${o.item === 'w' ? 'зброя' : 'броня'} (${o.rar === 'u' ? 'незвичайна' : 'рідкісна'})` : resStr(o.get);
  return `${resStr(o.give)} → ${got}`;
}

export function caravanTrade(i) {
  const o = S.caravan?.[+i]; if (!o || o.done) return;
  if (!canPay(o.give)) return ui.toast('Не вистачає ресурсів');
  pay(o.give); o.done = true;
  if (o.item) {
    const it = o.item === 'w' ? mkWeapon(pick(Object.keys(WPN)), o.rar) : mkArmor(pick(Object.keys(ARM)), o.rar);
    S.inv.push(it); log('🐪 Караван: ' + itemName(it));
    ui.showEvent({ e: itemEmoji(it), t: 'Обмін із караваном', txt: itemHTML(it), b: [['Ок', null]] });
  } else {
    for (const k in o.get) S.res[k] += o.get[k];
    log('🐪 Караван: ' + offerText(o));
  }
  ui.render();
}
