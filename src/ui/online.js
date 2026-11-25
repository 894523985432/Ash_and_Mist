// Екран «Онлайн»: акаунт і хмара, друзі й дуелі, чат.
import { S } from '../state.js';
import { act, dis } from './common.js';
import { net, blocked } from '../online/net.js';
import { spareItems } from '../trade.js';
import { itemHTML } from './format.js';
import { t } from '../i18n.js';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const TABS = [['me', '👤', t('Профіль')], ['friends', '🤝', t('Друзі')], ['chat', '💬', t('Чат')]];

export function vOnline() {
  const tab = S.onlineTab || 'me';
  if (!net.user) return vLogin();
  const inc = net.friends.filter(f => f.incoming).length + net.trades.filter(x => x.to_id === net.user.id).length;
  const seg = t`<div class="seg">${TABS.map(([k, e, n]) => t`<button class="${tab === k || (k === 'friends' && tab === 'trade') ? 'on' : ''}" ${act('onlineTab', k)}>${e} ${t(n)}${k === 'friends' && inc ? t`<i class="badge">${inc}</i>` : ''}</button>`).join('')}</div>`;
  return seg + ({ me: vMe, friends: vFriends, chat: vChat, trade: vTrade }[tab] || vMe)();
}

function vLogin() {
  const reg = S.onlineTab === 'register';
  return t`<div class="card"><h2>🌐 Онлайн</h2>
    <div class="mut">Акаунт потрібен лише для гри з друзями: хмарні збереження (одна гра на телефоні, ПК і в браузері), дуелі, випадкові зустрічі з іншими гравцями у вилазках і чат. Без входу гра працює як і раніше.</div>
    ${net.status === 'offline' ? t`<div class="sys">Сервер недоступний: ${esc(net.error)}</div>` : ''}
    <div class="form">
      ${reg ? t`<label>Нік (бачать інші)<input id="on-nick" maxlength="20" autocomplete="nickname"></label>` : ''}
      <label>Пошта<input id="on-email" type="email" autocomplete="email"></label>
      <label>Пароль<input id="on-pass" type="password" autocomplete="${reg ? 'new-password' : 'current-password'}" minlength="6"></label>
      <div class="row">${reg
        ? t`<button class="pri" ${act('onlineSignUp')}>Зареєструватися</button><button ${act('onlineTab', 'login')}>У мене вже є акаунт</button>`
        : t`<button class="pri" ${act('onlineSignIn')}>Увійти</button><button ${act('onlineTab', 'register')}>Створити акаунт</button>`}</div>
    </div></div>`;
}

function vMe() {
  const p = net.profile || {}, st = { ok: t('☁️ на звʼязку'), offline: t('⚠️ без мережі'), off: '—' }[net.status] || net.status;
  return t`<div class="card"><h2>👤 ${esc(p.nick || '…')}</h2>
    <div class="stats"><div><b>${p.wins ?? 0}</b><span>перемог у дуелях</span></div><div><b>${p.losses ?? 0}</b><span>поразок</span></div><div><b>${net.friends.filter(f => f.status === 'accepted').length}</b><span>друзів</span></div></div>
    <div class="sys" style="margin-top:8px">Хмара: ${st}${net.lastSync ? t` · востаннє ${net.lastSync.toLocaleTimeString()}` : ''}</div>
    <div class="mut">Гра зберігається в хмару сама — щоразу, як закінчується день, і через кілька хвилин після дій. Перед запуском хмарна копія звіряється з цією: якщо на іншому пристрої ти пройшов далі, підтягнеться та.</div>
    ${net.status === 'offline' ? t`<div class="sys">Помилка: ${esc(net.error)}</div>` : ''}
    <div class="row" style="margin-top:8px">${net.status === 'offline' || !net.profile ? t`<button class="pri" ${act('onlineRetry')}>🔄 Підʼєднатися знову</button>` : ''}<button ${act('onlineSync')}>☁️ Зберегти зараз</button><button ${act('onlineSignOut')}>Вийти з акаунта</button></div></div>`;
}

function vFriends() {
  const F = net.friends;
  const row = f => t`<div class="slot"><b>${esc(f.nick)}</b> <span class="mut">рів. ${f.power ?? '?'} · день ${f.day ?? '?'}</span>
    <div class="row" style="margin-left:auto">${f.incoming ? t`<button class="sm pri" ${act('onlineAccept', f.id)}>Прийняти</button>`
      : f.status === 'pending' ? t`<span class="pill">очікує</span>`
      : t`<button class="sm pri" ${act('onlineDuel', f.id)} ${dis(f.hero && !S.trip)}>⚔️ Дуель</button><button class="sm" ${act('onlineTrade', f.id)} aria-label="${t('Подарунок чи обмін')}">🎁</button><button class="sm" ${act('onlineDm', f.id)}>💬</button>`}
      <button class="sm" ${act('onlineUnfriend', f.id)}>✕</button></div></div>`;
  return vTrades() + t`<div class="card"><h2>🤝 Друзі</h2>
    <div class="row"><input id="on-friend" placeholder="${t('Нік друга')}" maxlength="20" style="flex:1"><button class="pri" ${act('onlineAddFriend')}>Додати</button></div>
    <div style="margin-top:10px">${F.map(row).join('') || t`<div class="mut">Поки нікого. Додай друга за ніком — він побачить запит у себе.</div>`}</div>
    <div class="mut" style="margin-top:6px">Дуель — спаринг із копією героя друга, якою керує гра: без ризику для здоровʼя й речей, з тим самим суперником — раз на 10 хвилин. А у вилазках інколи трапляються герої інших гравців — з ними бій справжній.</div></div>`;
}

