// Симулятор балансу: боти з різними стратегіями грають N ігор по M днів на справжній логіці гри.
//
//   node tools/sim.js                         — усі стратегії, налаштування з tools/sim.config.json
//   node tools/sim.js --games 100 --days 30   — перевизначити кількість ігор/днів
//   node tools/sim.js --strategy greedy       — лише одна стратегія
//   node tools/sim.js --seed 7 --json out.json
//   node tools/sim.js --strategy cautious --trace   — по днях для першої гри кожної стратегії
//   node tools/sim.js --set combat.zoneScale.0.atk=1.5 --set day.shortageHp=4
//   node tools/sim.js --set bld.rain.prod.water=2 --set loc.gas.res.fuel=[1,3]
//                                             — спробувати інші числа (balance.json, bld/mon/rare/wpn/arm/loc), не змінюючи файли
//
// Код завершується з кодом 1, якщо якась ціль балансу не виконана.
import { readFileSync, writeFileSync } from 'node:fs';
import { S } from '../src/state.js';
import { setUI } from '../src/hooks.js';
import { BLD, LOCS, ZONE, WPN, MON, RARE, ARM, BAL, bldCost } from '../src/data.js';
import { newGame, sleep, eat, heal, stim } from '../src/day.js';
import { build, craft, dismantle, toggleEq } from '../src/base.js';
import { goTo, search, goHome, scout } from '../src/map.js';
import { playCard, blockAct, superAct, flee, endTurn } from '../src/combat.js';
import { item, maxHP, pDef, baseAP, canPay } from '../src/state.js';
import { bagCount } from '../src/trip.js';

/* ---------- параметри ---------- */
const CFG = JSON.parse(readFileSync(new URL('./sim.config.json', import.meta.url), 'utf-8'));
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const GAMES = +arg('games', CFG.games), DAYS = +arg('days', CFG.days), SEED = +arg('seed', CFG.seed);
const ONLY = arg('strategy', null), JSON_OUT = arg('json', null), TRACE = argv.includes('--trace');
const STRATS = Object.entries(CFG.strategies).filter(([k]) => !ONLY || k === ONLY);

// --set шлях=значення: міняє BAL у пам'яті (JSON-модулі — спільні об'єкти, тож гра бачить зміну)
argv.forEach((a, i) => {
  if (a !== '--set') return;
  const [path, raw] = argv[i + 1].split('='), ROOTS = { bld: BLD, mon: MON, rare: RARE, wpn: WPN, arm: ARM };
  let keys = path.split('.'), o = BAL;
  if (ROOTS[keys[0]]) { o = ROOTS[keys[0]]; keys = keys.slice(1); } // bld.rain.prod.water=2 → buildings.json
  if (keys[0] === 'loc') { o = LOCS.find(l => l.id === keys[1]); keys = keys.slice(2); } // loc.gas.res.fuel=[1,3]
  for (const k of keys.slice(0, -1)) o = o[k];
  if (!(keys.at(-1) in o) && keys.at(-1) !== 'prod') throw new Error('Немає такого ключа: ' + path);
  o[keys.at(-1)] = JSON.parse(raw);
  console.log(`  set ${path} = ${raw}`);
});

// Відтворюваний рандом: уся гра користується Math.random
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
Math.random = mulberry32(SEED);

const LIFE = ['water', 'food', 'heat', 'wood'];               // те, що йде на виживання (дерево горить у пічці)
const CONSUME = Object.values(BAL.day.consume).reduce((a, b) => a + b, 0) + BAL.day.nightHeat;
const zoneMinLvl = CFG.zoneForLevel;
const zoneOfLevel = lvl => zoneMinLvl.reduce((z, m, i) => (lvl >= m ? i : z), 0);

/* ---------- міст UI ---------- */
let pending = null;
setUI({ render() {}, go(s) { S.screen = s; }, showEvent(ev) { pending = ev; }, toast() {}, shake() {} });

/* ---------- статистика ---------- */
function newStats() {
  return {
    deathDays: [],               // день смерті (або DAYS+1, якщо вижив)
    shortage: { water: [], food: [], heat: [] }, // [день] = кількість ігор з нестачею
    alive: [],                   // [день] = скільки ігор ще живі на початку дня
    lvlAt: {},                   // день → сума рівнів
    fights: [],                  // {z, lvl, res: 'win'|'lose'|'flee', rare}
    trips: [],                   // {day, z, life, all, sily, lost}
    rareSeen: 0, searches: 0, builds: {},
    deathCause: { water: 0, food: 0, heat: 0 }, deathBld: [],  // чого бракувало в день смерті; скільки рівнів будівель мав
  };
}
const inc = (arr, i, v = 1) => { arr[i] = (arr[i] || 0) + v; };

