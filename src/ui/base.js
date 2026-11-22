import { BLD, BAL, RARE, PETS, RES } from '../data.js';
import { S, canPay, bl } from '../state.js';
import { dailyConsumeText } from '../day.js';
import { dayModifiers, offerText, season } from '../events.js';
import { bldCostNow, missingNeeds, bldName, repairCost, heatMult, isAdult, petName, petMaxHp, companion } from '../economy.js';
import { act, dis, artBox, costHTML } from './common.js';

/** Як виглядає база: залежить від суми рівнів будівель (balance.baseLooks). */
export function baseLook() {
  const sum = Object.values(S.bld).reduce((a, b) => a + b, 0);
  return { sum, ...[...BAL.baseLooks].reverse().find(l => sum >= l.min) };
}
export const trophyTotal = () => Object.keys(RARE).length;
export const trophyCount = () => Object.values(RARE).filter(r => S.collection?.[r.trophy]).length;

const TABS = [['home', '🏠', 'Дім'], ['build', '🔨', 'Будівництво'], ['shop', '🔧', 'Майстерня'], ['pets', '🐾', 'Тварини']];

export function vBase() {
  const tab = TABS.some(t => t[0] === S.baseTab) ? S.baseTab : 'home';
  const broken = Object.keys(S.broken || {}).length;
  const badge = { build: broken ? `<i class="badge">${broken}</i>` : '', shop: S.job ? '<i class="badge">⏳</i>' : '', pets: S.pets?.length ? `<i class="badge">${S.pets.length}</i>` : '' };
  const seg = `<div class="seg">${TABS.map(([k, e, n]) => `<button class="${tab === k ? 'on' : ''}" ${act('baseTab', k)}>${e} ${n}${badge[k] || ''}</button>`).join('')}</div>`;
  return seg + ({ home: vHome, build: vBuild, shop: vShop, pets: vPets }[tab])();
}

function vHome() {
  const A = BAL.actions, E = A.eat, D = BAL.day, look = baseLook(), fullSet = trophyCount() >= trophyTotal();
  const caravan = S.caravan ? `<div class="card"><h2>🐪 Караван біля бази</h2><div class="row col">${S.caravan.map((o, i) =>
    `<button ${act('caravanTrade', i)} ${dis(!o.done && canPay(o.give))}>${o.done ? '✔ ' : ''}${offerText(o)}</button>`).join('')}</div><div class="mut" style="margin-top:6px">Караван піде вранці.</div></div>` : '';
  const hm = heatMult();
  return `${artBox(BAL.baseLooks.filter(l => l.min <= look.min).map(l => l.key).reverse(), look.e, '', `${look.n} · покращень: ${look.sum}${fullSet ? ' · 🏆 трофейна стіна' : ''}`)}
  ${fullSet ? `<div class="card" style="margin-top:10px"><h2>🏆 Трофейна стіна</h2>${artBox('base_trophy', '🏆', 'sq', 'Уся колекція зібрана')}<div class="mut" style="margin-top:6px">Ти зібрав усі ${trophyTotal()} трофеїв рідкісних істот. Вижилі про це пліткують.</div></div>` : ''}
  ${caravan}
  <div class="card" style="margin-top:10px"><h2>Дім</h2>
    <div class="row">
      <button ${act('eat')} ${dis(S.eaten < E.max && canPay(E.cost))}>🍖 Поїсти досхочу (+${E.sily}⚡) ${costHTML(E.cost)} <span class="mut">${E.max - S.eaten}/${E.max}</span></button>
      <button ${act('heal')} ${dis(S.res.med)}>💊 Аптечка</button>
      <button ${act('stim')} ${dis(S.res.stim)}>☕ Стимулятор (+${A.stim.sily}⚡)</button>
      <button class="pri" ${act('sleep')}>🌙 Спати (кінець дня)</button>
    </div>
    <div class="mut" style="margin-top:6px">Щодоби зараз: ${dailyConsumeText(dayModifiers())}${hm > 1 ? ` (${season().n.toLowerCase()}: тепла ×${String(hm).replace('.', ',')})` : ''}. Нестача → −${D.shortageHp} HP (і ще −${D.shortageHpGrowth} за кожен наступний день поспіль)${D.noHealOnShortage ? ', сон не лікує' : ''}. Брак тепла добирається деревом із пічки.</div>
  </div>
  <div class="card"><h2>Журнал</h2><div class="log">${S.log.map(l => `<div>${l}</div>`).join('')}</div></div>`;
}

