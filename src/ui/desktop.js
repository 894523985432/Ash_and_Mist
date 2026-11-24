// Широкий екран (ПК, монітор від 1100 px): три колонки, гарячі клавіші, підказки при наведенні.
// Ліва колонка — герой, шкали, ресурси з добовим прогнозом, навігація; центр — поточний екран;
// права — сюжет, навчання, журнал (у бою — хід бою).
import { RES, CODEX } from '../data.js';
import { S, maxHP, maxSily, pDef, xpNeed, bagCap } from '../state.js';
import { season, event, dayModifiers } from '../events.js';
import { dailyConsume } from '../day.js';
import { forecast } from '../economy.js';
import { act, artBox } from './common.js';
import { storyCard } from './base.js';
import { tutorialCard } from './tutorial.js';
import { t, tr } from '../i18n.js';

const MQ = typeof window !== 'undefined' ? window.matchMedia('(min-width: 1100px) and (min-height: 600px)') : null;
export const isWide = () => !!MQ?.matches;
export const onWideChange = f => MQ?.addEventListener('change', f);

const NAV = [['base', '🏠', t('База'), 'B'], ['map', '🗺️', t('Карта'), 'M'], ['gear', '🎒', t('Спорядження'), 'G'], ['online', '🌐', t('Онлайн'), 'O'], ['menu', '☰', t('Меню'), 'Esc']];
const kbd = k => t`<kbd>${k}</kbd>`;

function bar(cls, v, max, label) {
  return t`<div class="dbar ${cls}"><div class="dbar-l"><span>${label}</span><b>${Math.max(0, v)}/${max}</b></div><div class="bar"><i style="width:${Math.max(0, Math.min(100, v / max * 100))}%"></i></div></div>`;
}

