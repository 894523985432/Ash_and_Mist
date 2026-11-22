// Сховище ключ-значення для збережень.
// У браузері — localStorage. В APK — Capacitor Preferences (SharedPreferences на Android):
// не зникає, коли система чистить дані WebView. Читання синхронне з копії в памʼяті,
// тому initStorage() треба дочекатися до першого load().
const mem = {};
let prefs = null;

export async function initStorage(keys) {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return;
    const { Preferences } = await import('@capacitor/preferences');
    for (const k of keys) {
      let { value } = await Preferences.get({ key: k });
      // Перенос старого збереження з localStorage WebView (якщо гра колись працювала без Preferences)
      if (value == null) { try { value = localStorage.getItem(k); } catch (e) {} if (value != null) await Preferences.set({ key: k, value }); }
      if (value != null) mem[k] = value;
    }
    prefs = Preferences;
  } catch (e) { console.warn('Preferences недоступні, лишаюсь на localStorage:', e); }
}

export function getItem(k) {
  if (prefs) return mem[k] ?? null;
  try { return globalThis.localStorage?.getItem(k) ?? null; } catch (e) { return null; }
}

export function setItem(k, v) {
  if (prefs) { mem[k] = v; prefs.set({ key: k, value: v }).catch(() => {}); return; }
  try { globalThis.localStorage?.setItem(k, v); } catch (e) {}
}
