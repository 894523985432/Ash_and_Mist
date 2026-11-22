// Платформні дрібниці: кнопка «Назад» на Android (APK) і офлайн-кеш (PWA у браузері).
import { S } from './state.js';
import { ui } from './hooks.js';

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

  // Service worker (dist/sw.js генерує vite.config.js) — тільки у зібраній веб-версії.
  if (!native && import.meta.env.PROD && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(e => console.warn('SW не зареєструвався:', e));
  }
}
