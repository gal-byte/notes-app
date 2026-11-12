// ============================================================
// MAKE ICONS
// Draws the app icon (a white note card on green-teal) and saves it
// as PNG files in the icons/ folder. Uses only Node.js itself,
// no extra packages.
//
// Run it from the project folder:   node tools/make-icons.js
// ============================================================

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const BLUE = [15, 122, 99];     // the app's accent (--accent), kept the old name
const WHITE = [255, 255, 255];

// Is the point (x, y) inside a rectangle with rounded corners?
// Everything is measured from 0 to 1 across the icon.
function inRoundedRect(x, y, left, top, right, bottom, radius) {
  if (x < left || x > right || y < top || y > bottom) return false;
  const cx = Math.min(Math.max(x, left + radius), right - radius);
  const cy = Math.min(Math.max(y, top + radius), bottom - radius);
  return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;
}

// The color at one point of the icon, or null for "see-through"
function colorAt(x, y, fullBleed, badge) {
  // Notification badge: only the card, white on see-through, lines cut out
  // (Android draws it as a single-color silhouette)
  if (badge) {
    if (!inRoundedRect(x, y, 0.22, 0.12, 0.78, 0.88, 0.08)) return null;
    const lines = [[0.32, 0.68, 0.30], [0.32, 0.68, 0.45], [0.44, 0.68, 0.60]];
    for (const [left, right, top] of lines) {
      if (inRoundedRect(x, y, left, top, right, top + 0.06, 0.03)) return null;
    }
    return WHITE;
  }
  // Background: rounded square, or the whole square for "maskable"
  // icons (Android cuts those into its own shape)
  const inBackground = fullBleed || inRoundedRect(x, y, 0, 0, 1, 1, 0.22);
  if (!inBackground) return null;

  // The note card
  if (inRoundedRect(x, y, 0.28, 0.22, 0.72, 0.78, 0.06)) {
    // Three text lines on the card (the short one on the right, like Hebrew)
    const lines = [[0.35, 0.65, 0.36], [0.35, 0.65, 0.47], [0.45, 0.65, 0.58]];
    for (const [left, right, top] of lines) {
      if (inRoundedRect(x, y, left, top, right, top + 0.04, 0.02)) return BLUE;
    }
    return WHITE;
  }
  return BLUE;
}

// Draw the icon pixel by pixel. Each pixel is sampled 4×4 times
// and averaged, so the edges come out smooth.
function drawIcon(size, fullBleed, badge = false) {
  const pixels = Buffer.alloc(size * size * 4);
  const samples = 4;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const color = colorAt((px + (sx + 0.5) / samples) / size, (py + (sy + 0.5) / samples) / size, fullBleed, badge);
          if (color) { r += color[0]; g += color[1]; b += color[2]; a += 1; }
        }
      }
      const i = (py * size + px) * 4;
      pixels[i] = a ? Math.round(r / a) : 0;
      pixels[i + 1] = a ? Math.round(g / a) : 0;
      pixels[i + 2] = a ? Math.round(b / a) : 0;
      pixels[i + 3] = Math.round((a / (samples * samples)) * 255);
    }
  }
  return pixels;
}

// ---------- Saving as PNG ----------

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let k = 0; k < 8; k++) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([length, typeAndData, crc]);
}

function toPng(size, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;   // 8 bits per color
  header[9] = 6;   // red, green, blue, alpha
  // Each row starts with a 0 byte ("no filter")
  const rows = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    pixels.copy(rows, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const folder = path.join(__dirname, '..', 'icons');
fs.mkdirSync(folder, { recursive: true });

const icons = [
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['icon-maskable-512.png', 512, true],
  ['apple-touch-icon.png', 180, true],
  ['badge-96.png', 96, false, true],   // small icon in the phone's status bar
];
for (const [name, size, fullBleed, badge] of icons) {
  const file = path.join(folder, name);
  fs.writeFileSync(file, toPng(size, drawIcon(size, fullBleed, badge)));
  console.log(`${name}  ${size}×${size}  ${(fs.statSync(file).size / 1024).toFixed(1)} KB`);
}
