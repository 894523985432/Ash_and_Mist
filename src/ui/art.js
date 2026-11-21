import { ART_DATA } from '../data.js';
import { ART, artKeys } from '../art.js';
import { act } from './common.js';

export function vArt() {
  return `<div class="card"><h2>🎨 Арт із ComfyUI</h2>
  <div class="mut">Назви файли ключами зі списку (напр. <b>loc_gas.png</b>, <b>mon_rat.webp</b>) і завантаж усі разом — гра сама підставить їх замість емодзі. Зберігається у браузері.</div>
  <div class="row" style="margin:10px 0"><input type="file" id="artin" accept="image/*" multiple><button class="sm" ${act('clearArt')}>Очистити арт</button></div>
  <div class="mut">Спільний стиль (додай на початок кожного промпта):</div><textarea rows="3" readonly>${ART_DATA.style}</textarea>
  <h3>Ключі та підказки</h3>${artKeys().map(([k, p]) => `<div class="item" style="margin-bottom:6px"><b>${k}</b> ${ART[k] ? '✅' : ''}<div class="mut">${p}</div></div>`).join('')}</div>`;
}
