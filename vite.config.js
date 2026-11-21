import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // відносні шляхи — потрібні для Capacitor/APK (етап 6)
  build: { outDir: 'dist', target: 'es2022' },
});
