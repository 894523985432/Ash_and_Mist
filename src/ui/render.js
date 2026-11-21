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
import { vArt } from './art.js';
import { vOver } from './over.js';

const $ = s => document.querySelector(s);
const VIEWS = { base: vBase, map: vMap, loc: vLoc, fight: vFight, gear: vGear, art: vArt, over: vOver };
let EV = null;

export function render() {
  const v = VIEWS[S.screen] || vBase;
  $('#app').innerHTML = topBar() + v() + tabs();
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
  document.body.appendChild(d); setTimeout(() => d.remove(), 1800);
}

function shake() {
  const a = $('#app'); a.classList.add('dmg'); setTimeout(() => $('#app')?.classList.remove('dmg'), 300);
}

/** Підключає UI до логіки і вішає один обробник кліків на всі кнопки з data-act. */
export function mountUI(actions) {
  setUI({ render, go, showEvent, toast, shake });
  $('#app').addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    const f = actions[b.dataset.act];
    if (f) f(b.dataset.arg);
    else console.warn('Невідома дія:', b.dataset.act);
  });
}