/** Підказка для ресурсу: опис і прогноз на добу. */
function resTip(k, f) {
  const C = CODEX.res[k] || {}, i = f.in[k] || 0, o = f.out[k] || 0;
  return t`${tr(RES[k][1])}: ${tr(C.d || '')}${i || o ? t` · ${t('за добу')} +${i} / −${o}` : ''}`.replace(/"/g, '&quot;');
}

export function sideLeft() {
  const mods = dayModifiers(), f = forecast(dailyConsume(mods), mods), r = S.res;
  const ev = event();
  const groups = CODEX.groups.map(g => t`<div class="dres-g"><div class="dres-h">${tr(g.n)}</div>${g.res.map(k => {
    const net = (f.in[k] || 0) - (f.out[k] || 0), low = ['water', 'food', 'heat'].includes(k) && r[k] < 20;
    return t`<button class="dres${low ? ' low' : ''}" ${act('resInfo', k)} data-tip="${resTip(k, f)}"><span class="e">${RES[k][0]}</span><span class="n">${tr(RES[k][1])}</span><b>${r[k]}</b>${net ? t`<i class="${net < 0 ? 'bad' : 'ok'}">${net > 0 ? '+' : '−'}${Math.abs(net)}</i>` : '<i></i>'}</button>`;
  }).join('')}</div>`).join('');
  const nav = NAV.map(([k, e, n, key]) => t`<button class="dnav${S.screen === k || (k === 'menu' && S.screen === 'art') ? ' on' : ''}" ${act('go', k)} ${S.trip && k !== 'menu' ? 'disabled' : ''}><span>${e} ${tr(n)}</span>${kbd(key)}</button>`).join('');
  return t`<aside class="side side-l">
    <div class="hero">${artBox('hero', '🧑', 'sq')}<div><b>${t`День ${S.day}`}</b><div class="mut">${t`Рівень ${S.lvl}`}</div></div></div>
    <div class="row dchips"><span class="chip tap" ${act('info', 'season')} data-tip="${tr(season().d).replace(/"/g, '&quot;')}">${season().e} ${tr(season().n)}</span>${ev ? t`<span class="chip ev tap" ${act('info', 'event')} data-tip="${tr(ev.d).replace(/"/g, '&quot;')}">${ev.e} ${tr(ev.n)}</span>` : ''}</div>
    ${bar('hp', S.hp, maxHP(), '❤️ HP')}
    ${bar('sily', S.sily, maxSily(), t('⚡ Сили'))}
    ${bar('xp', S.xp, xpNeed(), t`⭐ Досвід`)}
    <div class="mut dstat"><span>🛡️ ${t('Захист')} ${pDef()}</span>${S.trip ? t`<span>🎒 ${t('Рюкзак')} ${Object.values(S.trip.bag).reduce((a, b) => a + b, 0)}/${bagCap()}</span>` : ''}</div>
    <div class="dres-all">${groups}</div>
    <nav class="dnavs">${nav}</nav>
  </aside>`;
}

export function sideRight() {
  const log = S.screen === 'fight' && S.fight
    ? t`<div class="card"><h2>${t('Хід бою')}</h2><div class="log">${S.fight.flog.map(l => t`<div>${l}</div>`).join('')}</div></div>`
    : t`<div class="card dlog"><h2>${t('Журнал')}</h2><div class="log">${S.log.map(l => t`<div>${l}</div>`).join('')}</div></div>`;
  return t`<aside class="side side-r">${tutorialCard(S.screen)}${storyCard()}${log}${keysHelp()}</aside>`;
}

function keysHelp() {
  const K = {
    base: [['Z', t('спати')], ['E', t('поїсти')], ['1–4', t('розділи бази')]],
    map: [['R', t('розвідка')], ['1–9', t('вирушити на локацію')]],
    loc: [['Space', t('обшукати')], ['H', t('додому')], ['Q', t('аптечка')]],
    fight: [['1–5', t('зіграти карту')], ['Q', t('блок')], ['W', t('супер')], ['F', t('втекти')], ['Space', t('кінець ходу')]],
  }[S.screen] || [];
  if (!K.length) return '';
  return t`<div class="card dkeys"><h2>${t('Клавіші')}</h2>${K.map(([k, d]) => t`<div>${kbd(k)} ${d}</div>`).join('')}<div>${kbd('Enter')} ${t('кнопка у вікні')}</div><div>${kbd('F11')} ${t('повний екран')}</div></div>`;
}

/* ---------- гарячі клавіші ---------- */
const click = sel => { const b = document.querySelector(sel); if (b && !b.disabled) { b.click(); return true; } return false; };

export function onKey(e, actions) {
  if (e.ctrlKey || e.altKey || e.metaKey || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key, code = e.code;
  // Вікно події: Enter/Space — перша кнопка, цифри — за номером, Esc — остання (зазвичай «Лишити»/«Скасувати»)
  const modal = document.querySelector('#modal [data-evb]');
  if (modal) {
    const btns = [...document.querySelectorAll('#modal [data-evb]')];
    const n = /^Digit(\d)$/.exec(code)?.[1];
    if (k === 'Enter' || k === ' ') { btns[0].click(); e.preventDefault(); }
    else if (n && btns[+n - 1]) { btns[+n - 1].click(); e.preventDefault(); }
    else if (k === 'Escape' && btns.length > 1) { btns.at(-1).click(); e.preventDefault(); }
    return;
  }
  const digit = /^Digit(\d)$/.exec(code)?.[1];
  const scr = S.screen;
  let done = false;
  if (scr === 'fight') {
    if (digit) done = click(t`[data-act=playCard][data-arg="${+digit - 1}"]`);
    else if (code === 'KeyQ') done = click('[data-act=blockAct]');
    else if (code === 'KeyW') done = click('[data-act=superAct]');
    else if (code === 'KeyF') done = click('[data-act=flee]');
    else if (k === ' ' || k === 'Enter') done = click('[data-act=endTurn]');
  } else if (scr === 'loc') {
    if (k === ' ' || code === 'KeyS') done = click('[data-act=search]');
    else if (code === 'KeyH') done = click('[data-act=goHome]');
    else if (code === 'KeyQ') done = click('[data-act=heal]');
  } else {
    if (code === 'KeyB') { actions.go('base'); done = true; }
    else if (code === 'KeyM') { actions.go('map'); done = true; }
    else if (code === 'KeyG') { actions.go('gear'); done = true; }
    else if (code === 'KeyO') { actions.go('online'); done = true; }
    else if (k === 'Escape') { actions.go(scr === 'menu' ? 'base' : 'menu'); done = true; }
    else if (scr === 'base' && code === 'KeyZ') done = click('[data-act=sleep]');
    else if (scr === 'base' && code === 'KeyE') done = click('[data-act=eat]');
    else if (scr === 'base' && digit) done = click(t`.seg [data-act=baseTab]:nth-child(${digit})`);
    else if (scr === 'map' && code === 'KeyR') done = click('[data-act=scout]');
    else if (scr === 'map' && digit) done = clickNth('[data-act=goTo]', +digit - 1);
  }
  if (done) e.preventDefault();
}
const clickNth = (sel, i) => { const b = document.querySelectorAll(sel)[i]; if (b && !b.disabled) { b.click(); return true; } return false; };

/* ---------- підказки при наведенні ---------- */
export function initTooltips() {
  if (!window.matchMedia('(hover: hover)').matches) return;
  const tip = document.createElement('div'); tip.className = 'dtip'; tip.hidden = true; document.body.appendChild(tip);
  let cur = null;
  document.addEventListener('mouseover', e => {
    const el = e.target.closest?.('[data-tip]');
    if (el === cur) return; cur = el;
    if (!el) { tip.hidden = true; return; }
    tip.textContent = el.dataset.tip; tip.hidden = false;
    const r = el.getBoundingClientRect(), w = Math.min(320, window.innerWidth - 24);
    tip.style.maxWidth = w + 'px';
    const left = Math.min(window.innerWidth - w - 12, Math.max(12, r.left));
    const top = r.bottom + 8 + tip.offsetHeight > window.innerHeight ? r.top - tip.offsetHeight - 8 : r.bottom + 8;
    tip.style.left = left + 'px'; tip.style.top = top + 'px';
  });
  document.addEventListener('scroll', () => { tip.hidden = true; cur = null; }, true);
}
