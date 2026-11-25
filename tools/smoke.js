// Димовий тест логіки без браузера: бот грає кілька ігор по N днів випадковими діями.
// Запуск: npm run smoke  (або node tools/smoke.js [ігор] [днів])
import { S } from '../src/state.js';
import { setUI } from '../src/hooks.js';
import { BLD, LOCS, ZONE, BAL } from '../src/data.js';
import { newGame, sleep, eat, heal } from '../src/day.js';
import { build } from '../src/base.js';
import { goTo, search, goHome, scout } from '../src/map.js';
import { toggleCard, blockMore, superAct, endTurn, apLeft, planInfo } from '../src/combat.js';
import { migrate, SAVE_VERSION } from '../src/save.js';

const GAMES = +process.argv[2] || 50, DAYS = +process.argv[3] || 12;
let pending = null; // остання модалка
setUI({ render() {}, go(s) { S.screen = s; }, showEvent(ev) { pending = ev; }, toast() {}, shake() {} });

// Бот завжди тисне випадкову кнопку модалки (як гравець).
function resolveEvent() {
  let guard = 0;
  while (pending && guard++ < 20) {
    const ev = pending; pending = null;
    const f = ev.b[Math.floor(Math.random() * ev.b.length)][1];
    if (f) f();
  }
}

function fight() {
  let turns = 0;
  while (S.fight && turns++ < 200) {
    if (S.sup >= BAL.combat.super.max) superAct();
    // Випадковий порядок вибору карт, поки вистачає ОД; решта — у блок
    for (const i of S.fight.hand.map((_, i) => i).sort(() => Math.random() - 0.5)) {
      const w = S.inv.find(x => x.id === S.fight.hand[i]);
      if (w && w.ap <= apLeft()) toggleCard(i);
    }
    planInfo();
    while (apLeft() >= 1) blockMore();
    endTurn();
    resolveEvent();
  }
  if (S.fight) throw new Error('Бій не закінчився за 200 ходів');
}

const stats = { days: [], deaths: 0, kills: 0, lvls: [] };
for (let g = 0; g < GAMES; g++) {
  newGame();
  while (!S.over && S.day <= DAYS) {
    resolveEvent();
    for (const k of Object.keys(BLD)) build(k);
    eat(); if (S.hp < 20) heal();
    if (Math.random() < 0.3) scout();
    resolveEvent();
    const open = LOCS.filter(l => S.open.includes(l.id) && S.sily >= ZONE[l.z].travel + 2);
    if (open.length) {
      goTo(open[Math.floor(Math.random() * open.length)].id);
      let n = 0;
      while (S.trip && S.sily > 0 && n++ < 30) {
        search(); resolveEvent();
        if (S.fight) fight();
        resolveEvent();
      }
      if (S.trip) goHome();
    }
    resolveEvent();
    sleep(); resolveEvent();
  }
  stats.days.push(S.day); if (S.over) stats.deaths++; stats.kills += S.kills; stats.lvls.push(S.lvl);
}

// Міграція збереження прототипу (v1, без saveVersion)
newGame();
const legacy = JSON.parse(JSON.stringify(S)); delete legacy.saveVersion;
const migrated = migrate(legacy);
if (migrated.saveVersion !== SAVE_VERSION) throw new Error('Міграція не виставила saveVersion');

const avg = a => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1);
console.log(`OK: ${GAMES} ігор по ${DAYS} днів без помилок`);
console.log(`Середній день: ${avg(stats.days)} · смертей: ${stats.deaths} · середній рівень: ${avg(stats.lvls)} · перемог: ${stats.kills}`);
console.log(`Міграція v1 → v${SAVE_VERSION}: OK`);
