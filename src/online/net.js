// Онлайн: акаунт, хмарні збереження, друзі, дуелі, випадкові зустрічі, чат (Supabase).
// Працює лише в браузері/APK/ПК; гра без мережі чи без входу лишається повністю офлайн.
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY, ONLINE } from './config.js';
import { getItem, setItem } from '../storage.js';
import { slotKey, SLOTS } from '../save.js';
import { settings } from '../settings.js';
import { S } from '../state.js';
import { ui } from '../hooks.js';
import { heroSnapshot, startDuel, startEncounter } from '../pvp.js';
import { t } from '../i18n.js';

export const SYNC_KEYS = [...Array(SLOTS)].map((_, i) => `ashfog_sync_${i + 1}`);
const BLOCK_KEY = 'ashfog_blocked';

let sb = null;
export const net = {
  user: null, profile: null, status: 'off', // off | ok | offline | error
  friends: [], heroes: [], chat: { room: 'global', msgs: [], sub: null }, lastSync: null, error: '',
};
const changed = () => ui.render();

function client() {
  if (!sb) sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
  return sb;
}
const withTimeout = (p, ms = ONLINE.bootTimeoutMs) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('timeout')), ms))]);

/* ---------- пакування збереження ---------- */
async function sha(text) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}
async function pack(text) {
  const s = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  const buf = new Uint8Array(await new Response(s).arrayBuffer());
  let bin = ''; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(bin);
}
async function unpack(b64) {
  const bin = atob(b64), buf = Uint8Array.from(bin, c => c.charCodeAt(0));
  return new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
}
const meta = slot => { try { return JSON.parse(getItem(`ashfog_sync_${slot}`) || 'null'); } catch (e) { return null; } };
const setMeta = (slot, m) => setItem(`ashfog_sync_${slot}`, JSON.stringify(m));

/* ---------- запуск: сесія і звірка збереження ---------- */
/** Викликати до load(): якщо є вхід — звіряє локальне збереження поточного слота з хмарним. */
export async function bootOnline() {
  try {
    const { data } = await withTimeout(client().auth.getSession());
    net.user = data.session?.user || null;
    if (!net.user) { net.status = 'off'; return; }
    await withTimeout(loadProfile());
    const msg = await withTimeout(reconcile(settings.slot), ONLINE.bootTimeoutMs * 2);
    net.status = 'ok';
    return msg;
  } catch (e) { net.status = 'offline'; net.error = e.message; }
}

/** Звірка: хмара — головна копія. Локальну беремо, лише якщо вона продовжує ту, що в хмарі. */
async function reconcile(slot) {
  const local = getItem(slotKey(slot)), m = meta(slot);
  const { data: row, error } = await client().from('saves').select('data,hash,day,updated_at').eq('slot', slot).maybeSingle();
  if (error) throw error;
  const lh = local ? await sha(local) : null;
  if (!row) { if (local) await upload(slot, local, lh); return null; }
  if (row.hash === lh) { setMeta(slot, { hash: lh, day: row.day }); return null; }
  const untouchedLocal = m && lh === m.hash, untouchedCloud = m && row.hash === m.hash;
  if (local && untouchedCloud && !untouchedLocal) { await upload(slot, local, lh); return t('☁️ Гру, зіграну без мережі, відправлено в хмару'); }
  const text = await unpack(row.data);
  if ((await sha(text)) !== row.hash) throw new Error(t('хмарна копія пошкоджена'));
  setItem(slotKey(slot), text); setMeta(slot, { hash: row.hash, day: row.day });
  return local ? t`☁️ Взято збереження з хмари (день ${row.day})` : t`☁️ Завантажено гру з хмари (день ${row.day})`;
}

async function upload(slot, text, hash) {
  hash ||= await sha(text);
  let day = null; try { day = JSON.parse(text).day; } catch (e) {}
  const { error } = await client().from('saves').upsert({ user_id: net.user.id, slot, data: await pack(text), hash, day, version: 1, updated_at: new Date().toISOString() });
  if (error) throw error;
  setMeta(slot, { hash, day }); net.lastSync = new Date();
  if (S && slot === settings.slot) await client().from('profiles').update({ hero: heroSnapshot(), power: S.lvl, day: S.day, updated_at: new Date().toISOString() }).eq('id', net.user.id);
}

