// Сюжет: глави з цілями, боси на локаціях, нагороди, фінал (data/story.json).
// storyCheck() викликається після дій гравця і вранці: зараховує цілі, видає нагороди, відкриває наступну главу.
import { STORY, BAL, WPN, ARM } from './data.js';
import { ui } from './hooks.js';
import { S, log, gainXP, resStr } from './state.js';
import { mkWeapon, mkArmor, pickType, itemName } from './items.js';
import { itemHTML } from './ui/format.js';
import { t, tr } from './i18n.js';

const CH = STORY.chapters;
const st = () => (S.story ||= { ch: 0, started: false, visited: {}, bosses: {}, given: {}, finished: false });
export const chapter = () => CH[st().ch] || null;

/** Чи виконана ціль (give — ще й забирає ресурси при здачі, див. giveGoal). */
export function goalDone(g) {
  const s = st();
  switch (g.type) {
    case 'build': return S.bld[g.bld] >= g.lvl;
    case 'day': return S.day >= g.day;
    case 'lvl': return S.lvl >= g.lvl;
    case 'visit': return !!s.visited[g.loc];
    case 'boss': return !!s.bosses[g.boss];
    case 'give': return !!s.given[`${chapter()?.id}:${g.res}`];
    default: return false;
  }
}

/** Здати ресурси на ціль типу give. */
export function giveGoal(i) {
  const c = chapter(), g = c?.goals[+i]; if (!g || g.type !== 'give' || goalDone(g)) return;
  if ((S.res[g.res] || 0) < g.amount) return ui.toast(t('Не вистачає ресурсів'));
  S.res[g.res] -= g.amount; st().given[`${c.id}:${g.res}`] = true;
  log(t`📜 Здано: ${resStr({ [g.res]: g.amount })}`); storyCheck(); ui.render();
}

/** Бос, який чекає на цій локації (за поточною главою). */
export function bossAt(locId) {
  const c = chapter(); if (!c || !st().started) return null;
  const i = c.goals.findIndex(g => g.type === 'boss' && g.loc === locId && !goalDone(g));
  if (i < 0) return null;
  // бос зʼявляється, коли решта цілей до нього вже виконані
  if (c.goals.slice(0, i).some(g => !goalDone(g))) return null;
  return c.goals[i].boss;
}
export function mkBoss(id) {
  const B = STORY.bosses[id];
  return { key: id, n: B.n, e: B.e, hp: B.hp, max: B.hp, atk: B.atk, def: B.def, xp: B.xp, loot: B.loot || {}, traits: B.traits || {},
    boss: id, shield: B.traits?.armor?.shield, summon: B.traits?.summon ? { ...B.traits.summon } : undefined };
}

export function markVisit(locId) { st().visited[locId] = true; }
export function markBoss(id) { st().bosses[id] = true; log(t`📜 Переможено: ${tr(STORY.bosses[id].n)}`); }

const pTxt = lines => lines.map(l => (l.startsWith('[Система]') ? `<div class="sys">${tr(l)}</div>` : `<p style="margin:0 0 8px">${tr(l)}</p>`)).join('');

function reward(R) {
  const out = [];
  if (R.res) { for (const k in R.res) S.res[k] = (S.res[k] || 0) + R.res[k]; out.push(resStr(R.res)); }
  if (R.med) { S.res.med += R.med; out.push('💊' + R.med); }
  if (R.item) {
    const I = R.item, it = I.k === 'w' ? mkWeapon(pickType(WPN, I.tier), I.rar) : mkArmor(pickType(ARM, I.tier), I.rar);
    S.inv.push(it); out.push(itemHTML(it));
  }
  if (R.unlockZone !== undefined) { (S.zones ||= {})[R.unlockZone] = true; out.push(t('🗺️ Відкрито Глибоку зону')); }
  for (const id of R.open || []) if (!S.open.includes(id)) S.open.push(id);
  if (R.xp) { gainXP(R.xp); out.push(`+${R.xp} XP`); }
  return out.join('<br>');
}

/** Головна перевірка сюжету. Повертає true, якщо щось змінилося. */
export function storyCheck() {
  if (!S || S.over) return false;
  const s = st(), c = chapter(); if (!c || s.finished) return false;
  if (!s.started) {
    if (S.day < c.fromDay) return false;
    s.started = true; log(t`📜 Глава ${s.ch + 1}: ${tr(c.n)}`);
    ui.showEvent({ e: '📜', t: t`Глава ${s.ch + 1}. ${tr(c.n)}`, txt: pTxt(c.intro) + `<h3>${t('Завдання')}</h3>` + goalsHTML(c), b: [[t('Вперед'), null]] });
    return true;
  }
  if (!c.goals.every(goalDone)) return false;
  const got = reward(c.reward || {});
  log(t`📜 Главу завершено: ${tr(c.n)}`);
  s.ch++; s.started = false;
  const last = s.ch >= CH.length;
  if (last) { s.finished = true; S.stats.storyDay = S.day; }
  ui.sfx('level');
  ui.showEvent({ e: last ? '🌅' : '✅', t: t`Главу завершено: ${tr(c.n)}`, txt: pTxt(c.outro) + (got ? `<h3>${t('Нагорода')}</h3>${got}` : '')
    + (last ? `<h3>${tr(STORY.ending.n)}</h3><p>${tr(STORY.ending.txt).replace('{day}', S.day)}</p>` : ''),
    b: [[t('Далі'), () => storyCheck()]] });
  return true;
}

/** Список цілей для інтерфейсу (рядки з ✅/⬜). */
export function goalsHTML(c = chapter()) {
  if (!c) return '';
  return `<ul class="goals">${c.goals.map((g, i) => {
    const ok = goalDone(g);
    const extra = g.type === 'give' && !ok ? ` <span class="mut">(${S.res[g.res] || 0}/${g.amount})</span>` : g.type === 'lvl' && !ok ? ` <span class="mut">(${S.lvl}/${g.lvl})</span>` : g.type === 'day' && !ok ? ` <span class="mut">(${S.day}/${g.day})</span>` : '';
    return `<li class="${ok ? 'ok' : ''}">${ok ? '✅' : '⬜'} ${tr(g.n)}${extra}</li>`;
  }).join('')}</ul>`;
}
export const chapterNo = () => st().ch + 1;
export const storyStarted = () => st().started;
export const storyFinished = () => st().finished;
export { itemName };