function vChat() {
  const C = net.chat, me = net.user.id, bl = blocked();
  const dm = C.room.startsWith('dm:') ? net.friends.find(f => C.room.includes(f.id)) : null;
  const msgs = C.msgs.filter(m => !bl.includes(m.user_id)).map(m => t`<div class="msg${m.user_id === me ? ' me' : ''}"><b>${esc(m.nick)}</b> <span class="mut">${new Date(m.created_at).toLocaleTimeString().slice(0, 5)}</span>
      ${m.user_id === me ? '' : t`<span class="msg-a"><button class="sm" ${act('onlineReport', m.id)} title="${t('Поскаржитися')}">⚑</button><button class="sm" ${act('onlineBlock', m.user_id)} title="${t('Заблокувати')}">🚫</button></span>`}
      <div>${esc(m.body)}</div></div>`).join('');
  return t`<div class="card chat"><div class="row"><h2 style="margin:0">💬 ${dm ? esc(dm.nick) : t('Загальний чат')}</h2>${dm ? t`<button class="sm" ${act('onlineChat', 'global')} style="margin-left:auto">До загального</button>` : ''}</div>
    <div class="msgs" id="msgs">${msgs || t`<div class="mut">Тут поки тихо. Напиши першим.</div>`}</div>
    <div class="row"><input id="on-msg" maxlength="500" placeholder="${t('Повідомлення…')}" style="flex:1" enterkeyhint="send"><button class="pri" ${act('onlineSend')}>➤</button></div>
    <div class="mut" style="margin-top:6px">Будь людиною. Лайка маскується, ⚑ — поскаржитися (після трьох скарг повідомлення ховається), 🚫 — більше не бачити гравця.</div></div>`;
}

/* ---------- подарунки й обмін ---------- */
const nick = id => esc(net.friends.find(f => f.id === id)?.nick || '?');
const mini = c => `<div class="item">${itemHTML(c)}</div>`;

/** Пропозиції, що чекають на мене, і мої, що чекають на друга. */
function vTrades() {
  const me = net.user.id, inc = net.trades.filter(x => x.to_id === me), out = net.trades.filter(x => x.from_id === me);
  if (!inc.length && !out.length) return '';
  const incH = inc.map(x => t`<div class="trade">${x.want ? t`<b>${nick(x.from_id)}</b> пропонує обмін:` : t`<b>${nick(x.from_id)}</b> дарує тобі:`}
    <div class="grid">${mini(x.give)}${x.want ? t`<div class="item"><div class="mut">Натомість просить твою:</div>${itemHTML(x.want)}</div>` : ''}</div>
    <div class="row" style="margin-top:6px"><button class="sm pri" ${act('tradeAccept', x.id)}>${x.want ? t('Обміняти') : t('Прийняти')}</button><button class="sm" ${act('tradeDecline', x.id)}>Відмовитись</button></div></div>`).join('');
  const outH = out.map(x => t`<div class="trade"><span class="mut">Чекає відповіді ${nick(x.to_id)}:</span>
    <div class="grid">${mini(x.give)}${x.want ? t`<div class="item"><div class="mut">Навзаєм:</div>${itemHTML(x.want)}</div>` : ''}</div>
    <div class="row" style="margin-top:6px"><button class="sm" ${act('tradeCancel', x.id)}>Скасувати</button></div></div>`).join('');
  return t`<div class="card"><h2>🎁 Подарунки й обмін</h2>${incH}${outH}</div>`;
}

/** Новий подарунок чи обмін з другом: що віддаєш і (за бажання) що просиш навзаєм. */
function vTrade() {
  const T = net.trade, f = net.friends.find(x => x.id === T?.to);
  if (!f) return vFriends();
  const mine = spareItems(), theirs = f.hero?.spare || [];
  const pick = (list, sel, action) => list.map(c => t`<button class="item tradeitem${sel === c.id ? ' on' : ''}" ${act(action, c.id)}>${itemHTML(c)}</button>`).join('');
  return t`<div class="card"><h2>🎁 ${esc(f.nick)}</h2>
    <div class="mut">Річ іде другу одразу, як він погодиться. Поки не відповів — її можна забрати назад. Екіпіровані речі віддати не можна.</div>
    <h3>Що віддаєш</h3>${mine.length ? t`<div class="grid">${pick(mine, T.give, 'tradeGive')}</div>` : t('<div class="mut">Нема вільних речей: усе екіпіровано.</div>')}
    <h3>Що просиш навзаєм</h3><div class="grid"><button class="item tradeitem${!T.want ? ' on' : ''}" ${act('tradeWant', '')}><b>🎁 Нічого</b><div class="mut">Це подарунок</div></button>${pick(theirs, T.want?.id, 'tradeWant')}</div>
    ${theirs.length ? '' : t('<div class="mut" style="margin-top:6px">У друга нема вільних речей (або він давно не заходив у гру).</div>')}
    <div class="row" style="margin-top:12px"><button class="pri" ${act('tradeSend')} ${dis(T.give)}>${T.want ? t('🤝 Запропонувати обмін') : t('🎁 Подарувати')}</button><button ${act('onlineTab', 'friends')}>Назад</button></div></div>`;
}
