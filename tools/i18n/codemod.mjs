// Одноразова (і повторювана) автозаміна: загортає українські рядки в src/ у t`…` / t('…') і додає import.
//   node tools/i18n/codemod.mjs [--dry]
// Уже загорнуті (t`…`, t('…')), ключі обʼєктів та імпорти не чіпає.
import { parse } from 'acorn';
import { ancestor } from 'acorn-walk';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';

const CYR = /[А-Яа-яІіЇїЄєҐґ]/;
const DRY = process.argv.includes('--dry');
// У src/ui/ загортаємо ще й шаблони без українського тексту, але з підстановками: тоді t перекладе підставлені назви з даних.
const UI_ALL = f => f.startsWith('src/ui/');
const SKIP = new Set(['src/i18n.js', 'src/sw.template.js']);
const files = [];
const walk = d => { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') && files.push(p.split('\\').join('/')); } };
walk('src');

let total = 0;
for (const f of files) {
  if (SKIP.has(f)) continue;
  const src = readFileSync(f, 'utf8');
  const ast = parse(src, { ecmaVersion: 'latest', sourceType: 'module' });
  const edits = []; // [pos, insertText] або [start, end, replace]
  const isT = n => n && n.type === 'Identifier' && n.name === 't';
  ancestor(ast, {
    Literal(n, _, anc) {
      if (typeof n.value !== 'string' || !CYR.test(n.value)) return;
      const p = anc[anc.length - 2];
      if (p.type === 'Property' && p.key === n && !p.computed) return;
      if (p.type === 'ImportDeclaration' || p.type === 'ExportNamedDeclaration') return;
      if (p.type === 'CallExpression' && isT(p.callee)) return;
      edits.push([n.start, 't(']); edits.push([n.end, ')']);
    },
    TemplateLiteral(n, _, anc) {
      const p = anc[anc.length - 2];
      if (!n.quasis.some(q => CYR.test(q.value.cooked ?? q.value.raw)) && !(UI_ALL(f) && n.expressions.length)) return;
      if (p.type === 'TaggedTemplateExpression') return;
      edits.push([n.start, 't']);
    },
  });
  if (!edits.length) continue;
  let out = src;
  for (const [pos, txt] of edits.sort((a, b) => b[0] - a[0])) out = out.slice(0, pos) + txt + out.slice(pos);
  if (!/import \{[^}]*\bt\b[^}]*\} from '[^']*i18n\.js'/.test(out)) {
    let rel = relative(dirname(f), 'src/i18n.js').split('\\').join('/'); if (!rel.startsWith('.')) rel = './' + rel;
    const m = [...out.matchAll(/^import .*;$/gm)].pop();
    const at = m ? m.index + m[0].length : 0;
    out = out.slice(0, at) + `\nimport { t } from '${rel}';` + out.slice(at);
  }
  total += edits.filter(e => e[1] !== ')').length;
  console.log(`${f}: ${edits.filter(e => e[1] !== ')').length}`);
  if (!DRY) writeFileSync(f, out);
}
console.log('Усього загорнуто:', total);
