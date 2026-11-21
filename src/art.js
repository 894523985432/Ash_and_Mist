// Арт за ключами (loc_gas, mon_rat, …). Поки що — ручне завантаження в IndexedDB.
// Етап 4 замінить це на файли з public/art/.
import { LOCS, MON, RARE, ART_DATA } from './data.js';
import { ui } from './hooks.js';

/** key → URL зображення */
export const ART = {};

export function artKeys() {
  const A = ART_DATA, k = A.fixed.map(x => [...x]);
  LOCS.forEach(l => k.push(['loc_' + l.id, l.n + ' — ' + A.locations[l.id]]));
  Object.entries(MON).forEach(([id, m]) => k.push(['mon_' + id, m.n + A.monsterSuffix]));
  Object.entries(RARE).forEach(([id, m]) => k.push(['mon_' + id, m.n + A.rareSuffix]));
  return k;
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
    const key = f.name.replace(/\.[^.]+$/, '').toLowerCase(); ART[key] = URL.createObjectURL(f); n++;
    if (d) try { d.transaction('img', 'readwrite').objectStore('img').put(f, key); } catch (e) {}
  }
  ui.toast(`Завантажено ${n} зображень`); ui.render();
}

export async function restoreArt() {
  try {
    const d = await db(), req = d.transaction('img').objectStore('img').openCursor();
    req.onsuccess = () => { const c = req.result; if (c) { ART[c.key] = URL.createObjectURL(c.value); c.continue(); } else ui.render(); };
  } catch (e) {}
}

export async function clearArt() {
  for (const k in ART) delete ART[k];
  try { const d = await db(); d.transaction('img', 'readwrite').objectStore('img').clear(); } catch (e) {}
  ui.render();
}