/** Що будівля дає на поточному/наступному рівні — коротко. */
function effect(k, l) {
  const B = BLD[k]; if (!l) return '';
  if (k === 'gen') return `🔋+${B.energy[l - 1]} за ⛽${String(B.fuel[l - 1]).replace('.', ',')}`;
  if (k === 'solar') return `🔋+${Math.round(B.energy[l - 1] * (season().solarMult || 1))}`;
  if (k === 'heater') return `🔋${B.use[l - 1]} → 🔥+${B.heat[l - 1]}`;
  if (k === 'garden') return `🍖+${B.prod.food * l}` + (l >= B.upkeep.fromLvl ? ` (бере 🔋${l - 1} 🔥${l - 1})` : '');
  if (B.prod) return Object.entries(B.prod).map(([r, v]) => `${RES[r][0]}+${v * l}`).join(' ');
  if (k === 'bed') return `⚡+${B.sily * l}`;
  if (k === 'wall') return `нальотів −${Math.round(B.raidReduce * l * 100)}%`;
  return '';
}

function vBuild() {
  const A = BAL.actions, hm = heatMult();
  const cards = Object.entries(BLD).map(([k, B]) => {
    const l = S.bld[k], mx = l >= B.max, br = S.broken?.[k], need = missingNeeds(k);
    let btn;
    if (br) { const rc = repairCost(k); btn = `<button class="sm warnb" ${act('repair', k)} ${dis(canPay(rc) && S.sily >= BAL.wear.repairSily)}>🛠️ Полагодити: ${costHTML(rc, BAL.wear.repairSily)}</button>`; }
    else if (mx) btn = '<div class="mut">✔ максимум</div>';
    else if (need.length) btn = `<div class="mut">🔒 Потрібно: <span class="miss">${need.join(', ')}</span></div>`;
    else { const c = bldCostNow(k, l); btn = `<button class="sm" ${act('build', k)} ${dis(canPay(c) && S.sily >= A.buildSily)}>${l ? 'Покращити' : 'Збудувати'}: ${costHTML(c, A.buildSily)}</button>`; }
    const nextName = !mx && B.names && l > 0 ? ` → <span class="mut">${B.names[l]}</span>` : '';
    const now = effect(k, l), nxt = !mx && !br ? effect(k, l + 1) : '';
    return `<div class="item${br ? ' broken' : ''}"><b>${B.e} ${bldName(k)}</b> <span class="mut">рів. ${l}/${B.max}</span>${br ? ' <span class="pill bad">зламано</span>' : ''}${nextName}
      <div class="mut">${B.d}</div>
      ${now || nxt ? `<div class="eff">${now ? `Зараз: ${now}` : ''}${now && nxt ? ' · ' : ''}${nxt ? `далі: ${nxt}` : ''}</div>` : ''}
      <div style="margin-top:6px">${btn}</div></div>`;
  }).join('');
  return `<div class="card"><h2>🔨 Будівництво</h2><div class="mut">Будівництво й ремонт — по ${A.buildSily}⚡ і ${BAL.wear.repairSily}⚡. Червоним — чого бракує.${hm > 1 ? ` Зараз ${season().n.toLowerCase()}: тепла на покращення треба ×${String(hm).replace('.', ',')}.` : ''} Будівлі зношуються і часом ламаються вночі.</div>
  <div class="grid one" style="margin-top:8px">${cards}</div></div>`;
}

