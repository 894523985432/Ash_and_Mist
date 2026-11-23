// Покроковий картковий бій.
// Особливості ворогів (monsters.json → traits): poison, armor (панцир), summon (прислужники), flee (тікає при малому HP).
import { WPN, RARE, MON, BAL } from './data.js';
import { pick, chance } from './util.js';
import { ui } from './hooks.js';
import { S, item, maxHP, pDef, baseAP, log, locById, gainXP, resStr } from './state.js';
import { randomItem, itemName } from './items.js';
import { addBag, rollLoot, lose } from './trip.js';
import { npcBeaten, npcWon } from './npcs.js';
import { raidSteal } from './day.js';
import { markBoss } from './story.js';
import { itemHTML } from './ui/format.js';
import { petAttackDmg, petTakeShare, companion, petName } from './economy.js';
import { PETS } from './data.js';
import { t, tr } from './i18n.js';

const C = BAL.combat;

export function mkEnemy(key, rare, z) {
  const b = rare ? RARE[key] : MON[key], k = rare ? { hp: 1, atk: 1 } : C.zoneScale[z];
  const hp = Math.round(b.hp * k.hp), tr = b.traits || {};
  const en = { key, n: b.n, e: b.e, hp, max: hp, atk: Math.round(b.atk * k.atk) + (rare ? z * C.rareAtkPerZone : 0), def: b.def, xp: b.xp, loot: b.loot || {}, flee: b.flee, trophy: b.trophy, rare, traits: tr };
  if (tr.armor) en.shield = Math.round(tr.armor.shield * k.hp);
  if (tr.summon) en.summon = { ...tr.summon, hp: Math.round(tr.summon.hp * k.hp), atk: Math.round(tr.summon.atk * k.atk) };
  return en;
}

/** Короткий опис особливостей ворога для інтерфейсу. */
export function traitText(en) {
  const tt = en.traits || {}, out = [];
  if (tt.poison) out.push(t`☠️ отрута ${tt.poison.dmg}×${tt.poison.turns}`);
  if (tt.armor) out.push(t('🛡️ панцир'));
  if (en.summon) out.push(t`📣 кличе: ${en.summon.n}`);
  if (tt.flee) out.push(t('💨 тікає, коли поранений'));
  return out.join(' · ');
}

export function startFight(en) {
  en.bleed = 0; en.bleedT = 0; en.burn = 0; en.burnT = 0; en.stun = false; en.guard = false; en.minions = [];
  S.fight = { en, ap: 0, hand: [], block: 0, turn: 0, flog: [], poison: 0, poisonT: 0 };
  ui.sfx(en.rare ? 'rare' : 'alert');
  if (en.rare) S.fight.flog.push(t('✨ Рідкісна поява! ') + tr(en.n) + (en.flee ? t` — втече через ${en.flee} ходи` : ''));
  const tt = traitText(en); if (tt) S.fight.flog.push(`${en.e} ${en.n}: ${tt}`);
  newTurn(); ui.go('fight');
}

