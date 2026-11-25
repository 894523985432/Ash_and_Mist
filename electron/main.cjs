// ПК-версія: вікно Electron з грою з dist/. Розмір і положення вікна запамʼятовуються,
// F11 — повний екран, резервні копії збережень — у файли через діалоги Windows.
const { app, BrowserWindow, ipcMain, dialog, shell, Menu, protocol, net } = require('electron');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const fs = require('node:fs');

// Гру віддаємо через app://game/… — модулі ES з file:// Chromium не завантажує, а стала адреса дає надійні збереження
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }]);
const DIST = path.join(__dirname, '..', 'dist');

const STATE = () => path.join(app.getPath('userData'), 'window.json');
const readState = () => { try { return JSON.parse(fs.readFileSync(STATE(), 'utf8')); } catch { return {}; } };

function createWindow() {
  const st = readState();
  const win = new BrowserWindow({
    width: st.width || 1440, height: st.height || 900, x: st.x, y: st.y,
    minWidth: 1024, minHeight: 680,
    backgroundColor: '#0d0f14', title: 'Попіл і Туман', show: false,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, sandbox: true },
  });
  Menu.setApplicationMenu(null);
  if (st.maximized) win.maximize();
  if (st.fullscreen) win.setFullScreen(true);
  win.once('ready-to-show', () => win.show());

  const remember = () => {
    if (win.isDestroyed()) return;
    const b = win.getNormalBounds();
    fs.writeFileSync(STATE(), JSON.stringify({ ...b, maximized: win.isMaximized(), fullscreen: win.isFullScreen() }));
  };
  win.on('close', remember);

  // F11 — повний екран, F12 — інструменти розробника лише в збірці для розробки
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    if (input.key === 'F12' && !app.isPackaged) win.webContents.toggleDevTools();
  });
  // Зовнішні посилання — у звичайному браузері
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });

  const dev = process.env.ASHFOG_DEV_URL;
  win.loadURL(dev || 'app://game/index.html');

  // Самоперевірка (ASHFOG_SMOKE=шлях.png): помилки консолі, стан гри, знімок вікна — і вихід
  const smoke = process.env.ASHFOG_SMOKE;
  if (smoke) {
    const errs = [];
    win.webContents.on('console-message', e => { if (e.level === 'error' || e.level === 'warning') errs.push(e.message); });
    win.webContents.on('did-finish-load', async () => {
      await new Promise(r => setTimeout(r, 3000));
      const info = await win.webContents.executeJavaScript(`({ wide: document.documentElement.classList.contains('wide'), desktop: !!window.desktop, w: innerWidth, art: [...document.images].filter(i => i.complete && i.naturalWidth).length, modal: document.querySelector('#modal')?.innerText.slice(0, 60) })`);
      const img = await win.webContents.capturePage();
      fs.writeFileSync(smoke, img.toPNG());
      console.log('SMOKE', JSON.stringify(info), 'errors:', JSON.stringify(errs));
      app.quit();
    });
  }
  return win;
}

ipcMain.handle('fullscreen', (e, on) => {
  const w = BrowserWindow.fromWebContents(e.sender);
  if (on === undefined) return w.isFullScreen();
  w.setFullScreen(!!on); return w.isFullScreen();
});
ipcMain.handle('save-file', async (e, name, text) => {
  const r = await dialog.showSaveDialog(BrowserWindow.fromWebContents(e.sender), {
    title: 'Зберегти резервну копію', defaultPath: path.join(app.getPath('documents'), name),
    filters: [{ name: 'Збереження «Попелу і Туману»', extensions: ['ashfog'] }],
  });
  if (r.canceled || !r.filePath) return null;
  fs.writeFileSync(r.filePath, text, 'utf8'); return r.filePath;
});
ipcMain.handle('open-file', async e => {
  const r = await dialog.showOpenDialog(BrowserWindow.fromWebContents(e.sender), {
    title: 'Відновити з резервної копії', properties: ['openFile'],
    filters: [{ name: 'Збереження «Попелу і Туману»', extensions: ['ashfog', 'json', 'txt'] }],
  });
  if (r.canceled || !r.filePaths[0]) return null;
  return fs.readFileSync(r.filePaths[0], 'utf8');
});
ipcMain.handle('quit', () => app.quit());

// Оновлення: інсталятор (NSIS) качає новий реліз з GitHub і ставить його при перезапуску.
// Портативна версія й запуск із папки проєкту так не вміють — гра лише покаже посилання.
const canAuto = () => app.isPackaged && !process.env.PORTABLE_EXECUTABLE_DIR;
let updater = null;
function getUpdater(sender) {
  if (updater) return updater;
  updater = require('electron-updater').autoUpdater;
  updater.autoDownload = false;          // качаємо лише після згоди гравця
  updater.autoInstallOnAppQuit = true;   // «Пізніше» — встановиться, коли гравець вийде з гри
  const send = ev => { if (!sender.isDestroyed()) sender.send('update', ev); };
  updater.on('download-progress', p => send({ type: 'progress', percent: p.percent }));
  updater.on('update-downloaded', i => send({ type: 'ready', version: i.version }));
  updater.on('error', e => send({ type: 'error', message: String(e?.message || e).split('\n')[0] }));
  return updater;
}
ipcMain.handle('update-can', () => canAuto());
ipcMain.handle('update-download', async e => {
  if (!canAuto()) throw new Error('auto update unavailable');
  const u = getUpdater(e.sender);
  const r = await u.checkForUpdates();
  if (!r?.isUpdateAvailable) throw new Error('no update');
  await u.downloadUpdate();
});
ipcMain.handle('update-install', () => { if (updater) updater.quitAndInstall(false, true); });

app.whenReady().then(() => {
  protocol.handle('app', req => {
    const rel = decodeURIComponent(new URL(req.url).pathname).replace(/^\/+/, '') || 'index.html';
    const file = path.normalize(path.join(DIST, rel));
    if (!file.startsWith(DIST)) return new Response('Not found', { status: 404 });
    return net.fetch(pathToFileURL(file).toString());
  });
  createWindow();
});
app.on('window-all-closed', () => app.quit());
