// Service worker офлайн-версії. Шаблон: vite.config.js підставляє версію і список файлів збірки.
const CACHE = 'ashfog-__VERSION__';
const FILES = __FILES__;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('ashfog-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Спершу кеш, інакше мережа. ignoreSearch — арт має ?v=…; ignoreVary — сервер може дати «Vary: Origin»,
// а модульні скрипти (crossorigin) шлють Origin, тож без цього кеш їх не знайде.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE)
    .then(c => c.match(e.request, { ignoreSearch: true, ignoreVary: true }))
    .then(r => r || fetch(e.request)));
});
