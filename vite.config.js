import { defineConfig } from 'vite';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/** Після збірки пише dist/sw.js зі списком усіх файлів — їх кешуємо при встановленні PWA. */
function serviceWorker() {
  let outDir;
  return {
    name: 'ashfog-sw',
    apply: 'build',
    configResolved(c) { outDir = c.build.outDir; },
    closeBundle() {
      const files = [];
      const walk = d => { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : files.push(p); } };
      walk(outDir);
      const hash = createHash('sha1');
      const urls = files.filter(p => !p.endsWith('sw.js')).map(p => {
        hash.update(readFileSync(p));
        return './' + relative(outDir, p).split('\\').join('/');
      }).sort();
      const tpl = readFileSync('src/sw.template.js', 'utf8');
      const sw = tpl.replace('__VERSION__', hash.digest('hex').slice(0, 12)).replace('__FILES__', JSON.stringify(urls.map(u => (u === './index.html' ? './' : u))));
      writeFileSync(join(outDir, 'sw.js'), sw);
      console.log(`sw.js: ${urls.length} файлів у офлайн-кеші`);
    },
  };
}

export default defineConfig({
  base: './', // відносні шляхи — потрібні для Capacitor/APK
  build: { outDir: 'dist', target: 'es2022' },
  plugins: [serviceWorker()],
  define: { __APP_VERSION__: JSON.stringify(JSON.parse(readFileSync('package.json', 'utf8')).version) },
});
