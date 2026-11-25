// Збирає контури потрібних іконок Tabler (npm-пакет @tabler/icons, MIT) у src/ui/icons.gen.js.
// Список — src/ui/icon-map.js. Запуск: npm run ui-icons
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { EMOJI, FALLBACK, EXTRA } from '../src/ui/icon-map.js';

const DIR = new URL('../node_modules/@tabler/icons/icons/outline/', import.meta.url);
const names = new Set([...Object.values(EMOJI).map(v => v.split(' ')[0]), ...Object.values(FALLBACK), ...EXTRA]);
const out = {}, missing = [];
for (const n of [...names].sort()) {
  const f = new URL(n + '.svg', DIR);
  if (!existsSync(f)) { missing.push(n); continue; }
  const svg = readFileSync(f, 'utf8');
  // Лише контури, без рамки 24×24 (stroke="none") і зайвих пробілів
  out[n] = [...svg.matchAll(/<(path|circle|rect|line|polyline|polygon|ellipse)\b[^>]*\/>/g)]
    .map(m => m[0]).filter(s => !s.includes('stroke="none"')).join('').replace(/\s+/g, ' ').replace(/ \/>/g, '/>');
}
if (missing.length) { console.error('Немає іконок:', missing.join(', ')); process.exit(1); }
const body = Object.entries(out).map(([n, d]) => `  ${JSON.stringify(n)}: ${JSON.stringify(d)},`).join('\n');
writeFileSync(new URL('../src/ui/icons.gen.js', import.meta.url),
  `// Згенеровано tools/ui-icons.mjs з @tabler/icons (MIT). Не редагувати вручну — npm run ui-icons.\nexport const ICONS = {\n${body}\n};\n`);
console.log(`icons.gen.js: ${Object.keys(out).length} іконок`);
