// Збирає всі рядки для перекладу: t`…` і t('…') у src/, українські рядки з data/*.json.
//   node tools/i18n/extract.mjs  → tools/i18n/keys.json  (список ключів; переклади — tools/i18n/translate.py)
import { parse } from 'acorn';
import { simple } from 'acorn-walk';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const CYR = /[А-Яа-яІіЇїЄєҐґ]/;
const keys = new Map(); // ключ → звідки
const add = (k, from) => { if (k && CYR.test(k) && !keys.has(k)) keys.set(k, from); };

const files = [];
const walk = d => { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') && files.push(p.split('\\').join('/')); } };
walk('src');
for (const f of files) {
  const ast = parse(readFileSync(f, 'utf8'), { ecmaVersion: 'latest', sourceType: 'module' });
  simple(ast, {
    TaggedTemplateExpression(n) {
      if (n.tag.type !== 'Identifier' || n.tag.name !== 't') return;
      const q = n.quasi.quasis.map(x => x.value.cooked);
      add(q.reduce((a, s, i) => a + s + (i < q.length - 1 ? `{${i}}` : ''), ''), f);
    },
    CallExpression(n) {
      if (n.callee.type === 'Identifier' && n.callee.name === 't' && n.arguments[0]?.type === 'Literal') add(n.arguments[0].value, f);
    },
  });
}

// Дані: усі українські рядки, крім художніх текстів LLM (їх перекладає окремий крок) і промптів арту.
const SKIP = new Set(['texts.uk.json', 'texts.en.json', 'art.json']);
const walkJson = (o, from) => {
  if (typeof o === 'string') add(o, from);
  else if (Array.isArray(o)) o.forEach(v => walkJson(v, from));
  else if (o && typeof o === 'object') for (const v of Object.values(o)) walkJson(v, from);
};
for (const f of readdirSync('data')) if (f.endsWith('.json') && !SKIP.has(f)) walkJson(JSON.parse(readFileSync(join('data', f), 'utf8')), 'data/' + f);

const out = [...keys].map(([k, from]) => ({ k, from }));
writeFileSync('tools/i18n/keys.json', JSON.stringify(out, null, 1));
console.log(`Ключів: ${out.length} (код: ${out.filter(x => x.from.startsWith('src')).length}, дані: ${out.filter(x => x.from.startsWith('data')).length})`);
