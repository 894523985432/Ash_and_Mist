// Рендер екранів, модалка, тости і делегування кліків.
import { S } from '../state.js';
import { setUI } from '../hooks.js';
import { save } from '../save.js';
import { loadArt } from '../art.js';
import { topBar, tabs } from './common.js';
import { vBase } from './base.js';
import { vMap } from './map.js';
import { vLoc } from './loc.js';
import { vFight } from './fight.js';
import { vGear } from './gear.js';
import { vMenu } from './menu.js';
import { settings, onSettings, FONT_SIZES, ANIM } from '../settings.js';
import { vOver } from './over.js';
import { tutorialCard } from './tutorial.js';

const $ = s => document.querySelector(s);
const VIEWS = { base: vBase, map: vMap, loc: vLoc, fight: vFight, gear: vGear, menu: vMenu, art: vMenu, over: vOver };
let EV = null;

export function render() {
  const v = VIEWS[S.screen] || vBase;
  $('#app').innerHTML = topBar() + tutorialCard(S.screen) + v() + tabs();
  const ai = $('#artin'); if (ai) ai.onchange = e => loadArt(e.target.files);
  save();
}

export function go(s) { S.screen = s; render(); window.scrollTo(0, 0); }

export function showEvent(ev) { EV = ev; renderModal(); }

function renderModal() {
  const m = $('#modal'); if (!EV) { m.innerHTML = ''; return; }
  m.innerHTML = `<div class="modal"><div class="card"><div style="font-size:42px;text-align:center">${EV.e}</div><h2 style="text-align:center">${EV.t}</h2><div style="margin-bottom:12px">${EV.txt}</div><div class="row" style="flex-direction:column;align-items:stretch">${EV.b.map((b, i) => `<button class="${i === 0 ? 'pri' : ''}" data-evb="${i}">${b[0]}</button>`).join('')}</div></div></div>`;
  m.querySelectorAll('[data-evb]').forEach(btn => btn.onclick = () => {
    const f = EV.b[+btn.dataset.evb][1]; EV = null; renderModal(); if (f) f(); render();
  });
}

export function toast(t) {
  const d = document.createElement('div'); d.className = 'toast'; d.textContent = t;
  document.body.appendChild(d); setTimeout(() => d.remove(), Math.max(1800, t.length * 55));
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
  setUI({ render, go, showEvent, toast, shake });
  onSettings(applySettings); applySettings(settings);
  // Повзунки налаштувань (гучність): data-set="ключ"
  $('#app').addEventListener('input', e => {
    const k = e.target.dataset?.set; if (!k) return;
    actions.setting(`${k}:${e.target.value}`, true);
    const b = e.target.nextElementSibling; if (b) b.textContent = Math.round(e.target.value * 100) + '%';
  });
  $('#app').addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    const f = actions[b.dataset.act];
    if (f) f(b.dataset.arg);
    else console.warn('Невідома дія:', b.dataset.act);
  });
}
