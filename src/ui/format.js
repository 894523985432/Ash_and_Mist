// Рядкові форматери (без DOM) — ними користуються і логіка, і екрани.
import { WPN, ARM, RAR } from '../data.js';

export function itemHTML(it) {
  const R = RAR[it.rar];
  if (it.k === 'w') return `<b>${WPN[it.type].e} ${WPN[it.type].n}</b> <span class="pill" style="color:${R.col};border-color:${R.col}">${R.n}</span><br>🗡️ ${it.dmg} шкоди · ⚡${it.ap} ОД<br><span class="mut">${WPN[it.type].td}</span>`;
  return `<b>${ARM[it.type].e} ${ARM[it.type].n}</b> <span class="pill" style="color:${R.col};border-color:${R.col}">${R.n}</span><br>🛡️ +${it.def} захисту${it.hp ? ` · ❤️ +${it.hp} HP` : ''}`;
}
