// Налаштування гравця (окремо від збереження гри) і рекорди між іграми.
import { getItem, setItem } from './storage.js';

export const SETTINGS_KEY = 'ashfog_settings';
export const RECORDS_KEY = 'ashfog_records';

const DEFAULTS = { sfx: 0.7, music: 0.4, vibro: true, lang: 'uk', font: 'm', anim: 'normal', slot: 1 };
export const FONT_SIZES = { s: 13, m: 15, l: 17, xl: 19 };
export const ANIM = { normal: 1, fast: 0.5, off: 0 };

export const settings = { ...DEFAULTS };
const listeners = [];
export const onSettings = f => listeners.push(f);

export function loadSettings() {
  try { Object.assign(settings, JSON.parse(getItem(SETTINGS_KEY) || '{}')); } catch (e) {}
  listeners.forEach(f => f(settings));
}
export function setSetting(k, v) {
  if (!(k in DEFAULTS)) return;
  if (typeof DEFAULTS[k] === 'number') v = +v;
  if (typeof DEFAULTS[k] === 'boolean') v = v === true || v === 'true' || v === 'on';
  settings[k] = v; setItem(SETTINGS_KEY, JSON.stringify(settings));
  listeners.forEach(f => f(settings));
}

/* ---------- рекорди ---------- */
export function records() {
  try { return { bestDay: 0, games: 0, deaths: 0, kills: 0, bestLvl: 1, ...JSON.parse(getItem(RECORDS_KEY) || '{}') }; } catch (e) { return { bestDay: 0, games: 0, deaths: 0, kills: 0, bestLvl: 1 }; }
}
/** Записує підсумок гри (смерть або нова гра поверх старої). */
export function recordGame(s, died) {
  if (!s) return;
  const r = records();
  r.games++; if (died) r.deaths++;
  r.bestDay = Math.max(r.bestDay, s.day); r.bestLvl = Math.max(r.bestLvl, s.lvl); r.kills += s.kills || 0;
  setItem(RECORDS_KEY, JSON.stringify(r));
}