/* Автозбереження в хмару: одразу при зміні дня, інакше не частіше ніж раз на 2 хвилини після паузи */
let timer = null, lastDay = null, lastUp = 0;
export function onSaved(slot, json) {
  if (!net.user || net.status === 'off') return;
  const day = S?.day, now = Date.now();
  clearTimeout(timer);
  const go = () => upload(slot, json).then(() => { net.status = 'ok'; lastUp = Date.now(); refreshHeroes(); }).catch(e => { net.status = 'offline'; net.error = e.message; });
  if (day !== lastDay) { lastDay = day; return go(); }
  timer = setTimeout(go, now - lastUp > 120000 ? 15000 : 120000);
}
export async function syncNow() {
  if (!net.user) return;
  try { await upload(settings.slot, getItem(slotKey(settings.slot))); net.status = 'ok'; ui.toast(t('☁️ Збережено в хмарі')); }
  catch (e) { net.status = 'offline'; ui.toast(t('Хмара недоступна: ') + e.message); }
  changed();
}

/* ---------- акаунт ---------- */
async function loadProfile() {
  const { data, error } = await client().from('profiles').select('*').eq('id', net.user.id).maybeSingle();
  if (error) throw error;
  if (!data) {
    const nick = net.user.user_metadata?.nick;
    if (nick) { const r = await client().from('profiles').insert({ id: net.user.id, nick }).select().single(); if (r.error) throw r.error; net.profile = r.data; }
  } else net.profile = data;
}

export async function signUp(email, password, nick) {
  nick = (nick || '').trim();
  if (!/^[A-Za-zА-Яа-яІіЇїЄєҐґ0-9_ .-]{3,20}$/.test(nick)) return ui.toast(t('Нік: 3–20 літер, цифр, пробілів, _ . -'));
  const taken = await client().from('profiles').select('id').ilike('nick', nick).maybeSingle();
  if (taken.data) return ui.toast(t('Такий нік уже зайнятий'));
  const { data, error } = await client().auth.signUp({ email, password, options: { data: { nick } } });
  if (error) return ui.toast(t('Не вдалося: ') + error.message);
  if (!data.session) { ui.showEvent({ e: '📧', t: t('Перевір пошту'), txt: t('Ми надіслали лист для підтвердження. Відкрий посилання з нього, а тоді увійди в грі.'), b: [['Ок', null]] }); return; }
  await afterLogin(data.session.user);
}
export async function signIn(email, password) {
  const { data, error } = await client().auth.signInWithPassword({ email, password });
  if (error) return ui.toast(t('Не вдалося увійти: ') + error.message);
  await afterLogin(data.user);
}
async function afterLogin(user) {
  net.user = user; net.status = 'ok';
  try {
    await loadProfile();
    const msg = await reconcile(settings.slot);
    if (msg) { ui.toast(msg); location.reload(); return; } // підтягнули гру з хмари — перезапускаємо з нею
    refreshFriends(); refreshHeroes();
  } catch (e) { net.status = 'offline'; net.error = e.message; }
  ui.toast(t`Вітаю, ${net.profile?.nick || ''}!`); changed();
}
/** Повторна спроба після помилки: профіль, звірка, друзі. */
export async function retry() {
  if (!net.user) return;
  try { await loadProfile(); const msg = await reconcile(settings.slot); net.status = 'ok'; net.error = ''; if (msg) { ui.toast(msg); location.reload(); return; } refreshFriends(); refreshHeroes(); ui.toast(t('☁️ На звʼязку')); }
  catch (e) { net.status = 'offline'; net.error = e.message; ui.toast(t('Не вдалося: ') + e.message); }
  changed();
}
export async function signOut() {
  await client().auth.signOut(); net.user = null; net.profile = null; net.status = 'off'; net.friends = []; leaveChat(); changed();
}

