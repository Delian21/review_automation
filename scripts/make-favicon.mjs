// Generates app/favicon.ico (32x32, 32-bit BGRA) matching app/icon.svg.
import { writeFileSync } from "node:fs";

const S = 32;
const TEAL = [0x6a, 0x6f, 0x2f]; // RGB for #2F6F6A
const SAND = [0xf4, 0xf8, 0xfa]; // RGB for #FAF8F4
const R = 8; // corner radius

const px = Buffer.alloc(S * S * 4);

const inRounded = (x, y) => {
  const cx = Math.min(Math.max(x, R), S - 1 - R);
  const cy = Math.min(Math.max(y, R), S - 1 - R);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= R * R;
};

// Anti-aliased coverage for a circle edge.
const cov = (d) => Math.min(1, Math.max(0, 0.5 - d));

for (let y = 0; y < S; y++) {
  for (let x = 0; x < S; x++) {
    const i = (y * S + x) * 4;
    let rgb = TEAL;
    let alpha = inRounded(x, y) ? 255 : 0;

    const d = Math.hypot(x - 15.5, y - 15.5);
    const ringOuter = cov(9 - d);
    const ringInner = cov(4.5 - d);
    const ring = Math.max(0, ringOuter - ringInner);
    const dot = cov(2 - d);

    if (alpha > 0) {
      const paint = Math.min(1, ring + dot);
      rgb = [
        Math.round(TEAL[0] * (1 - paint) + SAND[0] * paint),
        Math.round(TEAL[1] * (1 - paint) + SAND[1] * paint),
        Math.round(TEAL[2] * (1 - paint) + SAND[2] * paint),
      ];
    }

    px[i] = rgb[2]; // B
    px[i + 1] = rgb[1]; // G
    px[i + 2] = rgb[0]; // R
    px[i + 3] = alpha;
  }
}

// ICO container
const xor = Buffer.alloc(S * S * 4);
for (let y = 0; y < S; y++) {
  px.copy(xor, (S - 1 - y) * S * 4, y * S * 4, (y + 1) * S * 4); // bottom-up
}
const andRow = 4; // 32px / 8 = 4 bytes, already 4-byte aligned
const andMask = Buffer.alloc(andRow * S);

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(1, 4); // count

const dib = Buffer.alloc(40);
dib.writeUInt32LE(40, 0); // biSize
dib.writeInt32LE(S, 4); // biWidth
dib.writeInt32LE(S * 2, 8); // biHeight (XOR + AND)
dib.writeUInt16LE(1, 12); // biPlanes
dib.writeUInt16LE(32, 14); // biBitCount
dib.writeUInt32LE(0, 16); // BI_RGB

const image = Buffer.concat([dib, xor, andMask]);
const imageSize = image.length;

const entry = Buffer.alloc(16);
entry[0] = S;
entry[1] = S;
entry[2] = 0;
entry[3] = 0;
entry.writeUInt16LE(1, 4); // planes
entry.writeUInt16LE(32, 6); // bitCount
entry.writeUInt32LE(imageSize, 8);
entry.writeUInt32LE(22, 12); // offset

writeFileSync("app/favicon.ico", Buffer.concat([header, entry, image]));
console.log(`wrote app/favicon.ico (${22 + imageSize} bytes)`);