/* ---------- бот ---------- */
function makeBot(st, stats) {
  // Вибір кнопки в модалці
  function choose(ev) {
    const L = ev.b.map(b => b[0]);
    const find = p => L.findIndex(l => l.startsWith(p));
    // (за підписами кнопок, а не емодзі: 🔪 — це ще й ніж у схованці)
    if (find('Піти') >= 0) { const i = find('Продати'); if (i >= 0) return i; const j = find('Обміняти'); return j >= 0 ? j : 0; }
    if (find('Битися') >= 0) {
      const pay = find('Віддати'), fight = find('Битися');
      if (st.payToll && pay >= 0 && S.hp < maxHP() * 0.8) return pay;
      return fight;
    }
    return 0;
  }
  function resolve() {
    let n = 0;
    while (pending && n++ < 20) {
      const ev = pending; pending = null;
      const f = ev.b[choose(ev)][1];
      if (f) f();
      if (S.fight) fight();
    }
  }

  // Найкраща зброя/броня: топ-3 за шкодою на ОД, броня за def + hp/3
  function manageGear() {
    const score = w => w.dmg / w.ap + w.dmg * 0.15;
    const ws = S.inv.filter(i => i.k === 'w').sort((a, b) => score(b) - score(a));
    const want = ws.slice(0, BAL.player.maxWeapons).map(w => w.id);
    for (const id of want) if (!S.eq.includes(id)) { if (S.eq.length >= BAL.player.maxWeapons) toggleEq(S.eq.find(x => !want.includes(x))); toggleEq(id); }
    const as = S.inv.filter(i => i.k === 'a').sort((a, b) => (b.def + b.hp / 3) - (a.def + a.hp / 3));
    if (as[0] && S.armor !== as[0].id) toggleEq(as[0].id);
    // Зайве розбираємо на деталі
    for (const it of [...S.inv]) if (!S.eq.includes(it.id) && S.armor !== it.id) dismantle(it.id);
  }

  // Бій: перебір підмножин руки на максимум шкоди, решта ОД — у блок
  function fight() {
    const z = LOCS.find(l => l.id === S.trip?.loc)?.z ?? 0;
    const rec = { z, lvl: S.lvl, rare: !!S.fight.en.rare, res: 'flee' };
    if (rec.rare) stats.rareSeen++;
    const kills = S.kills;
    let guard = 0;
    while (S.fight && guard++ < 300) {
      const F = S.fight, en = F.en;
      if (S.sup >= BAL.combat.super.max) { superAct(); continue; }
      const incoming = en.intent.t === 'flee' ? 0 : Math.max(0, (en.intent.v || 0) - pDef());
      if (!en.rare && st.fleeHp && S.hp - incoming < maxHP() * st.fleeHp && en.hp > 8) { flee(); continue; }
      const hand = F.hand.map(id => item(id));
      let best = { d: -1, set: [] };
      for (let m = 0; m < 1 << hand.length; m++) {
        let ap = 0, d = 0; const set = [];
        hand.forEach((w, i) => { if (m >> i & 1) { ap += w.ap; d += WPN[w.type].trait === 'pierce' ? w.dmg : Math.max(1, w.dmg - en.def - (en.guard ? BAL.combat.guardDef : 0)); set.push(w.id); } });
        if (ap <= F.ap && d > best.d) best = { d, set };
      }
      for (const id of best.set) { if (!S.fight) break; const i = S.fight.hand.indexOf(id); if (i >= 0) playCard(i); }
      if (!S.fight) break;
      while (S.fight.ap >= BAL.combat.block.cost && incoming > 0) blockAct();
      endTurn();
      resolve();
    }
    rec.res = S.kills > kills ? 'win' : (!S.trip ? 'lose' : 'flee');
    stats.fights.push(rec);
  }

  // Що зараз найпотрібніше (для вибору локації)
  function need(r) {
    const target = { water: 8, food: 8, heat: 8, wood: 10 + Math.max(0, 8 - S.res.heat), metal: 8, parts: 8, fuel: S.bld.gen ? 6 : 2, med: 3 }[r] ?? 2;
    return Math.max(0.2, (target - S.res[r]) / target + 0.3);
  }

  function pickLocation() {
    const open = LOCS.filter(l => S.open.includes(l.id));
    let z = st.zone === 'near' ? 0 : st.zone === 'far' ? Math.max(...open.map(l => l.z)) : zoneOfLevel(S.lvl);
    // обережний не лізе в небезпечнішу зону пораненим
    if (st.zone === 'level' && z > 0 && S.hp < maxHP() * (st.riskyHp ?? 0)) z--;
    let cands = [];
    for (; z >= 0 && !cands.length; z--) cands = open.filter(l => l.z === z && S.sily >= ZONE[l.z].travel + 2);
    if (!cands.length) return null;
    const val = L => Object.entries(L.res).reduce((a, [r, [lo, hi]]) => a + need(r) * (lo + hi) / 2, 0) * (S.depleted[L.id] ? 0.5 : 1);
    return cands.sort((a, b) => val(b) - val(a))[0];
  }

  function trip() {
    const L = pickLocation(); if (!L) return;
    const sily0 = S.sily;
    goTo(L.id); if (!S.trip) return;
    let n = 0;
    while (S.trip && S.sily >= BAL.actions.searchSily && n++ < 40) {
      if (S.hp < maxHP() * st.retreatHp) { if (S.res.med && S.hp < maxHP() * 0.4) heal(); else break; }
      if (bagCount() >= BAL.trip.bagCap) break;
      stats.searches++;
      search(); resolve();
      if (S.fight) fight();
      resolve();
    }
    const rec = { day: S.day, z: L.z, sily: sily0 - S.sily, life: 0, all: 0, lost: !S.trip };
    if (S.trip) {
      for (const [k, v] of Object.entries(S.trip.bag)) { rec.all += v; if (LIFE.includes(k)) rec.life += v; }
      goHome();
    }
    stats.trips.push(rec);
    resolve();
  }

  // Будує в порядку пріоритету, поки вистачає ресурсів і лишається сил на вилазку
  const ORDER = ['rain', 'garden', 'solar', 'bed', 'garden', 'rain', 'wall', 'solar', 'shop', 'gen', 'bed', 'wall', 'garden', 'rain', 'solar', 'wall', 'gen', 'shop'];
  const canBuild = k => {
    const B = BLD[k]; if (S.bld[k] >= B.max) return false;
    const c = bldCost(k, S.bld[k]);
    if (!canPay(c)) return false;
    // не проїдати їжу/воду на будівництво, якщо їх мало
    if ((c.water && S.res.water - c.water < 4) || (c.food && S.res.food - c.food < 4)) return false;
    // дрова — це тепло на ніч: не будуємо з них, якщо в пічці порожньо
    if (c.wood && S.res.wood - c.wood + S.res.heat < 6) return false;
    return true;
  };
  function buildStep(homeDay = false) {
    if (!st.build) return;
    const reserve = homeDay ? 0 : ZONE[0].travel + 3;
    for (const k of ORDER) {
      if (!canBuild(k)) continue;
      if (S.sily - BAL.actions.buildSily < reserve && S.day > 1) break;
      const before = S.bld[k]; build(k);
      if (S.bld[k] > before) stats.builds[k] = (stats.builds[k] || 0) + 1;
    }
    if (S.bld.shop && S.sily > reserve + 2) {
      if (canPay(BAL.craft.weapon) && S.res.metal > 6) craft('w');
      else if (canPay(BAL.craft.armor) && S.res.metal > 6) craft('a');
      resolve();
    }
  }

  function day() {
    resolve();
    manageGear();
    // Багато чого можна збудувати — день удома на будівництві
    buildStep(st.build && new Set(ORDER.filter(canBuild)).size >= 2);
    if (S.res.food >= st.eatSurplus && S.res.water >= st.eatSurplus) eat();
    if (S.hp < maxHP() * 0.6 && S.res.med) heal();
    if (S.res.stim && S.sily < 6) stim();
    const hidden = LOCS.some(l => !S.open.includes(l.id));
    if (hidden && S.sily >= BAL.actions.scoutSily + ZONE[0].travel + 2 && (S.day % 3 === 0 || S.lvl >= 4)) { scout(); resolve(); }
    trip();
    manageGear();
    buildStep();
  }
  return { day, resolve };
}