/* ---------- друзі ---------- */
export async function refreshFriends() {
  if (!net.user) return;
  const { data } = await client().from('friends').select('*');
  const ids = [...new Set((data || []).flatMap(f => [f.user_id, f.friend_id]).filter(id => id !== net.user.id))];
  const { data: ps } = ids.length ? await client().from('profiles').select('id,nick,hero,power,day,wins,losses').in('id', ids) : { data: [] };
  const P = Object.fromEntries((ps || []).map(p => [p.id, p]));
  net.friends = (data || []).map(f => {
    const other = f.user_id === net.user.id ? f.friend_id : f.user_id;
    return { ...P[other], id: other, status: f.status, incoming: f.friend_id === net.user.id && f.status === 'pending' };
  }).filter(f => f.nick);
  changed();
}
export async function addFriend(nick) {
  const { data: p } = await client().from('profiles').select('id,nick').ilike('nick', (nick || '').trim()).maybeSingle();
  if (!p) return ui.toast(t('Гравця з таким ніком нема'));
  if (p.id === net.user.id) return ui.toast(t('Це ти 🙂'));
  const { error } = await client().from('friends').insert({ user_id: net.user.id, friend_id: p.id });
  ui.toast(error ? t('Не вдалося: ') + error.message : t`Запит надіслано: ${p.nick}`); refreshFriends();
}
export async function acceptFriend(id) { await client().from('friends').update({ status: 'accepted' }).eq('user_id', id).eq('friend_id', net.user.id); refreshFriends(); }
export async function removeFriend(id) {
  await client().from('friends').delete().or(`and(user_id.eq.${net.user.id},friend_id.eq.${id}),and(user_id.eq.${id},friend_id.eq.${net.user.id})`); refreshFriends();
}
export function duel(id) {
  const f = net.friends.find(x => x.id === id);
  if (!f?.hero) return ui.toast(t('Цей гравець ще не зберігав героя в хмарі'));
  startDuel(f.id, f.nick, f.hero);
}

/* ---------- випадкові зустрічі й результати боїв ---------- */
export async function refreshHeroes() {
  if (!net.user || !S) return;
  const { data } = await client().rpc('random_heroes', { lvl: S.lvl, n: 8 });
  net.heroes = (data || []).filter(h => h.hero && !blocked().includes(h.id));
}
export function encounter() {
  if (!net.heroes.length || S.day < ONLINE.encounterFromDay || Math.random() >= ONLINE.encounterChance) return false;
  const h = net.heroes.splice(Math.floor(Math.random() * net.heroes.length), 1)[0];
  ui.showEvent({ e: '🧑‍🎤', t: h.nick, txt: t`Серед руїн ти помічаєш іншого вижилого — це <b>${h.nick}</b> (рів. ${h.hero.lvl}, день ${h.hero.day}). Не схоже, що він збирається ділитися знахідками.`,
    b: [[t('Битися'), () => startEncounter(h.id, h.nick, h.hero)], [t('Обійти стороною'), null]] });
  return true;
}
export async function pvpResult(pvp, won, turns) {
  if (!net.user || !pvp.id) return;
  const { error } = await client().from('duels').insert({ attacker: net.user.id, defender: pvp.id, attacker_won: won, turns });
  if (error && !/10 хвилин/.test(error.message)) console.warn(error.message);
}

/* ---------- чат ---------- */
const BAD = /(?<!\p{L})(хуй\p{L}*|пизд\p{L}*|[єеї]ба\p{L}*|бля[дт]\p{L}*|сук[аи]|fuck\p{L}*|shit\p{L}*|nigg\p{L}*|fag\p{L}*)(?!\p{L})/giu;
export const clean = s => s.replace(BAD, m => m[0] + '*'.repeat(Math.max(1, m.length - 1)));
export const blocked = () => { try { return JSON.parse(getItem(BLOCK_KEY) || '[]'); } catch (e) { return []; } };
export function block(id) { const b = blocked(); if (!b.includes(id)) setItem(BLOCK_KEY, JSON.stringify([...b, id])); ui.toast(t('Гравця заблоковано: його повідомлень ти більше не побачиш')); changed(); }
export const dmRoom = id => 'dm:' + [net.user.id, id].sort().join(':');

export async function openChat(room = 'global') {
  if (!net.user) return;
  leaveChat(); net.chat.room = room; net.chat.msgs = [];
  const { data } = await client().from('messages').select('*').eq('room', room).order('created_at', { ascending: false }).limit(ONLINE.chatPage);
  net.chat.msgs = (data || []).reverse();
  net.chat.sub = client().channel('room:' + room)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room=eq.${room}` }, p => { net.chat.msgs.push(p.new); net.chat.msgs = net.chat.msgs.slice(-ONLINE.chatPage); changed(); })
    .subscribe();
  changed();
}
export function leaveChat() { if (net.chat.sub) { client().removeChannel(net.chat.sub); net.chat.sub = null; } }
export async function send(text) {
  text = clean((text || '').trim()).slice(0, 500); if (!text) return;
  const { error } = await client().from('messages').insert({ room: net.chat.room, user_id: net.user.id, body: text });
  if (error) ui.toast(error.message);
}
export async function report(id) {
  const { error } = await client().from('reports').insert({ message_id: +id, reporter: net.user.id, reason: 'chat' });
  ui.toast(error ? t('Скаргу вже надіслано') : t('Скаргу надіслано. Після трьох скарг повідомлення ховається'));
}
