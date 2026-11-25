// Екран бою. На телефоні — один екран без прокрутки: ворог з наміром і HP угорі, твоє HP і супер поруч,
// карти й дії внизу. Хід планується (карти позначаються), а «Хід» розігрує все разом.
import { WPN, RAR, BAL, NPCS } from '../data.js';
import { S, item, maxHP, pDef } from '../state.js';
import { itemName } from '../items.js';
import { traitText, apLeft, planInfo } from '../combat.js';
import { act, artBox } from './common.js';
import { lineStable } from '../texts.js';
import { currentTip, tipText } from './tutorial.js';
import { ic } from './icons.js';
import { t, tr } from '../i18n.js';

let shownFx = 0; // підсумок ходу (−N / +N) показуємо один раз, а не при кожному перемальовуванні

const pips = (on, all) => `<span class="pips">${[...Array(Math.max(0, all))].map((_, i) => `<i class="${i < on ? 'on' : ''}"></i>`).join('')}</span>`;
const pct = (v, max) => Math.max(0, Math.min(100, v / max * 100));

export function vFight() {
  const F = S.fight, en = F.en, C = BAL.combat, mins = en.minions || [], P = planInfo();
  const fx = F.last && F.last.id !== shownFx ? F.last : null; if (fx) shownFx = fx.id;
  const npc = en.npc && S.npcs?.find(p => p.id === en.npc), npcKey = npc && NPCS.names.find(x => x.n === npc.n)?.key;
  const key = en.human ? [npcKey && 'survivor_' + npcKey, 'survivor'].filter(Boolean) : 'mon_' + en.key;

  // Намір ворога — плашка на арті
  const minAtk = mins.length ? mins.length * en.summon.atk : 0;
  const intent = en.stun ? t`💫 Оглушений`
    : { atk: t`🗡️ Удар ${en.intent.v}`, heavy: t`💢 Важкий удар ${en.intent.v}`, guard: t`🛡️ Захист +${C.guardDef} · удар ${en.intent.v}`, flee: t('💨 Тікає!') }[en.intent.t];
  const chips = [
    en.bleedT && t`🩸 ${en.bleed}×${en.bleedT}`, en.burnT && t`🔥 ${en.burn}×${en.burnT}`,
    en.shield > 0 && t`🛡️ панцир ${en.shield}`, mins.length && t`👥 ${en.summon.n} ×${mins.length} · ${t('удар')} ${minAtk}`,
  ].filter(Boolean).map(c => `<span class="chip">${c}</span>`).join('');

  // Смужки: що знесе запланований хід (світліший шматок)
  const enHp = Math.max(0, en.hp), dmgPre = Math.min(enHp, P.dmg), meHp = Math.max(0, S.hp), hurtPre = Math.min(meHp, P.incoming);
  const def = pDef() + P.block;
  const hand = F.hand.map((id, i) => {
    const w = item(id); if (!w) return '';
    const R = RAR[w.rar], k = F.sel.indexOf(i), sel = k >= 0, off = !sel && w.ap > P.apLeft;
    return t`<button class="wcard${sel ? ' sel' : ''}${off ? ' off' : ''}" style="--rar:${R.col}" ${act('toggleCard', i)} title="${WPN[w.type].td}">
      <span class="wt"><span class="e">${WPN[w.type].e}</span>${sel ? `<span class="no">${k + 1}</span>` : pips(w.ap, w.ap)}</span>
      <span class="nm">${itemName(w)}</span>
      <span class="dm">${w.dmg}<small>${t('шкода')}</small></span>
      <span class="tr">${WPN[w.type].td}</span></button>`;
  }).join('');

  const tip = currentTip('fight');
  const goSub = P.kills ? t('добиває ворога') : P.dmg || P.block ? [P.dmg && t`≈${P.dmg} ворогу`, P.block && t`блок ${P.block}`].filter(Boolean).join(' · ') : t('нічого не вибрано');
  const sup = S.sup >= C.super.max;

  return t`<div class="fight">
  <div class="f-top"><span>${t('Хід')} <b>${F.turn}</b></span><span>${t('ОД')} ${pips(P.apLeft, F.ap)} <b>${P.apLeft}/${F.ap}</b></span>
    <button class="sm ghost flee" ${act('flee')}>🏃 ${t('Втекти')}</button></div>
  ${tip ? t`<div class="f-tip">💡<div><b>${tr(tip.t)}.</b> ${tipText(tip)}</div><button class="sm" ${act('tutOk', tip.id)}>${t('Зрозуміло')}</button></div>` : ''}
  <div class="f-foe">
    ${artBox(key, en.e, 'mon f-art', '', `<span class="f-intent${en.stun || en.intent.t === 'flee' ? ' calm' : ''}">${intent}${minAtk && !en.stun ? ` +${minAtk}` : ''}</span>${chips ? `<div class="f-st">${chips}</div>` : ''}${fx && fx.dealt ? `<span class="f-fx">−${fx.dealt}</span>` : ''}`)}
    <div class="f-name"><span class="n">${tr(en.n)}${en.rare ? ' ✨' : ''}</span><span class="v"><b>${enHp}</b>/${en.max} · 🛡️${en.def + (en.guard ? C.guardDef : 0)}</span></div>
    <div class="bar f-bar"><i style="width:${pct(enHp, en.max)}%"></i>${dmgPre ? `<i class="pre" style="left:${pct(enHp - dmgPre, en.max)}%;width:${pct(dmgPre, en.max)}%"></i>` : ''}</div>
  </div>
  <div class="f-me">
    <div class="f-name"><span class="n">${t('Ти')}${fx && fx.taken ? `<span class="f-fx me">−${fx.taken}</span>` : ''}${fx && fx.heal ? `<span class="f-fx me heal">+${fx.heal}</span>` : ''}</span>
      <span class="v">❤️ <b>${meHp}</b>/${maxHP()} · 🛡️ <b>${def}</b>${P.incoming ? t` · ${t('отримаєш')} ≈<b class="bad">${P.incoming}</b>` : ''}${F.poisonT ? t` · ☠️ ${F.poison}×${F.poisonT}` : ''}</span></div>
    <div class="bar me f-bar"><i style="width:${pct(meHp, maxHP())}%"></i>${hurtPre ? `<i class="pre" style="left:${pct(meHp - hurtPre, maxHP())}%;width:${pct(hurtPre, maxHP())}%"></i>` : ''}</div>
    <div class="f-sup${sup ? ' full' : ''}"><span>🌟 ${t('Супер')}</span><div class="bar sup"><i style="width:${pct(S.sup, C.super.max)}%"></i></div><span>${Math.round(S.sup)}%</span></div>
  </div>
  <div class="hand">${hand}</div>
  <div class="f-acts">
    <div class="stepper"><button ${act('blockLess')} aria-label="${t('Менше блоку')}" ${F.blk ? '' : 'disabled'}>${ic('minus')}</button>
      <span>🛡️ ${t('Блок')} <b>${F.blk ? '+' + P.block : ''}</b></span>
      <button ${act('blockMore')} aria-label="${t('Більше блоку')}" ${P.apLeft >= C.block.cost ? '' : 'disabled'}>${ic('plus')}</button></div>
    <button class="supb${F.sup ? ' on' : ''}" ${act('superAct')} ${sup ? '' : 'disabled'}>🌟 ${F.sup ? t('Супер ✔') : t('Супер')}</button>
  </div>
  <button class="pri go" ${act('endTurn')}>${t('Хід')} ▶ <span class="sub">${goSub}</span></button>
  <details class="f-log"><summary>${F.flog[0] ? F.flog[0] : t('Хід бою')}</summary>${F.flog.slice(1, 12).map(l => `<div>${l}</div>`).join('')}</details>
  </div>`;
}

/** Опис ворога для правої колонки на ПК (на телефоні не влазить). */
export function foeInfo() {
  const F = S.fight; if (!F) return '';
  const en = F.en, tt = traitText(en), line = !en.human && lineStable(t`monsters.${en.key}`, en.key + S.day);
  if (!tt && !line) return '';
  return t`<div class="card"><h2>${en.e} ${tr(en.n)}</h2>${line ? `<div><i>${line}</i></div>` : ''}${tt ? `<div class="mut" style="margin-top:6px">${tt}</div>` : ''}</div>`;
}