/* ---------- прогін ---------- */
function runStrategy(name, st) {
  const stats = newStats();
  for (let g = 0; g < GAMES; g++) {
    pending = null; newGame();
    const bot = makeBot(st, stats);
    let died = false;
    while (S.day <= DAYS) {
      inc(stats.alive, S.day);
      inc(stats.lvlAt, S.day, S.lvl);
      bot.day();
      if (TRACE && g === 0) console.log(`  [${name}] д${S.day} рів${S.lvl} ❤️${S.hp}/${maxHP()} ⚡${S.sily} ` + Object.entries(S.res).map(([k, v]) => k[0] + k[1] + v).join(' ') + ' | ' + Object.entries(S.bld).filter(([, v]) => v).map(([k, v]) => k + v).join(' '));
      const dayNo = S.day;
      sleep();
      const txt = pending?.txt || '';
      if (txt.includes('Спрага')) inc(stats.shortage.water, dayNo);
      if (txt.includes('Голод')) inc(stats.shortage.food, dayNo);
      if (txt.includes('Холод')) inc(stats.shortage.heat, dayNo);
      bot.resolve();
      if (S.over) {
        died = true;
        for (const r in stats.deathCause) if (S.starve[r]) stats.deathCause[r]++;
        stats.deathBld.push(Object.values(S.bld).reduce((a, b) => a + b, 0));
        break;
      }
    }
    stats.deathDays.push(died ? S.day : DAYS + 1);
  }
  return stats;
}

