// Переклад інтерфейсу. Ключ — сам український рядок (як у gettext), переклади — data/i18n/<мова>.json.
//   t`День ${S.day}`  → ключ «День {0}»; t('Зрозуміло') → ключ «Зрозуміло».
// Підставлені значення теж перекладаються, якщо точно збігаються з ключем словника
// (так перекладаються назви з data/*.json: будівлі, монстри, імена).
// Нові рядки: npm run i18n (збирає ключі й догенеровує переклади локальною LLM).
import EN from '../data/i18n/en.json' with { type: 'json' };
import { settings } from './settings.js';

const DICTS = { en: EN };
const keyCache = new WeakMap();

const dict = () => (settings.lang === 'uk' ? null : DICTS[settings.lang] || null);
const tv = (D, v) => (typeof v === 'string' && D[v] !== undefined ? D[v] : v);

export function t(strs, ...vals) {
  const D = dict();
  if (typeof strs === 'string') return D?.[strs] ?? strs;
  if (!D) return strs.reduce((a, s, i) => a + s + (i < vals.length ? vals[i] : ''), '');
  let key = keyCache.get(strs);
  if (key === undefined) { key = strs.reduce((a, s, i) => a + s + (i < strs.length - 1 ? `{${i}}` : ''), ''); keyCache.set(strs, key); }
  const tr = D[key], vs = vals.map(v => tv(D, v));
  if (tr === undefined) return strs.reduce((a, s, i) => a + s + (i < vs.length ? vs[i] : ''), '');
  return tr.replace(/\{(\d+)\}/g, (m, i) => (i < vs.length ? vs[i] : m));
}

/** Переклад окремого значення з даних (назва, опис), якщо воно є в словнику. */
export const tr = v => { const D = dict(); return D ? tv(D, v) : v; };
export const lang = () => settings.lang;
