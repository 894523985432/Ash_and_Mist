// Арт за ключами (loc_gas, mon_rat, survivor_kai, …).
// Основне джерело — public/art/*.webp з маніфестом (генерує tools/art/generate.py).
// Поверх нього можна вручну завантажити картинки у вкладці «Арт» (IndexedDB) — для швидких проб.
import { LOCS, MON, RARE, NPCS, ART_DATA, PETS } from './data.js';
import { ui } from './hooks.js';
import { t } from './i18n.js';

/** key → URL зображення (завантажене вручну перекриває файл) */
export const ART = {};
const FILES = {};   // з public/art
const UPLOADS = {}; // з IndexedDB

function rebuild() {
  for (const k in ART) delete ART[k];
  Object.assign(ART, FILES, UPLOADS);
}
export const artSource = k => (UPLOADS[k] ? 'upload' : FILES[k] ? 'file' : null);

/** Перший ключ зі списку, для якого є арт (напр. ['survivor_kai', 'survivor']). */
export const artKey = keys => [].concat(keys).find(k => ART[k]) || null;

export function artKeys() {
  const A = ART_DATA, k = A.fixed.map(x => [...x]);
  LOCS.forEach(l => k.push(['loc_' + l.id, l.n + ' — ' + A.locations[l.id]]));
  Object.entries(MON).forEach(([id, m]) => k.push(['mon_' + id, m.n + ' — ' + (A.monsters?.[id] || '')]));
  Object.entries(RARE).forEach(([id, m]) => k.push(['mon_' + id, m.n + ' — ' + (A.rare?.[id] || '')]));
  NPCS.names.forEach(p => k.push(['survivor_' + p.key, p.n + ' — ' + (A.npcs?.[p.key] || '')]));
  Object.entries(PETS).forEach(([id, p]) => { k.push(['pet_' + id, p.n + ' — ' + (A.pets?.[id] || '')]); k.push(['pet_' + id + '_baby', p.baby + ' — ' + (A.petBaby?.[id] || '')]); });
  return k;
}

/** Підтягує public/art/manifest.json. Якщо файлу нема — просто лишаються емодзі. */
export async function loadArtFiles() {
  try {
    const r = await fetch('./art/manifest.json', { cache: 'no-cache' });
    if (!r.ok) return;
    const m = await r.json();
    for (const k of m.keys || []) FILES[k] = `./art/${k}.webp?v=${m.version || 0}`;
    rebuild(); ui.render();
  } catch (e) { /* без арту теж грається */ }
}

function db() {
  return new Promise((res, rej) => {
    try {
      const r = indexedDB.open('ashfog_art', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('img');
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    } catch (e) { rej(e); }
  });
}

export async function loadArt(files) {
  let n = 0, d = null; try { d = await db(); } catch (e) {}
  for (const f of files) {
    const key = f.name.replace(/\.[^.]+$/, '').toLowerCase(); UPLOADS[key] = URL.createObjectURL(f); n++;
    if (d) try { d.transaction('img', 'readwrite').objectStore('img').put(f, key); } catch (e) {}
  }
  rebuild(); ui.toast(t`Завантажено ${n} зображень`); ui.render();
}

export async function restoreArt() {
  try {
    const d = await db(), req = d.transaction('img').objectStore('img').openCursor();
    req.onsuccess = () => { const c = req.result; if (c) { UPLOADS[c.key] = URL.createObjectURL(c.value); c.continue(); } else { rebuild(); ui.render(); } };
  } catch (e) {}
}

export async function clearArt() {
  for (const k in UPLOADS) delete UPLOADS[k];
  rebuild();
  try { const d = await db(); d.transaction('img', 'readwrite').objectStore('img').clear(); } catch (e) {}
  ui.render();
}