/* ---------- звіт ---------- */
const median = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN;
const pct = x => isNaN(x) ? '—' : Math.round(x * 100) + '%';
const f1 = x => isNaN(x) ? '—' : x.toFixed(1);
const pad = (s, n) => String(s).padEnd(n);
const padL = (s, n) => String(s).padStart(n);
function table(head, rows) {
  const w = head.map((h, i) => Math.max(String(h).length, ...rows.map(r => String(r[i]).length)) + 1);
  const line = r => r.map((c, i) => (i ? padL(c, w[i]) : pad(c, w[i]))).join(' ');
  return [line(head), w.map(x => '─'.repeat(x)).join(' '), ...rows.map(line)].join('\n');
}

function winrate(fights) {
  const w = fights.filter(f => f.res === 'win').length;
  return fights.length ? w / fights.length : NaN;
}
const atLevel = f => zoneOfLevel(f.lvl) === f.z;

// День, з якого вилазка в близьку зону приносить менше, ніж у середню (з урахуванням втраченого рюкзака)
function payoffEnd(trips) {
  const series = z => {
    const byDay = [];
    for (const t of trips) if (t.z === z) (byDay[t.day] ||= []).push(t.lost ? 0 : t.all);
    const s = [];
    for (let d = 1; d <= DAYS; d++) s[d] = byDay[d]?.length >= 5 ? avg(byDay[d]) : NaN;
    return s;
  };
  const near = series(0), mid = series(1);
  const roll = (s, d) => avg([s[d - 1], s[d], s[d + 1]].filter(x => x !== undefined && !isNaN(x)));
  for (let d = 2; d <= DAYS - 1; d++) {
    const restN = avg(near.slice(d).filter(x => !isNaN(x))), restM = avg(mid.slice(d).filter(x => !isNaN(x)));
    if (roll(near, d) < roll(mid, d) && restN < restM) return { day: d };
  }
  return { day: NaN };
}

const results = {};
console.log(`\nСимулятор «Попіл і Туман»: ${GAMES} ігор × ${DAYS} днів, seed ${SEED}. Добова витрата ${CONSUME} од.\n`);
for (const [name, st] of STRATS) results[name] = runStrategy(name, st);

// 1. Виживання
console.log('■ Виживання');
console.log(table(['Стратегія', 'Медіана дня смерті', 'Середній', `Дожили до ${DAYS}`, 'Рів. д5', 'Рів. д10', 'Рів. д20', 'Рів. д30'],
  STRATS.map(([n]) => {
    const R = results[n], lv = d => f1(R.lvlAt[d] / R.alive[d]);
    const med = median(R.deathDays);
    return [n, med > DAYS ? `>${DAYS}` : med, f1(avg(R.deathDays)), pct(R.deathDays.filter(d => d > DAYS).length / GAMES), lv(5), lv(10), lv(20), lv(30)];
  })));

// 1б. Причини смерті
console.log('\n■ Чого бракувало в день смерті (частка смертей) і скільки рівнів будівель було');
console.log(table(['Стратегія', 'Смертей', '💧', '🍖', '🔥', 'Будівель'], STRATS.map(([n]) => {
  const R = results[n], d = R.deathBld.length;
  return [n, d, ...['water', 'food', 'heat'].map(k => d ? pct(R.deathCause[k] / d) : '—'), f1(avg(R.deathBld))];
})));

