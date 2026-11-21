// Покроковий картковий бій.
import { WPN, RARE, MON, BAL } from './data.js';
import { pick, chance } from './util.js';
import { ui } from './hooks.js';
import { S, item, maxHP, pDef, baseAP, log, locById, gainXP, resStr } from './state.js';
import { randomItem, itemName } from './items.js';
import { addBag, rollLoot, lose } from './trip.js';
import { itemHTML } from './ui/format.js';

const C = BAL.combat;

export function mkEnemy(key, rare, z) {
  const b = rare ? RARE[key] : MON[key];
  return { key, n: b.n, e: b.e, hp: b.hp, max: b.hp, atk: b.atk + (rare ? z * C.rareAtkPerZone : 0), def: b.def, xp: b.xp, loot: b.loot || {}, flee: b.flee, trophy: b.trophy, rare };
}

export function startFight(en) {
  en.bleed = 0; en.bleedT = 0; en.stun = false; en.guard = false;
  S.fight = { en, ap: 0, hand: [], block: 0, turn: 0, flog: [] };
  if (en.rare) S.fight.flog.push('✨ Рідкісна поява! ' + en.n + (en.flee ? ` — втече через ${en.flee} ходи` : ''));
  newTurn(); ui.go('fight');
}

function rollIntent() {
  const F = S.fight, en = F.en; en.guard = false;
  if (en.flee && F.turn >= en.flee) { en.intent = { t: 'flee' }; return; }
  const r = Math.random();
  if (r < C.intent.atk) en.intent = { t: 'atk', v: en.atk };
  else if (r < C.intent.heavy) en.intent = { t: 'heavy', v: Math.round(en.atk * C.heavyMult) };
  else { en.guard = true; en.intent = { t: 'guard', v: Math.ceil(en.atk * C.guardAtkMult) }; }
}

function newTurn() {
  const F = S.fight; F.turn++; F.ap = baseAP(); F.block = 0;
  const deck = [];
  S.eq.forEach(id => { if (item(id)) for (let i = 0; i < C.copiesPerWeapon; i++) deck.push(id); });
  F.hand = []; for (let i = 0; i < C.handSize; i++) F.hand.push(pick(deck));
  rollIntent();
}

function hitEnemy(raw, pierce) {
  const en = S.fight.en, def = pierce ? 0 : Math.max(0, en.def + (en.guard ? C.guardDef : 0));
  const d = Math.max(C.minDmg, Math.round(raw) - def); en.hp -= d;
  S.sup = Math.min(C.super.max, S.sup + d * C.super.perDmgDealt);
  return d;
}

export function playCard(i) {
  i = +i;
  const F = S.fight, w = item(F.hand[i]); if (!w || F.ap < w.ap) return;
  F.ap -= w.ap; F.hand.splice(i, 1);
  const tr = WPN[w.type].trait, T = C.traits; let raw = w.dmg, note = '';
  if (tr === 'spread') raw = w.dmg * (T.spread.min + Math.random() * T.spread.range);
  const d = hitEnemy(raw, tr === 'pierce');
  if (tr === 'bleed') { F.en.bleed = T.bleed.dmg; F.en.bleedT = T.bleed.turns; note = ' 🩸'; }
  if (tr === 'stun' && chance(T.stun.chance)) { F.en.stun = true; note = ' 💫 оглушено!'; }
  if (tr === 'heavy') { F.en.def = Math.max(0, F.en.def - T.heavy.defBreak); note = ` 🔨 захист −${T.heavy.defBreak}`; }
  if (tr === 'drain') { const h = Math.ceil(d * T.drain.pct); S.hp = Math.min(maxHP(), S.hp + h); note = ` 💚 +${h}`; }
  F.flog.unshift(`${WPN[w.type].e} ${itemName(w)}: ${d} шкоди${note}`);
  afterPlayer();
}

export function blockAct() {
  const F = S.fight, B = C.block; if (F.ap < B.cost) return;
  F.ap -= B.cost; F.block += B.value; F.flog.unshift(`🛡️ Блок +${B.value}`); ui.render();
}

export function superAct() {
  if (S.sup < C.super.max) return;
  const best = Math.max(...S.eq.map(id => item(id)?.dmg || 0));
  const d = hitEnemy(best * C.super.mult, true); S.sup = 0;
  S.fight.flog.unshift(`🌟 СУПЕРАТАКА: ${d} шкоди!`); afterPlayer();
}

export function flee() {
  if (S.fight.en.rare) { S.fight.flog.unshift('Від рідкісного нема куди тікати — він сам тікає 🙂'); return ui.render(); }
  if (chance(C.fleeChance)) { S.fight = null; log('Втік із бою'); ui.go('loc'); ui.toast('Втік!'); }
  else { S.fight.flog.unshift('🏃 Втекти не вдалося!'); S.fight.ap = 0; endTurn(); }
}

function afterPlayer() { if (S.fight.en.hp <= 0) return win(); ui.render(); }

export function endTurn() {
  const F = S.fight, en = F.en;
  if (en.bleedT > 0) { en.hp -= en.bleed; en.bleedT--; F.flog.unshift(`🩸 Кровотеча: ${en.bleed}`); if (en.hp <= 0) return win(); }
  if (en.stun) { en.stun = false; F.flog.unshift(`💫 ${en.n} оглушений і пропускає хід`); }
  else if (en.intent.t === 'flee') {
    S.fight = null; const xp = Math.ceil(en.xp * C.rareFleeXpMult); gainXP(xp);
    ui.go('loc');
    return ui.showEvent({ e: en.e, t: 'Втік!', txt: `${en.n} розчинився в тумані. Трофей втрачено, але +${xp} XP за досвід.`, b: [['Ех', null]] });
  } else {
    const raw = en.intent.v, d = Math.max(0, raw - pDef() - F.block);
    S.hp -= d; S.sup = Math.min(C.super.max, S.sup + d * C.super.perDmgTaken);
    F.flog.unshift(`${en.e} ${en.n} б'є: ${d} шкоди` + (F.block ? ` (блок ${F.block})` : ''));
    ui.shake();
    if (S.hp <= 0) return lose(`${en.n} тебе здолав.`);
  }
  newTurn(); ui.render();
}

function win() {
  const en = S.fight.en, L = locById(S.trip.loc), Lt = BAL.loot; S.fight = null; S.kills++;
  gainXP(en.xp);
  let txt = `+${en.xp} XP`;
  const got = addBag(rollLoot(en.loot, false)); if (Object.keys(got).length) txt += '<br>Лут: ' + resStr(got);
  if (en.trophy) {
    S.trip.trophies.push(en.trophy);
    txt += `<br>✨ Трофей: <b>${en.trophy}</b><br><span class="mut">Нічого не посилює, але вижилі за таке багато дають.</span>`;
    if (chance(Lt.trophyStimChance)) { S.trip.bag.stim = (S.trip.bag.stim || 0) + 1; txt += '<br>☕ +1 стимулятор'; }
  }
  if (chance(en.rare ? Lt.winItemChanceRare : Lt.winItemChance)) { const it = randomItem(L.z); S.trip.items.push(it); txt += '<br><br>' + itemHTML(it); }
  log(`Переміг: ${en.n}`); ui.go('loc');
  ui.showEvent({ e: '🏆', t: 'Перемога над «' + en.n + '»', txt, b: [['Далі', null]] });
}
