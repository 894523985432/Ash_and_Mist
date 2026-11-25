// Платформні дрібниці: кнопка «Назад» на Android (APK) і офлайн-кеш (PWA у браузері).
import { S } from './state.js';
import { ui } from './hooks.js';
import { t } from './i18n.js';
import { initUpdates, checkUpdates } from './update.js';

// З цих екранів «Назад» веде на базу; з бази, бою й вилазки — згортає застосунок.
const BACK_TO_BASE = ['map', 'gear', 'art'];

export async function initPlatform() {
  let native = false;
  try {
    const { Capacitor } = await import('@capacitor/core');
    native = Capacitor.isNativePlatform();
    if (native) {
      const { App } = await import('@capacitor/app');
      App.addListener('backButton', () => {
        if (document.querySelector('#modal .modal')) return; // подію треба вирішити кнопками
        if (!S.trip && BACK_TO_BASE.includes(S.screen)) ui.go('base');
        else App.minimizeApp();
      });
    }
  } catch (e) { /* не APK */ }

  // Нова версія на GitHub (APK і ПК) — перевіряємо трохи згодом, щоб не заважати запуску
  await initUpdates(native);
  setTimeout(() => checkUpdates(false), 5000);

  // Service worker (dist/sw.js генерує vite.config.js) — тільки у зібраній веб-версії.
  if (!native && !window.desktop && import.meta.env.PROD && 'serviceWorker' in navigator) {
    // Була вже стара версія під керуванням SW, і прийшла нова — перезавантажуємося один раз на свіжу
    const hadController = !!navigator.serviceWorker.controller;
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || reloaded) return;
      reloaded = true; ui.toast(t('Гру оновлено — перезапуск…'));
      setTimeout(() => location.reload(), 600);
    });
    navigator.serviceWorker.register('./sw.js').then(reg => reg.update()).catch(e => console.warn(t('SW не зареєструвався:'), e));
  }
}
