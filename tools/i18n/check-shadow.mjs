// Перевірка: локальна змінна чи параметр з іменем t затіняє переклад t`…` — тоді t`…` упаде. Код виходу 1, якщо знайдено.
import { parse } from 'acorn';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
const files=[]; const w=d=>{for(const f of readdirSync(d)){const p=join(d,f); statSync(p).isDirectory()?w(p):p.endsWith('.js')&&files.push(p)}}; w('src');
for (const f of files) {
  const src=readFileSync(f,'utf8'); if(!/from '[^']*i18n\.js'/.test(src)) continue;
  const ast=parse(src,{ecmaVersion:'latest',sourceType:'module'});
  const hits=[];
  (function visit(n){ if(!n||typeof n.type!=='string')return;
    const params = (n.type.includes('Function')) ? n.params : [];
    for (const p of params) { const s=JSON.stringify(p); if (/"name":"t"/.test(s)) hits.push(src.slice(0,p.start).split('\n').length); }
    if (n.type==='VariableDeclarator' && n.id.type==='Identifier' && n.id.name==='t') hits.push(src.slice(0,n.start).split('\n').length);
    if (n.type==='VariableDeclarator' && n.id.type!=='Identifier' && /"name":"t"/.test(JSON.stringify(n.id))) hits.push(src.slice(0,n.start).split('\n').length);
    for (const k in n) { const v=n[k]; if (Array.isArray(v)) v.forEach(visit); else if (v&&typeof v.type==='string') visit(v); }
  })(ast);
  if (hits.length) { console.log('Змінна t затіняє переклад:', f, 'рядки', hits.join(',')); process.exitCode = 1; }
}
