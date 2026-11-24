// Точка входу браузерної версії.
import '@fontsource/rubik/latin-400.css';
import '@fontsource/rubik/cyrillic-400.css';
import '@fontsource/rubik/latin-600.css';
import '@fontsource/rubik/cyrillic-600.css';
import '@fontsource/rubik/latin-800.css';
import '@fontsource/rubik/cyrillic-800.css';
import './style.css';
import { S } from './state.js';
import { ui } from './hooks.js';
import { load, save, LEGACY_KEYS, ALL_SAVE_KEYS, exportSave, importSave } from './save.js';
import { loadSettings, setSetting, settings, SETTINGS_KEY, RECORDS_KEY } from './settings.js';
import { repair, petFollow, petRelease } from './economy.js';
import { resInfo } from './ui/info.js';
import { initAudio } from './audio.js';
import { storyCheck, giveGoal } from './story.js';
import { setUI } from './hooks.js';
import * as on from './online/net.js';
import { initStorage } from './storage.js';
import { initPlatform } from './platform.js';
import { newGame, sleep, eat, heal, stim } from './day.js';
import { build, craft, dismantle, toggleEq } from './base.js';
import { scout, goTo, search, goHome } from './map.js';
import { playCard, blockAct, superAct, flee, endTurn } from './combat.js';
import { restoreArt, clearArt, loadArtFiles } from './art.js';
import { mountUI, render } from './ui/render.js';
import { caravanTrade, season, event } from './events.js';
import { tutOk, tutOff } from './ui/tutorial.js';
import { t } from './i18n.js';

const val = id => document.getElementById(id)?.value || '';
let confirmNew = false, confirmRelease = null;

async function copyText(txt) {
  try { await navigator.clipboard.writeText(txt); return true; } catch (e) { return false; }
}

