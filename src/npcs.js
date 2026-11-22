// Постійні вижилі: стосунки, пам'ять про тебе, ростуть із часом, ворожі нападають на базу.
import { RES, NPCS, BAL } from './data.js';
import { rnd, pick, chance } from './util.js';
import { S, log } from './state.js';
import { line } from './texts.js';

const N = () => BAL.npc;

export function initNpcs() {
  return NPCS.names.map((p, i) => ({
    id: 'npc' + i, n: p.n, e: p.e, temper: p.temper, rel: 0, pow: 0, met: 0, gone: false,
    mem: { traded: 0, paid: 0, fought: 0, beaten: 0, lostTo: 0 },
  }));
}

export const npcById = id => S.npcs.find(p => p.id === id);
export const isHostile = p => p.rel <= N().hostileAt;
export const isFriend = p => p.rel >= N().friendlyAt;
export const relEmoji = p => (isHostile(p) ? '😠' : isFriend(p) ? '😊' : '😐');

/** Випадковий живий вижилий, якого ще не вигнали з міста. */
export function pickNpc() {
  const alive = S.npcs.filter(p => !p.gone);
  return alive.length ? pick(alive) : null;
}

/** Хто він для тебе зараз: торгує, грабує чи просто допомагає. */
export function npcMood(p) {
  if (isHostile(p)) return 'raider';
  if (isFriend(p)) return p.temper === 'hermit' ? 'hermit' : 'trader';
  if (chance(N().temperChance)) return p.temper;
  return pick(['trader', 'raider', 'hermit'].filter(t => t !== p.temper));
}

export function relChange(p, key, mem) {
  p.rel = Math.max(-100, Math.min(100, p.rel + N().rel[key]));
  if (mem) p.mem[mem]++;
}

/** Ключ персонажа в data/npcs.json (для текстів і портрета). */
export const npcKey = p => NPCS.names.find(x => x.n === p.n)?.key;

/** Яку категорію реплік обрати з огляду на пам'ять і стосунки. */
export function greetKind(p) {
  const m = p.mem;
  if (m.beaten) return 'beaten';
  if (m.lostTo) return 'lostTo';
  if (isHostile(p)) return 'hostile';
  if (isFriend(p)) return 'friend';
  return p.met ? 'again' : 'first';
}

/** Репліка-привітання з урахуванням того, що він про тебе пам'ятає (тексти з data/texts.uk.json). */
export function greet(p) {
  return '«' + line(`npcs.${npcKey(p)}.${greetKind(p)}`, {}, 'Ну, привіт') + '»';
}

/** Сила людини: росте з днями. */
export function npcPowMult(p) { return 1 + (p?.pow || 0); }

/** Переміг людину в бою. Повертає текст для вікна перемоги. */
export function npcBeaten(id) {
  const p = npcById(id); if (!p) return '';
  relChange(p, 'beaten', 'beaten');
  if (p.mem.beaten >= N().goneAfterBeaten) { p.gone = true; log(`${p.e} ${p.n} пішов із міста назавжди.`); return `${p.e} ${p.n} більше не повернеться в місто.`; }
  return `${p.e} ${p.n} утік і цього не забуде (стосунки ${p.rel}).`;
}

/** Людина перемогла тебе. */
export function npcWon(id) { const p = npcById(id); if (p) relChange(p, 'lostTo', 'lostTo'); }

/** Щоранку: вижилі сильнішають. */
export function npcsDaily() {
  for (const p of S.npcs) if (!p.gone) p.pow += N().growthPerDay;
}

/** Вночі: ворожі вижилі можуть напасти на базу. Повертає повідомлення або null. */
export function npcNightRaid() {
  const R = N().raid;
  if (S.day < R.fromDay) return null;
  for (const p of S.npcs.filter(x => !x.gone && isHostile(x))) {
    if (!chance(R.chancePerHostile - S.bld.wall * R.perWall)) continue;
    const keys = Object.keys(RES).filter(k => S.res[k] > 0), lost = [];
    for (let i = 0; i < R.rolls && keys.length; i++) { const k = pick(keys), n = Math.min(S.res[k], rnd(...R.amount)); S.res[k] -= n; lost.push(RES[k][0] + n); }
    if (lost.length) return `🌙 ${p.e} ${p.n} вночі напав на базу і виніс: ${lost.join(' ')}. Стіни допомогли б.`;
  }
  return null;
}

