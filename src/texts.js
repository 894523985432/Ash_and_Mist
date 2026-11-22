// Тексти, згенеровані локальною LLM (tools/text/generate.py → data/texts.uk.json).
// line('npcs.kai.trade', {toll: '2💧'}) — випадковий рядок; якщо тексту нема, повертає fallback.
import TEXTS from '../data/texts.uk.json' with { type: 'json' };
import { pick } from './util.js';

export { TEXTS };

function get(path) {
  let d = TEXTS;
  for (const k of path.split('.')) { if (d == null || typeof d !== 'object') return null; d = d[k]; }
  return d;
}

export function line(path, vars = {}, fallback = '') {
  const v = get(path);
  const s = Array.isArray(v) && v.length ? pick(v) : typeof v === 'string' ? v : fallback;
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}

/** Той самий рядок для того самого seed (щоб текст не мигав при кожному перемальовуванні). */
export function lineStable(path, seed, vars = {}, fallback = '') {
  const v = get(path);
  if (!Array.isArray(v) || !v.length) return fallback;
  let h = 0; for (const c of String(seed)) h = (h * 31 + c.charCodeAt(0)) | 0;
  return v[Math.abs(h) % v.length].replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}

export const hasText = path => { const v = get(path); return Array.isArray(v) ? v.length > 0 : !!v; };
