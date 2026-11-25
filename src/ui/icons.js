// Іконки замість емодзі: спрайт <symbol> один раз на сторінці, ic('назва') — для розмітки,
// iconize(елемент) — замінює емодзі в текстах уже показаного HTML (атрибути, поля вводу й textarea не чіпає).
import { ICONS } from './icons.gen.js';
import { EMOJI, FALLBACK } from './icon-map.js';
import { MON, RARE, NPCS, PETS, LOCS, ARM } from '../data.js';

const norm = s => s.replace(/️/g, '');
const MAP = new Map(Object.entries(EMOJI).map(([e, v]) => [norm(e), v.split(' ')]));
const add = (list, name) => list.forEach(e => { if (e && !MAP.has(norm(e))) MAP.set(norm(e), [name]); });
add([...Object.values(MON), ...Object.values(RARE)].map(m => m.e), FALLBACK.monsters);
add([...NPCS.names, ...(NPCS.rivals || [])].map(p => p.e), FALLBACK.npcs);
add(Object.values(PETS).map(p => p.e), FALLBACK.pets);
add(LOCS.map(l => l.e), FALLBACK.locations);
add(Object.values(ARM).map(a => a.e), FALLBACK.armor);

const esc = ch => ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Довші послідовності (з ZWJ) — першими; варіаційний селектор U+FE0F необовʼязковий після кожного символу
const RE = new RegExp([...MAP.keys()].sort((a, b) => b.length - a.length).map(k => [...k].map(esc).join('️?') + '️?').join('|'), 'gu');

/** <svg> з іконкою: name — назва з набору, tone — відтінок (hp, sily, def, heat…). */
export const ic = (name, tone = '') => `<svg class="ic${tone ? ' ' + tone : ''}" aria-hidden="true"><use href="#i-${name}"/></svg>`;

/** Спрайт з усіма іконками — вставляється в <body> один раз. */
export function sprite() {
  return `<svg width="0" height="0" style="position:absolute" aria-hidden="true">${Object.entries(ICONS).map(([n, d]) =>
    `<symbol id="i-${n}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</symbol>`).join('')}</svg>`;
}

/** Іконка для емодзі (або null, якщо такого нема в наборі). */
export function emojiIcon(e) { const v = MAP.get(norm(e || '')); return v ? ic(v[0], v[1]) : null; }

const SKIP = /^(TEXTAREA|INPUT|SCRIPT|STYLE|OPTION|TITLE|svg)$/i;
const htmlEsc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Замінює емодзі в текстових вузлах елемента на іконки. */
export function iconize(root) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      for (let p = n.parentNode; p && p !== root; p = p.parentNode) if (SKIP.test(p.nodeName) || p.dataset?.noicon !== undefined) return NodeFilter.FILTER_REJECT;
      RE.lastIndex = 0;
      return RE.test(n.data) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    },
  });
  const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
  const tpl = document.createElement('template');
  for (const n of nodes) {
    tpl.innerHTML = htmlEsc(n.data).replace(RE, m => { const v = MAP.get(norm(m)); return v ? ic(v[0], v[1]) : m; });
    n.replaceWith(tpl.content);
  }
}