function rollIntent() {
  const F = S.fight, en = F.en; en.guard = false;
  if (en.flee && F.turn >= en.flee) { en.intent = { t: 'flee' }; return; }
  if (en.traits?.flee && en.hp <= en.max * en.traits.flee.hpPct) { en.intent = { t: 'flee' }; return; }
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

/** Удар по ватажку: захист (крім пробиття), потім панцир, потім HP. Повертає шкоду по HP. */
function hitEnemy(raw, pierce) {
  const en = S.fight.en, def = pierce ? 0 : Math.max(0, en.def + (en.guard ? C.guardDef : 0));
  let d = Math.max(C.minDmg, Math.round(raw) - def);
  S.sup = Math.min(C.super.max, S.sup + d * C.super.perDmgDealt);
  if (!pierce && en.shield > 0) { const a = Math.min(en.shield, d); en.shield -= a; d -= a; if (!d) return 0; }
  en.hp -= d;
  return d;
}

/** Удар, який першим ловить прислужник. Залишок шкоди йде у ватажка. */
function hitFront(raw, pierce, note) {
  const en = S.fight.en, m = en.minions?.[0];
  if (!m) return hitEnemy(raw, pierce);
  const dmg = Math.max(C.minDmg, Math.round(raw));
  if (dmg < m.hp) { m.hp -= dmg; note.push(t`прислужник −${dmg}`); return 0; }
  en.minions.shift(); note.push(t`${en.summon.n} знищений`);
  const rest = dmg - m.hp;
  return rest > 0 ? hitEnemy(rest, pierce) : 0;
}

export function playCard(i) {
  i = +i;
  const F = S.fight, en = F.en, w = item(F.hand[i]); if (!w || F.ap < w.ap) return;
  F.ap -= w.ap; F.hand.splice(i, 1);
  const tr = WPN[w.type].trait, T = C.traits, note = [];
  let raw = w.dmg, d = 0;
  if (tr === 'spread') raw = w.dmg * (T.spread.min + Math.random() * T.spread.range);
  if (tr === 'multi') { for (let k = 0; k < T.multi.hits; k++) d += hitFront(raw, false, note); }
  else if (tr === 'reach') d = hitEnemy(raw, false);
  else if (tr === 'burn') {
    if (en.minions?.length) { note.push(t`🔥 згоріли прислужники (${en.minions.length})`); en.minions = []; }
    d = hitEnemy(raw, false); en.burn = T.burn.dmg; en.burnT = T.burn.turns; note.push(t('🔥 підпал'));
  } else d = hitFront(raw, tr === 'pierce', note);
  if (tr === 'bleed') { en.bleed = T.bleed.dmg; en.bleedT = T.bleed.turns; note.push('🩸'); }
  if ((tr === 'stun' && chance(T.stun.chance)) || (tr === 'shock' && chance(T.shock.chance))) { en.stun = true; note.push(t('💫 оглушено!')); }
  if (tr === 'heavy') {
    en.def = Math.max(0, en.def - T.heavy.defBreak); note.push(t`🔨 захист −${T.heavy.defBreak}`);
    if (en.shield > 0) { en.shield = Math.max(0, en.shield - T.heavy.shieldBreak); note.push(t`панцир −${T.heavy.shieldBreak}`); }
  }
  if (tr === 'drain') { const h = Math.ceil(d * T.drain.pct); S.hp = Math.min(maxHP(), S.hp + h); note.push(`💚 +${h}`); }
  ui.sfx(tr === 'shock' || tr === 'burn' ? 'zap' : 'hit');
  F.flog.unshift(t`${WPN[w.type].e} ${itemName(w)}: ${d} шкоди` + (note.length ? ' · ' + note.join(' · ') : ''));
  afterPlayer();
}

export function blockAct() {
  const F = S.fight, B = C.block; if (F.ap < B.cost) return;
  F.ap -= B.cost; F.block += B.value; F.flog.unshift(t`🛡️ Блок +${B.value}`); ui.render();
}

export function superAct() {
  if (S.sup < C.super.max) return;
  const best = Math.max(...S.eq.map(id => item(id)?.dmg || 0));
  const d = hitEnemy(best * C.super.mult, true); S.sup = 0; ui.sfx('super');
  S.fight.flog.unshift(t`🌟 СУПЕРАТАКА: ${d} шкоди!`); afterPlayer();
}

export function flee() {
  if (S.fight.en.rare) { S.fight.flog.unshift(t('Від рідкісного нема куди тікати — він сам тікає 🙂')); return ui.render(); }
  if (chance(C.fleeChance)) { S.fight = null; log(t('Втік із бою')); if (S.trip?.base) { const lost = raidSteal(0.5); S.trip = null; ui.go('base'); return ui.toast(t('Втік! Мародери встигли винести: ') + (lost || '—')); } ui.go('loc'); ui.toast(t('Втік!')); }
  else { S.fight.flog.unshift(t('🏃 Втекти не вдалося!')); S.fight.ap = 0; endTurn(); }
}

function afterPlayer() { if (S.fight.en.hp <= 0) return win(); ui.render(); }

/** Вдарити гравця: захист і блок зменшують, повертає завдану шкоду. */
function hurtPlayer(raw) {
  raw = petTakeShare(raw, S.fight.flog);
  const F = S.fight, absorbed = Math.min(F.block, Math.max(0, raw - pDef()));
  const d = Math.max(0, raw - pDef() - F.block);
  F.block -= absorbed;
  S.hp -= d; S.sup = Math.min(C.super.max, S.sup + d * C.super.perDmgTaken);
  if (d > 0) ui.sfx('hurt');
  return d;
}

export function endTurn() {
  const F = S.fight, en = F.en;
  en.minions ||= [];
  if (en.bleedT > 0) { en.hp -= en.bleed; en.bleedT--; F.flog.unshift(t`🩸 Кровотеча: ${en.bleed}`); if (en.hp <= 0) return win(); }
  if (en.burnT > 0) { en.hp -= en.burn; en.burnT--; F.flog.unshift(t`🔥 Горить: ${en.burn}`); if (en.hp <= 0) return win(); }
  const pd = petAttackDmg();
  if (pd) {
    const p = companion(), note = [], d = hitFront(pd, false, note);
    F.flog.unshift(t`${PETS[p.type].e} ${petName(p)}: ${d} шкоди` + (note.length ? ' · ' + note.join(' · ') : ''));
    if (en.hp <= 0) return win();
  }
  if (en.stun) { en.stun = false; F.flog.unshift(t`💫 ${en.n} оглушений і пропускає хід`); }
  else if (en.intent.t === 'flee') {
    S.fight = null; const xp = Math.ceil(en.xp * C.rareFleeXpMult); gainXP(xp);
    leaveFight();
    const what = en.trophy ? t('Трофей втрачено') : t('Здобич утекла разом із ним');
    return ui.showEvent({ e: en.e, t: t('Втік!'), txt: t`${en.n} розчинився в тумані. ${what}, але +${xp} XP за досвід.`, b: [[t('Ех'), null]] });
  } else {
    const blk = F.block, d = hurtPlayer(en.intent.v);
    F.flog.unshift(t`${en.e} ${en.n} б'є: ${d} шкоди` + (blk ? t` (блок ${blk})` : ''));
    const P = en.traits?.poison;
    if (P && d > 0) { F.poison = P.dmg; F.poisonT = P.turns; F.flog.unshift(t`☠️ Отруєно: ${P.dmg} шкоди ${P.turns} ходи`); }
    if (en.summon && F.turn % en.summon.every === 0 && en.minions.length < en.summon.max) {
      en.minions.push({ hp: en.summon.hp }); F.flog.unshift(t`📣 ${en.n} кличе: ${en.summon.n}`);
    }
  }
  if (en.minions.length) {
    const d = hurtPlayer(en.minions.length * en.summon.atk);
    F.flog.unshift(t`👥 Прислужники (${en.minions.length}) б'ють: ${d}`);
  }
  if (F.poisonT > 0) { S.hp -= F.poison; F.poisonT--; F.flog.unshift(t`☠️ Отрута: ${F.poison}`); }
  ui.shake();
  if (S.hp <= 0) { if (en.npc) npcWon(en.npc); return lose(t`${en.n} тебе здолав.`); }
  newTurn(); ui.render();
}

/** Після бою: з вилазки — назад на локацію; біля бази — здобич одразу на склад. */
function leaveFight() {
  if (!S.trip?.base) return ui.go('loc');
  const tp = S.trip; for (const k in tp.bag) S.res[k] += tp.bag[k];
  tp.items.forEach(i => S.inv.push(i)); S.trip = null; ui.go('base');
}

function win() {
  ui.sfx('win');
  const en = S.fight.en, L = locById(S.trip.loc) || { z: S.trip.z || 0 }, Lt = BAL.loot; S.fight = null; S.kills++;
  gainXP(en.xp);
  let txt = `+${en.xp} XP`;
  const got = addBag(rollLoot(en.loot)); if (Object.keys(got).length) txt += t('<br>Лут: ') + resStr(got);
  if (en.trophy) {
    S.trip.trophies.push(en.trophy);
    txt += t`<br>✨ Трофей: <b>${en.trophy}</b><br><span class="mut">Нічого не посилює, але вижилі за таке багато дають, а повна колекція прикрасить базу.</span>`;
    if (chance(Lt.trophyStimChance)) { S.trip.bag.stim = (S.trip.bag.stim || 0) + 1; txt += t('<br>☕ +1 стимулятор'); }
  }
  if (en.npc) txt += '<br>' + npcBeaten(en.npc);
  if (en.boss) { markBoss(en.boss); txt += t('<br>📜 Сюжетного ворога переможено!'); }
  if (chance(en.rare ? Lt.winItemChanceRare : Lt.winItemChance)) { const it = randomItem(L.z); S.trip.items.push(it); txt += '<br><br>' + itemHTML(it); }
  log(t`Переміг: ${en.n}`); leaveFight();
  ui.showEvent({ e: '🏆', t: t('Перемога над «') + tr(en.n) + '»', txt, b: [[t('Далі'), null]] });
}
