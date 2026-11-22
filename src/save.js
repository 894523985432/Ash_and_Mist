// Збереження з версією схеми й міграціями.
// Коли змінюєш структуру стану: збільш SAVE_VERSION і додай міграцію MIGRATIONS[старa_версія].
import { BLD } from './data.js';
import { S, setState } from './state.js';
import { initNpcs } from './npcs.js';
import { getItem, setItem } from './storage.js';
import { settings, setSetting } from './settings.js';

export const SAVE_VERSION = 5;
export const KEY = 'ashfog_save';
export const LEGACY_KEYS = ['ashfog_v1']; // прототип index.html (версія 1, без поля saveVersion)

/** MIGRATIONS[n] переводить збереження з версії n у n+1. */
const MIGRATIONS = {
  // v1 (прототип) → v2: структура та сама, лише з'являється saveVersion.
  1: s => s,
  // v2 → v3: виснаження локацій гравцем і лічильники днів нестачі поспіль.
  2: s => ({ ...s, exhaust: s.exhaust || {}, starve: s.starve || {} }),
  // v3 → v4: постійні вижилі, події дня, колекція трофеїв, навчання (старим гравцям вимкнене).
  3: s => ({
    ...s, npcs: initNpcs(), event: null, caravan: null,
    collection: Object.fromEntries(Object.keys(s.trophies || {}).map(k => [k, true])),
    tut: { seen: {}, off: true },
  }),
  // v4 → v5: енергія, обігрівач, знос, крафт у днях, тварини, статистика.
  // Сонячна панель більше не гріє: старим гравцям даємо обігрівач того ж рівня і генератор, щоб база не замерзла.
  4: s => ({
    ...s, res: { energy: 0, ...s.res }, broken: {}, job: null, pets: [], petOut: null, fuelAcc: 0,
    stats: { maxDay: s.day, kills: s.kills || 0 },
    bld: { ...s.bld, heater: Math.max(s.bld.heater || 0, s.bld.solar || 0), gen: Math.max(s.bld.gen || 0, 1) },
  }),
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

export const SLOTS = 3;
/** Ключ слоту: перший — старий ключ (щоб не загубити наявне збереження). */
export const slotKey = n => (n === 1 ? KEY : `${KEY}_${n}`);
export const ALL_SAVE_KEYS = [...Array(SLOTS)].map((_, i) => slotKey(i + 1));

export function save() {
  if (!S) return;
  setItem(slotKey(settings.slot), JSON.stringify({ ...S, saveVersion: SAVE_VERSION }));
}

/** Короткий опис кожного слоту для меню. */
export function slotInfo() {
  return [...Array(SLOTS)].map((_, i) => {
    const n = i + 1;
    try { const d = JSON.parse(getItem(slotKey(n)) || 'null'); return d ? { n, day: d.day, lvl: d.lvl, over: d.over } : { n }; } catch (e) { return { n, broken: true }; }
  });
}

/** Текст збереження поточної гри (для резервної копії). */
export const exportSave = () => JSON.stringify({ ...S, saveVersion: SAVE_VERSION });
/** Відновлює гру з тексту резервної копії. Кидає помилку, якщо текст не схожий на збереження. */
export function importSave(text) {
  const data = migrate(JSON.parse(text));
  if (!data?.res || !data?.bld) throw new Error('Це не збереження «Попелу і Туману»');
  setState(data); save();
}

export function load(slot = settings.slot) {
  if (slot !== settings.slot) setSetting('slot', slot);
  try {
    let raw = getItem(slotKey(slot));
    if (!raw && slot === 1) for (const k of LEGACY_KEYS) { raw = getItem(k); if (raw) break; }
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