const ACTIONS = {
  go: s => {
    if (s === 'online' && on.net.user) { on.refreshFriends(); if (S.onlineTab === 'chat') on.openChat(on.net.chat.room); }
    if (s !== 'online') on.leaveChat();
    ui.go(s);
  },
  sleep, eat, heal, stim,
  build, craft, dismantle, toggleEq,
  scout, goTo, search, goHome,
  playCard, blockAct, superAct, flee, endTurn,
  clearArt, caravanTrade,
  info: k => { const x = k === 'event' ? event() : season(); if (x) ui.toast(`${x.e} ${x.n}: ${x.d}`); },
  tutOk: id => { tutOk(id); render(); },
  tutOff: () => { tutOff(); render(); },
  resInfo, giveGoal,
  onlineTab: tab => { S.onlineTab = tab; if (tab === 'chat') on.openChat(on.net.chat.room); if (tab === 'friends') on.refreshFriends(); ui.go('online'); },
  onlineSignIn: () => on.signIn(val('on-email'), val('on-pass')),
  onlineSignUp: () => on.signUp(val('on-email'), val('on-pass'), val('on-nick')),
  onlineSignOut: () => on.signOut(),
  onlineSync: () => on.syncNow(),
  onlineRetry: () => on.retry(),
  onlineAddFriend: () => { on.addFriend(val('on-friend')); const el = document.getElementById('on-friend'); if (el) el.value = ''; },
  onlineAccept: id => on.acceptFriend(id),
  onlineUnfriend: id => on.removeFriend(id),
  onlineDuel: id => on.duel(id),
  onlineDm: id => { S.onlineTab = 'chat'; on.openChat(on.dmRoom(id)); ui.go('online'); },
  onlineChat: room => on.openChat(room),
  onlineSend: () => { const el = document.getElementById('on-msg'); if (!el?.value.trim()) return; on.send(el.value); el.value = ''; },
  onlineReport: id => on.report(id),
  onlineBlock: id => on.block(id),
  baseTab: tab => { S.baseTab = tab; ui.go('base'); },
  repair, petFollow,
  petRelease: id => {
    if (confirmRelease === id) { confirmRelease = null; petRelease(id); }
    else { confirmRelease = id; ui.toast(t('Натисни ще раз, щоб відпустити')); }
  },
  setting: (kv, quiet) => { const i = kv.indexOf(':'); setSetting(kv.slice(0, i), kv.slice(i + 1)); if (!quiet) render(); },
  slotLoad: n => {
    save(); n = +n;
    if (!load(n)) { setSetting('slot', n); newGame(); }
    if (S.screen === 'fight' && !S.fight) S.screen = S.trip ? 'loc' : 'base';
    ui.go('base'); ui.toast(t('Слот ') + n);
  },
  exportSave: async () => {
    const txt = exportSave();
    if (window.desktop) { // ПК-версія: справжній файл через діалог Windows
      const p = await window.desktop.saveFile(`ashfog-day${S.day}.ashfog`, txt);
      if (p) ui.toast(t('Збережено: ') + p);
      return;
    }
    if (await copyText(txt)) return ui.toast(t('Копію скопійовано — встав її в нотатки'));
    ui.showEvent({ e: '📤', t: t('Резервна копія'), txt: t`<div class="mut">Скопіюй цей текст вручну:</div><textarea rows="6" readonly onclick="this.select()">${txt.replace(/</g, '&lt;')}</textarea>`, b: [[t('Готово'), null]] });
  },
  importOpen: async () => {
    if (window.desktop) {
      const txt = await window.desktop.openFile(); if (!txt) return;
      try { importSave(txt.trim()); ui.toast(t('Гру відновлено')); ui.go('base'); } catch (e) { ui.toast(t('Не вдалося: ') + e.message); }
      return;
    }
    ACTIONS.importPaste();
  },
  fullscreen: async () => { if (window.desktop) { await window.desktop.fullscreen(!(await window.desktop.fullscreen())); render(); } else if (document.fullscreenElement) document.exitFullscreen?.(); else document.documentElement.requestFullscreen?.().catch(() => {}); },
  quitGame: () => { save(); window.desktop?.quit(); },
  importPaste: () => ui.showEvent({
    e: '📥', t: t('Відновити з копії'), txt: t('<div class="mut">Встав текст резервної копії. Поточна гра в цьому слоті буде замінена.</div><textarea id="imptxt" rows="6"></textarea>'),
    b: [[t('Відновити'), () => {
      try { importSave(document.querySelector('#imptxt').value.trim()); ui.toast(t('Гру відновлено')); S.screen = 'base'; }
      catch (e) { ui.toast(t('Не вдалося: ') + e.message); }
    }], [t('Скасувати'), null]],
  }),
  newGame: () => { newGame(); ui.go('base'); },
  newGameConfirm: () => {
    if (confirmNew) { newGame(); ui.go('base'); }
    else { confirmNew = true; ui.toast(t('Натисни ще раз, щоб почати заново')); }
  },
};

mountUI(ACTIONS);
await initStorage([...ALL_SAVE_KEYS, ...LEGACY_KEYS, SETTINGS_KEY, RECORDS_KEY, ...on.SYNC_KEYS, 'ashfog_blocked']);
loadSettings();
// Онлайн: якщо є вхід — звіряємо збереження з хмарою до завантаження (без мережі — просто офлайн)
const cloudMsg = await on.bootOnline();
setUI({ encounter: () => on.encounter(), pvpResult: on.pvpResult, saved: on.onSaved });
if (!load()) newGame();
if (S.screen === 'fight' && !S.fight) S.screen = S.trip ? 'loc' : 'base';
render();
loadArtFiles().then(restoreArt);
initAudio();
initPlatform();
storyCheck();
if (cloudMsg) ui.toast(cloudMsg);
if (on.net.user) { on.refreshFriends(); on.refreshHeroes(); }
// Enter у полі чату — надіслати
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'on-msg') { e.preventDefault(); ACTIONS.onlineSend(); } });
