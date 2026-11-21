// Збереження з версією схеми й міграціями.
// Коли змінюєш структуру стану: збільш SAVE_VERSION і додай міграцію MIGRATIONS[старa_версія].
import { BLD } from './data.js';
import { S, setState } from './state.js';

export const SAVE_VERSION = 2;
const KEY = 'ashfog_save';
const LEGACY_KEYS = ['ashfog_v1']; // прототип index.html (версія 1, без поля saveVersion)

/** MIGRATIONS[n] переводить збереження з версії n у n+1. */
const MIGRATIONS = {
  // v1 (прототип) → v2: структура та сама, лише з'являється saveVersion.
  1: s => s,
};

export function migrate(data) {
  let v = data.saveVersion ?? 1;
  if (v > SAVE_VERSION) throw new Error(`Збереження з новішої версії гри (${v} > ${SAVE_VERSION})`);
  while (v < SAVE_VERSION) {
    const m = MIGRATIONS[v];
    if (!m) throw new Error(`Немає міграції збереження з версії ${v}`);
    data = m(data); v++;
  }
  data.saveVersion = SAVE_VERSION;
  // Нові будівлі з data/buildings.json → рівень 0 у старих збереженнях
  for (const k in BLD) if (data.bld[k] === undefined) data.bld[k] = 0;
  return data;
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify({ ...S, saveVersion: SAVE_VERSION })); } catch (e) {}
}

export function load() {
  try {
    let raw = localStorage.getItem(KEY);
    if (!raw) for (const k of LEGACY_KEYS) { raw = localStorage.getItem(k); if (raw) break; }
    if (!raw) return false;
    const data = migrate(JSON.parse(raw));
    if (!data || !data.res) return false;
    setState(data);
    return true;
  } catch (e) {
    console.warn('Не вдалося завантажити збереження:', e);
    return false;
  }
}
