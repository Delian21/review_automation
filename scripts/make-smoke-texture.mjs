// Generates public/smoke.webp, the grayscale texture used as a CSS mask for
// the hero's smoke layers.
//
// Deterministic: the field is built from seeded value-noise octaves, so running
// this twice produces a byte-identical file. Re-run it with `node scripts/make-smoke-texture.mjs`
// after changing the parameters below.
//
// The texture is grayscale on purpose. Colour comes entirely from the theme
// tokens in app/globals.css, so one asset serves both light and dark mode.

import { execFileSync } from "node:child_process";
import { mkdirSync, existsSync, writeFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "smoke.webp");
const TMP = join(ROOT, "node_modules", ".cache", "smoke-raw.png");

const WIDTH = 576;
const HEIGHT = 192;
const MAX_BYTES = 100 * 1024;

const PY = String.raw`
import numpy as np, os
from PIL import Image, ImageFilter

h, w = ${HEIGHT}, ${Math.floor(WIDTH / 2)}
out = os.environ["SMOKE_TMP"]

def octave(shape, res, seed):
    """Bicubic-upsampled value noise. Low res + smooth interpolation = soft billows."""
    rng = np.random.default_rng(seed)
    small = rng.random((res + 1, res + 1))
    img = Image.fromarray((small * 255).astype(np.uint8), "L").resize((shape[1], shape[0]), Image.BICUBIC)
    return np.asarray(img).astype(np.float64) / 255.0

def norm(a):
    return a / float(a.max())

# Low-octave-dominant fractal: few soft shapes, few hard edges.
field = np.zeros((h, w))
amp = 1.0
for res, seed in [(2, 21), (4, 22), (8, 23), (16, 24)]:
    field += amp * octave((h, w), res, seed)
    amp *= 0.5
field = norm(field)

# Domain warp gives the curl and tendrils that read as smoke.
wx = octave((h, w), 3, 31) - 0.5
wy = octave((h, w), 3, 32) - 0.5
yi, xi = np.mgrid[0:h, 0:w]
sx = np.clip(xi + (wx * 70), 0, w - 1).astype(int)
sy = np.clip(yi + (wy * 70), 0, h - 1).astype(int)
field = field[sy, sx]

# Mild 2:1 horizontal stretch turns blobs into wisps without becoming bars.
sm = Image.fromarray((np.clip(field, 0, 1) * 255).astype(np.uint8), "L")
sm = sm.resize((w * 2, h), Image.BICUBIC).filter(ImageFilter.GaussianBlur(radius=3))
field = norm(np.asarray(sm).astype(np.float64) / 255.0)

# Push most of the field to zero so only sparse wisps survive the mask.
# The threshold is high on purpose: a mask that is dark across most of its
# area tints the whole card rather than reading as drifting wisps.
field = np.clip((field - 0.52) / 0.40, 0, 1) ** 1.7

Image.fromarray((field * 255).astype(np.uint8), "L").save(out)
`;

mkdirSync(dirname(TMP), { recursive: true });
mkdirSync(dirname(OUT), { recursive: true });

execFileSync("python", ["-c", PY], {
  env: { ...process.env, SMOKE_TMP: TMP },
  stdio: "inherit",
});

const sharp = (await import("sharp")).default;
const buf = await sharp(TMP).webp({ quality: 78, effort: 6 }).toBuffer();

if (buf.length > MAX_BYTES) {
  console.error(
    `smoke.webp is ${(buf.length / 1024).toFixed(1)} KB, over the ${MAX_BYTES / 1024} KB budget`,
  );
  process.exit(1);
}

writeFileSync(OUT, buf);
console.log(
  `wrote public/smoke.webp — ${(buf.length / 1024).toFixed(1)} KB, ${WIDTH}x${HEIGHT}`,
);