function vShop() {
  const A = BAL.actions, C = BAL.craft;
  if (!S.bld.shop) return `<div class="card"><h2>🔧 Майстерня</h2><div class="mut">Майстерні ще немає. Збудуй її в розділі «🔨 Будівництво», щоб робити зброю та броню.</div></div>`;
  if (S.broken?.shop) return `<div class="card"><h2>🔧 Майстерня</h2><div class="mut"><span class="miss">Майстерня зламана.</span> Полагодь її в розділі «🔨 Будівництво».${S.job ? ' Робота стоїть.' : ''}</div></div>`;
  const job = S.job ? `<div class="sys">⏳ У роботі: ${S.job.kind === 'w' ? 'зброя' : 'броня'} (${BAL.rarity[S.job.rar].n.toLowerCase()}) — ще ${S.job.left} дн.</div>` : '';
  const lv = Math.min(S.bld.shop, 2), RR = C.rarityByShopLvl[lv];
  const days = r => C.days[r] ? `${C.days[r]} дн.` : 'одразу';
  return `<div class="card"><h2>🔧 Майстерня · рів. ${S.bld.shop}</h2>${job}
  <div class="row"><button ${act('craft', 'w')} ${dis(!S.job && canPay(C.weapon) && S.sily >= A.craftSily)}>🗡️ Зброя: ${costHTML(C.weapon, A.craftSily)}</button>
  <button ${act('craft', 'a')} ${dis(!S.job && canPay(C.armor) && S.sily >= A.craftSily)}>🛡️ Броня: ${costHTML(C.armor, A.craftSily)}</button></div>
  <div class="mut" style="margin-top:6px">Зараз виходить: ${BAL.rarity[RR.main].n.toLowerCase()} (${Math.round(RR.mainChance * 100)}%, ${days(RR.main)}) або ${BAL.rarity[RR.alt].n.toLowerCase()} (${days(RR.alt)}). Рів. 2 — краща. Поки річ робиться, нову не почати.</div></div>`;
}

function vPets() {
  const P = BAL.pets, list = S.pets || [];
  if (!list.length) return `<div class="card"><h2>🐾 Тварини</h2><div class="mut">Поки нікого. Під час обшуку іноді трапляються малі тварини — їх можна забрати додому. Доросла тварина ходить з тобою, бʼється і бере на себе частину ударів.</div>
    <div class="grid" style="margin-top:8px">${Object.values(PETS).map(p => `<div class="item">${p.e} <b>${p.n}</b><div class="mut">${p.d}</div></div>`).join('')}</div></div>`;
  const comp = companion();
  return `<div class="card"><h2>🐾 Тварини ${list.length}/${P.max}</h2><div class="mut">Іде з тобою одна доросла здорова тварина. Поранена лишається вдома й одужує (+${Math.round(P.healPctPerDay * 100)}% за день).</div>
  <div class="grid" style="margin-top:8px">${list.map(p => {
    const T = PETS[p.type], ad = isAdult(p), out = comp?.id === p.id;
    const st = p.hurt ? '<span class="pill bad">поранено, вдома</span>' : !ad ? `<span class="pill">росте: ${p.age}/${P.growDays} дн.</span>` : out ? '<span class="pill okb">йде з тобою</span>' : '<span class="pill">вдома</span>';
    return `<div class="item"><b>${T.e} ${petName(p)}</b> ${st}<div class="mut">${T.d}</div>
      <div class="row" style="margin:6px 0"><div class="bar"><i style="width:${p.hp / petMaxHp(p) * 100}%"></i></div><span class="mut">❤️ ${p.hp}/${petMaxHp(p)}</span></div>
      ${ad ? `<div class="mut">🗡️ ${T.atk + Math.floor(S.lvl / 2)} шкоди за хід</div>` : ''}
      <div class="row" style="margin-top:6px">${ad && !p.hurt ? `<button class="sm ${out ? 'pri' : ''}" ${act('petFollow', p.id)}>${out ? '✔ Бере з собою' : 'Брати з собою'}</button>` : ''}<button class="sm" ${act('petRelease', p.id)}>Відпустити</button></div></div>`;
  }).join('')}</div></div>`;
}
