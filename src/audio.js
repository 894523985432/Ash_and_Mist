// Звуки й музика. Файли генеруються заздалегідь (tools/audio/generate.py → public/audio/*.ogg + manifest.json).
// Логіка просить звук через ui.sfx('hit'); музика вмикається за екраном (musicFor). Гучність — з налаштувань.
import { settings, onSettings } from './settings.js';

let ctx = null, sfxGain = null, manifest = { sfx: {}, music: {} }, unlocked = false;
const buffers = {}, loading = {};
let musicEl = null, musicKey = null, wantKey = null;

export async function initAudio() {
  try {
    const r = await fetch('./audio/manifest.json', { cache: 'no-cache' });
    if (r.ok) manifest = await r.json();
  } catch (e) { /* без звуку теж грається */ }
  // Браузери дозволяють звук лише після першого дотику
  const unlock = () => {
    if (unlocked) return; unlocked = true;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); sfxGain = ctx.createGain(); sfxGain.connect(ctx.destination); applyVolume(); } catch (e) {}
    if (wantKey) playMusic(wantKey);
  };
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => window.addEventListener(ev, unlock, { once: false, passive: true }));
  onSettings(applyVolume);
  document.addEventListener('visibilitychange', () => {
    if (!musicEl) return;
    if (document.hidden) musicEl.pause(); else if (settings.music > 0) musicEl.play().catch(() => {});
  });
}

function applyVolume() {
  if (sfxGain) sfxGain.gain.value = settings.sfx;
  if (musicEl) { musicEl.volume = settings.music * (manifest.music[musicKey]?.gain ?? 1); if (settings.music <= 0) musicEl.pause(); else if (unlocked && musicEl.paused && !document.hidden) musicEl.play().catch(() => {}); }
}

async function buffer(key) {
  if (buffers[key]) return buffers[key];
  const list = manifest.sfx[key]?.files; if (!list?.length || !ctx) return null;
  loading[key] ||= Promise.all(list.map(f => fetch('./audio/' + f).then(r => r.arrayBuffer()).then(b => ctx.decodeAudioData(b)).catch(() => null)))
    .then(bs => (buffers[key] = bs.filter(Boolean)));
  return loading[key];
}

/** Короткий звук. Якщо варіантів кілька — випадковий, з легкою зміною висоти. */
export async function sfx(key) {
  if (!unlocked || !ctx || settings.sfx <= 0) return;
  const bs = await buffer(key); if (!bs?.length) return;
  try {
    const src = ctx.createBufferSource(); src.buffer = bs[Math.floor(Math.random() * bs.length)];
    src.playbackRate.value = 0.95 + Math.random() * 0.1;
    const g = ctx.createGain(); g.gain.value = manifest.sfx[key]?.gain ?? 1;
    src.connect(g).connect(sfxGain); src.start();
  } catch (e) {}
}

/** Фонова музика з плавним переходом. key = null — тиша. */
export function playMusic(key) {
  wantKey = key;
  if (!unlocked || key === musicKey) return;
  const file = key && manifest.music[key]?.file;
  const old = musicEl; musicKey = key; musicEl = null;
  if (old) fade(old, 0, 800, () => old.pause());
  if (!file || settings.music <= 0) return;
  const el = new Audio('./audio/' + file); el.loop = true; el.volume = 0;
  el.play().then(() => fade(el, settings.music * (manifest.music[key]?.gain ?? 1), 1200)).catch(() => {});
  musicEl = el;
}

function fade(el, to, ms, done) {
  const from = el.volume, t0 = performance.now();
  const step = now => { const k = Math.min(1, (now - t0) / ms); el.volume = from + (to - from) * k; k < 1 ? requestAnimationFrame(step) : done?.(); };
  requestAnimationFrame(step);
}

/** Яка музика для екрана. */
export function musicFor(screen, S) {
  if (screen === 'over') return null;
  if (screen === 'fight') return S.fight?.en?.rare ? 'rare' : 'fight';
  if (screen === 'map' || screen === 'loc') return 'explore';
  return 'home';
}