// 2. Дефіцит ресурсів
console.log('\n■ Частка живих ігор з нестачею ресурсу (вода / їжа / тепло)');
const dayCols = [3, 5, 7, 10, 15, 20, 30, 40].filter(d => d <= DAYS);
console.log(table(['Стратегія', ...dayCols.map(d => 'д' + d)], STRATS.map(([n]) => {
  const R = results[n];
  return [n, ...dayCols.map(d => R.alive[d] ? ['water', 'food', 'heat'].map(k => Math.round((R.shortage[k][d] || 0) / R.alive[d] * 100)).join('/') : '—')];
})));

// 3. Бої
const allFights = Object.values(results).flatMap(r => r.fights);
console.log('\n■ Вінрейт боїв за зонами (усі стратегії)');
console.log(table(['Зона', 'Боїв', 'Вінрейт', 'На своєму рівні', 'Боїв на рівні', 'Втеч', 'Поразок'], ZONE.map((Z, z) => {
  const fz = allFights.filter(f => f.z === z && !f.rare), fl = fz.filter(atLevel);
  return [Z.n, fz.length, pct(winrate(fz)), pct(winrate(fl)), fl.length, pct(fz.filter(f => f.res === 'flee').length / fz.length), pct(fz.filter(f => f.res === 'lose').length / fz.length)];
})));
console.log(`  «На своєму рівні»: зона ${zoneMinLvl.map((m, i) => `${i} — рів. ${m}${zoneMinLvl[i + 1] ? '–' + (zoneMinLvl[i + 1] - 1) : '+'}`).join(', ')}`);

// 4. Рідкісні
const totalSearch = Object.values(results).reduce((a, r) => a + r.searches, 0);
const totalRare = Object.values(results).reduce((a, r) => a + r.rareSeen, 0);
const rareFights = allFights.filter(f => f.rare);
console.log(`\n■ Рідкісні монстри: ${pct(totalRare / totalSearch)} обшуків · ${f1(totalRare / (GAMES * STRATS.length))} за гру · вбито ${pct(winrate(rareFights))}`);

// 5. Окупність зон
const allTrips = Object.values(results).flatMap(r => r.trips);
const buckets = [[1, 3], [4, 6], [7, 9], [10, 12], [13, 15], [16, 20], [21, 30], [31, 40]].filter(([a]) => a <= DAYS);
const yieldTable = key => table(['Зона', ...buckets.map(([a, b]) => `д${a}-${b}`)], ZONE.map((Z, z) => [Z.n, ...buckets.map(([a, b]) => {
  const t = allTrips.filter(x => x.z === z && x.day >= a && x.day <= b);
  return t.length >= 5 ? f1(avg(t.map(x => x.lost ? 0 : x[key]))) : '—';
})]));
console.log('\n■ Середній лут за вилазку, усі ресурси (втрачений рюкзак = 0)');
console.log(yieldTable('all'));
console.log(`\n■ З нього на виживання (💧🍖🔥🪵); добова витрата — ${CONSUME}`);
console.log(yieldTable('life'));
const pay = payoffEnd(allTrips);

// 6. Цілі
const G = CFG.goals, checks = [];
const inRange = (x, [a, b]) => x >= a && x <= b;
if (results.nobuild) { const m = median(results.nobuild.deathDays); checks.push([`Без будівель гине на день ${G.noBuildDeathDay.join('–')}`, m > DAYS ? `>${DAYS}` : m, inRange(m, G.noBuildDeathDay)]); }
if (results[G.smartStrategy]) { const m = median(results[G.smartStrategy].deathDays); checks.push([`«${G.smartStrategy}» живе ${G.smartMedianDay}+ днів (медіана)`, m > DAYS ? `>${DAYS}` : m, m >= G.smartMedianDay]); }
checks.push([`Близька зона стає гіршою за середню на день ${G.nearPayoffEndDay.join('–')}`, isNaN(pay.day) ? 'ніколи' : pay.day, inRange(pay.day, G.nearPayoffEndDay)]);
ZONE.forEach((Z, z) => {
  const wr = winrate(allFights.filter(f => f.z === z && !f.rare && atLevel(f)));
  checks.push([`Вінрейт ${Z.n.toLowerCase()} зони на своєму рівні ${G.winrate[z].map(pct).join('–')}`, pct(wr), inRange(wr, G.winrate[z])]);
});
console.log('\n■ Цілі балансу');
console.log(table(['Ціль', 'Факт', ''], checks.map(([a, b, ok]) => [a, b, ok ? '✅' : '❌'])));
const failed = checks.filter(c => !c[2]).length;
console.log(failed ? `\n${failed} з ${checks.length} цілей не виконано.\n` : '\nУсі цілі виконано.\n');

if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify({ games: GAMES, days: DAYS, seed: SEED, checks, results }, null, 1));
process.exitCode = failed ? 1 : 0;
