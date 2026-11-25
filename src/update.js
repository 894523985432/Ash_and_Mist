// Оновлення гри через мережу (APK і ПК; вебверсію оновлює service worker сам).
// Нова версія — це свіжий реліз на GitHub. ПК-інсталятор качає й ставить його сам (electron-updater),
// на Android і в портативній версії гра лише показує, що нового, і дає посилання на файл.
import { ui } from './hooks.js';
import { t } from './i18n.js';
import { getItem, setItem } from './storage.js';

export const REPO = '894523985432/Ash_and_Mist';
export const UPDATE_KEY = 'ashfog_update';
const API = `https://api.github.com/repos/${REPO}/releases/latest`;
const RELEASES = `https://github.com/${REPO}/releases/latest`;
const SNOOZE_MS = 3 * 24 * 3600e3; // «Пізніше» при автоперевірці — не нагадувати про ту саму версію 3 дні

let env = { native: false, desktop: false, auto: false };
let busy = false, downloading = false;

/** Де запущена гра: native — APK, desktop — Electron, auto — ПК-інсталятор, що вміє оновлюватись сам. */
export async function initUpdates(native) {
  env.native = native;
  env.desktop = !!window.desktop;
  if (env.desktop && window.desktop.update) {
    env.auto = await window.desktop.update.canAuto().catch(() => false);
    window.desktop.update.onEvent(onDesktopEvent);
  }
}

/** Чи має сенс кнопка «Перевірити оновлення» (вебверсія оновлюється сама). */
export const updatesSupported = () => env.native || env.desktop;

/** 0.10.0 > 0.9.3: порівнюємо числа, а не рядки; «v» на початку тегу ігноруємо. */
export function newer(a, b) {
  const pa = String(a).replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
  const pb = String(b).replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  }
  return false;
}

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** Розділ «Що нового» з опису релізу (markdown) — коротким HTML без таблиць і посилань. */
export function notesHTML(body) {
  const part = String(body || '').split(/^##\s+(?!Що нового)/m)[0];
  const lines = part.split(/\r?\n/).map(l => l.trim()).filter(l => l && !/^#/.test(l) && !/^\|/.test(l));
  return lines.slice(0, 12).map(l => esc(l).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '$1').replace(/^[-*]\s+/, '• ')).join('<br>');
}

function readSnooze() { try { return JSON.parse(getItem(UPDATE_KEY) || '{}'); } catch (e) { return {}; } }

function openUrl(url) {
  if (env.native) location.href = url; // Capacitor відкриває чужі адреси в системному браузері, а не в грі
  else window.open(url, '_blank');     // Electron: обробник вікон відкриває посилання у звичайному браузері
}

/** Перевірка нової версії. manual — натиснули кнопку: тоді кажемо й про «нема оновлень», і про помилки. */
export async function checkUpdates(manual = false) {
  if (!updatesSupported() || busy) return;
  if (downloading) { if (manual) ui.toast(t('Оновлення вже завантажується…')); return; }
  busy = true;
  try {
    const r = await fetch(API, { headers: { Accept: 'application/vnd.github+json' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const rel = await r.json();
    const ver = String(rel.tag_name || '').replace(/^v/i, '');
    if (!ver || !newer(ver, __APP_VERSION__)) {
      if (manual) ui.toast(t`У тебе остання версія (${__APP_VERSION__})`);
      return;
    }
    const snooze = readSnooze();
    if (!manual && snooze.v === ver && Date.now() - snooze.at < SNOOZE_MS) return;
    offer(rel, ver);
  } catch (e) {
    if (manual) ui.toast(t('Не вдалося перевірити оновлення: ') + e.message);
  } finally { busy = false; }
}

function offer(rel, ver) {
  const assets = rel.assets || [];
  const pick = re => assets.find(a => re.test(a.name))?.browser_download_url;
  const later = () => setItem(UPDATE_KEY, JSON.stringify({ v: ver, at: Date.now() }));
  const notes = notesHTML(rel.body);
  let txt = t`Твоя версія — ${__APP_VERSION__}.` + (notes ? `<h3>${t('Що нового')}</h3><div class="mut">${notes}</div>` : '');
  let go;
  if (env.auto) {
    txt += t`<br><span class="mut">Гра завантажить оновлення сама, а встановить після перезапуску. Збереження лишаться.</span>`;
    go = [t('⬇️ Оновити'), () => startDownload()];
  } else {
    const url = (env.native ? pick(/\.apk$/i) : env.desktop ? pick(/Portable.*\.exe$/i) : null) || rel.html_url || RELEASES;
    txt += env.native
      ? t`<br><span class="mut">Завантаж новий APK і встанови поверх — збереження лишаться. Android може попросити дозвіл на встановлення з браузера.</span>`
      : t`<br><span class="mut">Завантаж новий файл і запускай його замість старого — збереження лишаться.</span>`;
    go = [t('⬇️ Завантажити'), () => openUrl(url)];
  }
  ui.showEvent({ e: '🆕', t: t`Вийшла версія ${ver}`, txt, b: [go, [t('Пізніше'), later]] });
}

async function startDownload() {
  downloading = true;
  ui.toast(t('Завантажую оновлення…'));
  try { await window.desktop.update.download(); }
  catch (e) { if (downloading) { downloading = false; failed(e.message); } } // помилку могла вже показати подія 'error'
}

function failed(msg) {
  ui.showEvent({ e: '⚠️', t: t('Оновлення не вдалося'), txt: t`${msg || ''}<br><span class="mut">Можна завантажити новий інсталятор зі сторінки релізів і запустити його — збереження лишаться.</span>`,
    b: [[t('Відкрити сторінку'), () => openUrl(RELEASES)], [t('Закрити'), null]] });
}

let lastPct = 0;
function onDesktopEvent(ev) {
  if (ev.type === 'progress') {
    const step = Math.floor(ev.percent / 25) * 25;
    if (step > lastPct && step < 100) { lastPct = step; ui.toast(t`Оновлення: ${step}%`); }
  } else if (ev.type === 'ready') {
    downloading = false; lastPct = 0;
    ui.showEvent({ e: '✅', t: t`Версія ${ev.version} готова`, txt: t('Перезапустити гру зараз? Якщо ні — оновлення встановиться, коли вийдеш із гри.'),
      b: [[t('🔄 Перезапустити'), () => window.desktop.update.install()], [t('Пізніше'), null]] });
  } else if (ev.type === 'error') {
    if (!downloading) return;
    downloading = false; lastPct = 0;
    failed(ev.message);
  }
}
