// Іконки з портрета героя: PWA (public/icons) і, якщо є android/, — mipmap-и та заставка.
// Запуск: npm run icons (після npx cap add android — ще раз, щоб замінити стандартні іконки Capacitor).
import sharp from 'sharp';
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = 'public/art/hero.webp';
const BG = '#0d0f14';
// Квадрати на портреті 1024×1024 (обличчя приблизно в центрі)
const FACE = { left: 150, top: 150, width: 640, height: 640 };   // звичайна іконка
const WIDE = { left: 40, top: 60, width: 880, height: 880 };     // маскована: обличчя в безпечній зоні 80%
const FULL = { left: 0, top: 10, width: 960, height: 960 };      // адаптивна Android: видно центральні 66%

const crop = (box, size) => sharp(SRC).extract(box).resize(size, size).png();
const circle = s => Buffer.from(`<svg width="${s}" height="${s}"><circle cx="${s / 2}" cy="${s / 2}" r="${s / 2}"/></svg>`);

mkdirSync('public/icons', { recursive: true });
await crop(FACE, 192).toFile('public/icons/icon-192.png');
await crop(FACE, 512).toFile('public/icons/icon-512.png');
await crop(WIDE, 512).toFile('public/icons/maskable-512.png');
await crop(FACE, 180).toFile('public/icons/apple-touch-icon.png');
console.log('PWA: public/icons/*.png');

const RES = 'android/app/src/main/res';
if (existsSync(RES)) {
  const DENS = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
  for (const [d, k] of Object.entries(DENS)) {
    const dir = join(RES, 'mipmap-' + d), legacy = Math.round(48 * k), fg = Math.round(108 * k);
    mkdirSync(dir, { recursive: true });
    await crop(FACE, legacy).toFile(join(dir, 'ic_launcher.png'));
    await sharp(await crop(FACE, legacy).toBuffer()).composite([{ input: circle(legacy), blend: 'dest-in' }]).png().toFile(join(dir, 'ic_launcher_round.png'));
    await crop(FULL, fg).toFile(join(dir, 'ic_launcher_foreground.png'));
  }
  writeFileSync(join(RES, 'values/ic_launcher_background.xml'),
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${BG}</color>\n</resources>\n`);

  // Заставки: темне тло з портретом по центру, у тих самих розмірах, що й стандартні splash.png
  let n = 0;
  for (const d of readdirSync(RES)) {
    const f = join(RES, d, 'splash.png');
    if (!d.startsWith('drawable') || !existsSync(f) || !statSync(f).isFile()) continue;
    const { width, height } = await sharp(f).metadata();
    const s = Math.round(Math.min(width, height) * 0.4);
    const face = await sharp(await crop(FACE, s).toBuffer()).composite([{ input: circle(s), blend: 'dest-in' }]).png().toBuffer();
    const out = await sharp({ create: { width, height, channels: 4, background: BG } }).composite([{ input: face, gravity: 'centre' }]).png().toBuffer();
    writeFileSync(f, out); n++;
  }
  console.log(`Android: mipmap-* і ${n} заставок`);
}
