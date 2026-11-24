// Рендер екранів, модалка, тости і делегування кліків.
import { S } from '../state.js';
import { setUI } from '../hooks.js';
import { save } from '../save.js';
import { storyCheck } from '../story.js';
import { loadArt } from '../art.js';
import { topBar, tabs, artBox } from './common.js';
import { artKey } from '../art.js';
import { vBase } from './base.js';
import { vMap } from './map.js';
import { vLoc } from './loc.js';
import { vFight } from './fight.js';
import { vGear } from './gear.js';
import { vMenu } from './menu.js';
import { vOnline } from './online.js';
import { settings, onSettings, FONT_SIZES, ANIM } from '../settings.js';
import { sfx, playMusic, musicFor } from '../audio.js';
import { vOver } from './over.js';
import { tutorialCard } from './tutorial.js';
import { t } from '../i18n.js';
import { isWide, onWideChange, sideLeft, sideRight, onKey, initTooltips } from './desktop.js';

const $ = s => document.querySelector(s);
const VIEWS = { base: vBase, map: vMap, loc: vLoc, fight: vFight, gear: vGear, menu: vMenu, art: vMenu, over: vOver, online: vOnline };
let EV = null;
const EVQ = []; // черга вікон: нове не перекриває вже відкрите

export function render() {
  const v = VIEWS[S.screen] || vBase;
  // Поля вводу з id переживають перемальовування (живий чат не стирає недописане)
  const keep = {}, focus = document.activeElement?.id, sel = document.activeElement?.selectionStart;
  document.querySelectorAll('#app input[id], #app textarea[id]').forEach(el => { if (el.type !== 'file') keep[el.id] = el.value; });
  const wide = isWide(), app = $('#app');
  app.classList.toggle('wide', wide); document.documentElement.classList.toggle('wide', wide);
  app.innerHTML = wide
    ? sideLeft() + t`<main class="dmain" data-screen="${S.screen}">${v()}</main>` + sideRight()
    : topBar() + tutorialCard(S.screen) + v() + tabs();
  for (const id in keep) { const el = document.getElementById(id); if (el && el.type !== 'password') el.value = keep[id]; else if (el && el.type === 'password' && keep[id]) el.value = keep[id]; }
  if (focus) { const el = document.getElementById(focus); if (el) { el.focus(); try { el.setSelectionRange(sel, sel); } catch (e) {} } }
  const msgs = $('#msgs'); if (msgs) msgs.scrollTop = msgs.scrollHeight;
  playMusic(musicFor(S.screen, S));
  const ai = $('#artin'); if (ai) ai.onchange = e => loadArt(e.target.files);
  save();
}

export function go(s) {
  const changed = S.screen !== s;
  S.screen = s; render(); window.scrollTo(0, 0);
  if (changed && ANIM[settings.anim]) { const a = $('#app'); a.classList.remove('enter'); void a.offsetWidth; a.classList.add('enter'); setTimeout(() => a.classList.remove('enter'), 400); }
}

export function showEvent(ev) { if (EV) EVQ.push(ev); else { EV = ev; renderModal(); } }

function renderModal() {
  const m = $('#modal'); if (!EV) { m.innerHTML = ''; return; }
  m.innerHTML = t`<div class="modal"><div class="card">${EV.art && artKey(EV.art) ? artBox(EV.art, EV.e, 'sq evart') : t`<div style="font-size:42px;text-align:center">${EV.e}</div>`}<h2 style="text-align:center">${EV.t}</h2><div style="margin-bottom:12px">${EV.txt}</div><div class="row" style="flex-direction:column;align-items:stretch">${EV.b.map((b, i) => t`<button class="${i === 0 ? 'pri' : ''}" data-evb="${i}">${b[0]}</button>`).join('')}</div></div></div>`;
  m.querySelectorAll('[data-evb]').forEach(btn => btn.onclick = () => {
    const f = EV.b[+btn.dataset.evb][1]; EV = null; if (f) f(); if (!EV && EVQ.length) EV = EVQ.shift(); renderModal(); storyCheck(); render();
  });
}

export function toast(msg) {
  const d = document.createElement('div'); d.className = 'toast'; d.textContent = msg;
  document.body.appendChild(d); setTimeout(() => d.remove(), Math.max(1800, msg.length * 55));
}

function shake() {
  if (settings.vibro) try { navigator.vibrate?.(60); } catch (e) {}
  if (!ANIM[settings.anim]) return;
  const a = $('#app'); a.classList.add('dmg'); setTimeout(() => $('#app')?.classList.remove('dmg'), 300 * ANIM[settings.anim]);
}

/** Розмір шрифту й швидкість анімацій — через CSS-змінні на <html>. */
function applySettings(s) {
  const r = document.documentElement;
  r.style.setProperty('--zoom', (FONT_SIZES[s.font] || 15) / 15);
  r.style.setProperty('--anim', ANIM[s.anim] ?? 1);
  r.classList.toggle('noanim', !ANIM[s.anim]);
  r.lang = s.lang;
}

/** Підключає UI до логіки і вішає один обробник кліків на всі кнопки з data-act. */
export function mountUI(actions) {
  setUI({ render, go, showEvent, toast, shake, sfx });
  onSettings(applySettings); applySettings(settings);
  // ПК: гарячі клавіші, підказки при наведенні, перебудова при зміні ширини вікна
  document.addEventListener('keydown', e => { onKey(e, actions); });
  initTooltips(); onWideChange(() => render());
  if (window.desktop) document.documentElement.classList.add('desktop-app');
  // Повзунки налаштувань (гучність): data-set="ключ"
  $('#app').addEventListener('input', e => {
    const k = e.target.dataset?.set; if (!k) return;
    actions.setting(t`${k}:${e.target.value}`, true);
    const b = e.target.nextElementSibling; if (b) b.textContent = Math.round(e.target.value * 100) + '%';
  });
  $('#app').addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    const f = actions[b.dataset.act];
    if (f) { sfx('click'); f(b.dataset.arg); storyCheck(); }
    else console.warn(t('Невідома дія:'), b.dataset.act);
  });
}
