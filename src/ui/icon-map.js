// Емодзі з текстів гри показуються однотонними лінійними іконками (Tabler Icons, MIT).
// Тексти й переклади лишаються з емодзі, заміна — лише при показі (ui/icons.js).
// Значення: «назва-іконки відтінок». Відтінки — класи .ic.<відтінок> у style.css.
// Додав емодзі чи нову назву іконки — npm run ui-icons (збирає контури в ui/icons.gen.js).
export const EMOJI = {
  // ресурси
  '💧': 'droplet water', '🍖': 'meat food', '🔥': 'flame heat', '🔋': 'battery-2 energy', '⛽': 'gas-station fuel',
  '🪵': 'wood food', '🔩': 'nut', '⚙️': 'settings', '💊': 'pill hp', '☕': 'coffee sily',
  // герой і бій
  '❤️': 'heart hp', '⚡': 'bolt sily', '🛡️': 'shield def', '⭐': 'star xp', '🌟': 'flare acc', '✨': 'sparkles xp',
  '💚': 'heart-plus ok', '🩸': 'droplet hp', '☠️': 'skull ok', '💫': 'spiral xp', '💨': 'wind fog', '💢': 'swords bad',
  '🏃': 'run', '👥': 'users', '📣': 'speakerphone', '💀': 'skull bad', '🪦': 'grave-2', '🏆': 'trophy xp',
  // навігація й кнопки
  '🏠': 'home', '🗺️': 'map', '🎒': 'backpack', '🌐': 'world', '☰': 'menu-2', '🔨': 'hammer', '🔧': 'tool', '🐾': 'paw',
  '🌙': 'moon', '🔍': 'search', '🔭': 'telescope', '📦': 'package', '📜': 'script xp', '🛠️': 'tools', '⏳': 'hourglass',
  '✔': 'check ok', '✅': 'circle-check ok', '⬜': 'square', '❔': 'help-circle', '🔒': 'lock', '🚪': 'door-exit',
  '▶': 'player-play', '✕': 'x', '➤': 'send', '💡': 'bulb xp', '🔄': 'refresh', '🆕': 'cloud-download', '⬇️': 'download',
  '📤': 'upload', '📥': 'download', '💾': 'device-floppy', '📂': 'folder-open', '🎨': 'palette', '📊': 'chart-bar',
  '🔊': 'volume', '🎵': 'music', '📳': 'device-mobile-vibration', '🔠': 'typography', '🖥️': 'device-desktop',
  '☁️': 'cloud', '💬': 'message', '👤': 'user', '⚠️': 'alert-triangle warn', '⚑': 'flag', '🚫': 'ban bad', '📧': 'mail',
  '🙂': 'mood-smile', '😊': 'mood-happy ok', '😐': 'mood-neutral', '😠': 'mood-angry bad', '😣': 'mood-sad',
  '🤝': 'heart-handshake', '🧑': 'user', '🧓': 'user', '🧑‍🎤': 'user', '🧟': 'skull', '🪤': 'alert-triangle warn',
  '🚨': 'alarm bad', '🌅': 'sunrise xp', '🌀': 'spiral fog', '🏴': 'flag', '🐪': 'caravan',
  // будівлі
  '🛢️': 'bucket-droplet water', '🥬': 'plant-2 ok', '🔌': 'plug energy', '☀️': 'sun xp', '♨️': 'temperature heat',
  '🛏️': 'bed', '🧱': 'wall', '🏚️': 'home-2', '🏰': 'building-castle',
  // пори року й події
  '🌱': 'plant ok', '🍂': 'leaf food', '❄️': 'snowflake fog', '🌪️': 'tornado', '🥵': 'temperature-plus heat',
  '🥶': 'temperature-minus fog', '🍀': 'clover ok', '🌫️': 'mist fog',
  // зброя
  '🔪': 'blade', '🏏': 'ball-baseball', '🏹': 'bow', '🪓': 'axe', '💥': 'crosshair', '🔮': 'crystal-ball fog',
  '🔱': 'trident', '🍾': 'bottle heat', '🪈': 'tool', '🪀': 'circle-dot', '🗡️': 'sword', '⛏️': 'pick', '🔫': 'crosshair',
  '⚔️': 'swords', '🪚': 'tools', '🎆': 'rocket heat', '🎯': 'target', '⚒️': 'hammer', '🧨': 'bomb heat', '⛓️': 'link',
  '🌾': 'wheat', '🛰️': 'satellite', '🔆': 'sun-high heat', '🌩️': 'cloud-storm sily', '🪝': 'fish-hook',
  // броня
  '🧥': 'jacket', '🦺': 'shirt', '⛑️': 'helmet', '🩹': 'bandage', '🧤': 'hand-stop', '😷': 'mask', '🥋': 'karate',
  '🎽': 'shirt', '🤖': 'robot', '🧣': 'jacket', '💠': 'hexagon fog',
  // тварини
  '🐕': 'dog', '🐈': 'cat', '🦜': 'paw', '🦝': 'paw', '🐦‍⬛': 'paw', '🐐': 'paw',
  // сюжет
  '🔑': 'key xp', '🪆': 'gift',
};

/** Решта емодзі з даних — одна іконка на категорію (арт і назва все одно поруч). */
export const FALLBACK = { monsters: 'skull', npcs: 'user', pets: 'paw', locations: 'map-pin', armor: 'shirt' };

/** Іконки, які інтерфейс ставить сам через ic('назва'). */
export const EXTRA = ['minus', 'plus', 'chevron-down', 'chevron-up', 'cards', 'hand-click'];
