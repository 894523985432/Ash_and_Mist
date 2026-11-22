import { ART_DATA } from '../data.js';
import { artKeys, artSource } from '../art.js';
import { act } from './common.js';

export function vArt() {
  const keys = artKeys(), have = keys.filter(([k]) => artSource(k)).length;
  const icon = k => ({ file: '✅', upload: '📤' }[artSource(k)] || '⬜');
  return `<div class="card"><h2>🎨 Арт · ${have}/${keys.length}</h2>
  <div class="mut">Арт генерується одною командою (ComfyUI має бути запущений):</div>
  <textarea rows="1" readonly>python tools/art/generate.py</textarea>
  <div class="mut" style="margin-top:6px">Файли лягають у <b>public/art/</b>, і гра підхоплює їх сама. ✅ — файл із public/art, 📤 — завантажено вручну (перекриває файл), ⬜ — поки емодзі.</div>
  <h3>Ручне завантаження для проб</h3>
  <div class="mut">Назви файли ключами зі списку (напр. <b>loc_gas.png</b>) — зберігається лише в цьому браузері.</div>
  <div class="row" style="margin:10px 0"><input type="file" id="artin" accept="image/*" multiple><button class="sm" ${act('clearArt')}>Прибрати завантажене</button></div>
  <div class="mut">Спільний стиль:</div><textarea rows="3" readonly>${ART_DATA.style}</textarea>
  <h3>Ключі та описи</h3>${keys.map(([k, p]) => `<div class="item" style="margin-bottom:6px">${icon(k)} <b>${k}</b><div class="mut">${p}</div></div>`).join('')}</div>`;
}
