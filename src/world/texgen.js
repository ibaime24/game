// High-detail procedural surface textures: each kind yields a tileable albedo map and a
// matching tangent-space normal map derived from a height field. Cached by kind.
import * as THREE from 'three';
import { mulberry32 } from '../core/noise.js';
import { photo } from './photoTextures.js';

const cache = new Map();
const SIZE = 512;

// ----------------------------------------------------------------- noise helpers (tileable)
function lattice(c, rand) {
  const a = new Float32Array(c * c);
  for (let i = 0; i < a.length; i++) a[i] = rand();
  return a;
}

/** Periodic fbm, returns Float32Array(size*size) in ~[0,1]. */
export function pnoise(size, cells, seed, octaves = 5, gain = 0.5) {
  const out = new Float32Array(size * size);
  let amp = 1, norm = 0;
  for (let o = 0; o < octaves; o++) {
    const c = cells << o;
    const L = lattice(c, mulberry32(seed * 131 + o * 17));
    for (let y = 0; y < size; y++) {
      const fy = (y / size) * c, y0 = Math.floor(fy), ty = fy - y0, sy = ty * ty * (3 - 2 * ty), y1 = (y0 + 1) % c;
      for (let x = 0; x < size; x++) {
        const fx = (x / size) * c, x0 = Math.floor(fx), tx = fx - x0, sx = tx * tx * (3 - 2 * tx), x1 = (x0 + 1) % c;
        const a = L[y0 * c + x0], b = L[y0 * c + x1], d = L[y1 * c + x0], e = L[y1 * c + x1];
        out[y * size + x] += ((a + (b - a) * sx) * (1 - sy) + (d + (e - d) * sx) * sy) * amp;
      }
    }
    norm += amp;
    amp *= gain;
  }
  for (let i = 0; i < out.length; i++) out[i] /= norm;
  return out;
}

/** Tileable Worley (cellular) noise: returns {f1, f2, id} arrays. */
export function worley(size, cells, seed) {
  const rand = mulberry32(seed);
  const pts = [];
  for (let j = 0; j < cells; j++) for (let i = 0; i < cells; i++) pts.push([(i + rand()) / cells, (j + rand()) / cells, rand()]);
  const f1 = new Float32Array(size * size), f2 = new Float32Array(size * size), id = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      const ci = Math.floor(u * cells), cj = Math.floor(v * cells);
      let d1 = 9, d2 = 9, best = 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        const ii = (ci + di + cells) % cells, jj = (cj + dj + cells) % cells;
        const p = pts[jj * cells + ii];
        let dx = p[0] - u, dy = p[1] - v;
        dx -= Math.round(dx); dy -= Math.round(dy);
        const d = Math.sqrt(dx * dx + dy * dy) * cells;
        if (d < d1) { d2 = d1; d1 = d; best = p[2]; } else if (d < d2) d2 = d;
      }
      const k = y * size + x;
      f1[k] = d1; f2[k] = d2; id[k] = best;
    }
  }
  return { f1, f2, id };
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// ----------------------------------------------------------------- texture assembly
function toTexture(data, srgb) {
  const c = document.createElement('canvas');
  c.width = c.height = SIZE;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(SIZE, SIZE);
  img.data.set(data);
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 16;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.needsUpdate = true;
  return t;
}

function normalFromHeight(h, strength) {
  const out = new Uint8ClampedArray(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y++) {
    const ym = ((y - 1 + SIZE) % SIZE) * SIZE, yp = ((y + 1) % SIZE) * SIZE, yc = y * SIZE;
    for (let x = 0; x < SIZE; x++) {
      const xm = (x - 1 + SIZE) % SIZE, xp = (x + 1) % SIZE;
      const dx = (h[yc + xp] - h[yc + xm]) * strength;
      const dy = (h[yp + x] - h[ym + x]) * strength;
      const inv = 1 / Math.sqrt(dx * dx + dy * dy + 1);
      const k = (yc + x) * 4;
      out[k] = (-dx * inv * 0.5 + 0.5) * 255;
      out[k + 1] = (dy * inv * 0.5 + 0.5) * 255;
      out[k + 2] = (inv * 0.5 + 0.5) * 255;
      out[k + 3] = 255;
    }
  }
  return out;
}

/** gen(i, x, y) -> [r,g,b,height] for each pixel (0..1 colors). */
function build(kind, gen, normalStrength = 2, extra = {}) {
  if (cache.has(kind)) return cache.get(kind);
  // a photo-scanned texture wins when one was loaded for this kind
  const ph = photo[kind];
  if (ph && !extra.emissive) {
    const res = { map: ph.map, normalMap: ph.normalMap, emissiveMap: null, avg: [0.4, 0.4, 0.4], photo: true };
    cache.set(kind, res);
    return res;
  }
  const col = new Uint8ClampedArray(SIZE * SIZE * 4);
  const hgt = new Float32Array(SIZE * SIZE);
  const em = extra.emissive ? new Uint8ClampedArray(SIZE * SIZE * 4) : null;
  const px = [0, 0, 0, 0, 0];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = y * SIZE + x;
      px[4] = 0;
      gen(i, x, y, px);
      col[i * 4] = clamp01(px[0]) * 255;
      col[i * 4 + 1] = clamp01(px[1]) * 255;
      col[i * 4 + 2] = clamp01(px[2]) * 255;
      col[i * 4 + 3] = 255;
      hgt[i] = px[3];
      if (em) { em[i * 4] = px[4] * 255; em[i * 4 + 1] = px[4] * 90; em[i * 4 + 2] = px[4] * 20; em[i * 4 + 3] = 255; }
    }
  }
  const res = {
    map: ph ? ph.map : toTexture(col, true),
    normalMap: ph ? ph.normalMap : toTexture(normalFromHeight(hgt, normalStrength * SIZE / 256), false),
    emissiveMap: em ? toTexture(em, true) : null,
    avg: averageColor(col),
    photo: !!ph,
  };
  cache.set(kind, res);
  return res;
}

function averageColor(col) {
  let r = 0, g = 0, b = 0;
  const n = col.length / 4;
  for (let i = 0; i < col.length; i += 16) { r += col[i]; g += col[i + 1]; b += col[i + 2]; }
  const k = 4 / n / 255;
  return [r * k, g * k, b * k];
}

// ----------------------------------------------------------------- strokes onto a float buffer
function stampBlades(h, c, rand, count, palette) {
  // short grass blades drawn as tapered lines into height and colour buffers
  for (let n = 0; n < count; n++) {
    const x0 = rand() * SIZE, y0 = rand() * SIZE;
    const len = 4 + rand() * 9, ang = -Math.PI / 2 + (rand() - 0.5) * 1.6;
    const shade = rand();
    const pc = palette[Math.floor(rand() * palette.length)];
    for (let s = 0; s < len; s++) {
      const t = s / len;
      const x = Math.floor(x0 + Math.cos(ang) * s + SIZE) % SIZE, y = Math.floor(y0 + Math.sin(ang) * s + SIZE) % SIZE;
      const k = y * SIZE + x;
      h[k] = Math.max(h[k], 0.4 + t * 0.6);
      const l = 0.75 + t * 0.45 + shade * 0.2;
      c[k * 3] = pc[0] * l; c[k * 3 + 1] = pc[1] * l; c[k * 3 + 2] = pc[2] * l;
    }
  }
}

// ----------------------------------------------------------------- the kinds
export function grassTex() {
  if (cache.has('grass')) return cache.get('grass');
  if (photo.grass) return build('grass', () => {});
  const rand = mulberry32(11);
  const base = pnoise(SIZE, 4, 1, 6);
  const fine = pnoise(SIZE, 32, 2, 3);
  const h = new Float32Array(SIZE * SIZE);
  const c = new Float32Array(SIZE * SIZE * 3);
  for (let i = 0; i < SIZE * SIZE; i++) {
    const m = base[i];
    // mottled greens with occasional yellowed patches and darker soil gaps
    const dry = smooth(0.55, 0.75, m);
    c[i * 3] = mix(0.3, 0.44, dry) * (0.82 + fine[i] * 0.36);
    c[i * 3 + 1] = mix(0.37, 0.41, dry) * (0.82 + fine[i] * 0.36);
    c[i * 3 + 2] = mix(0.17, 0.19, dry) * (0.82 + fine[i] * 0.36);
    h[i] = fine[i] * 0.3;
  }
  stampBlades(h, c, rand, 9000, [[0.34, 0.44, 0.19], [0.38, 0.46, 0.2], [0.3, 0.39, 0.17], [0.46, 0.47, 0.24]]);
  return build('grass', (i, x, y, o) => { o[0] = c[i * 3]; o[1] = c[i * 3 + 1]; o[2] = c[i * 3 + 2]; o[3] = h[i]; }, 1.4);
}

export function dirtTex() {
  const n = pnoise(SIZE, 6, 3, 6), f = pnoise(SIZE, 40, 4, 2);
  const w = worley(SIZE, 46, 5);
  return build('dirt', (i, x, y, o) => {
    const pebble = smooth(0.42, 0.18, w.f1[i]) * (w.id[i] > 0.72 ? 1 : 0) * 0.7;
    const v = 0.75 + n[i] * 0.4 + f[i] * 0.15;
    o[0] = (0.44 * v) * (1 - pebble * 0.2) + pebble * 0.18;
    o[1] = (0.36 * v) * (1 - pebble * 0.2) + pebble * 0.16;
    o[2] = (0.26 * v) * (1 - pebble * 0.2) + pebble * 0.14;
    o[3] = n[i] * 0.4 + f[i] * 0.2 + pebble * 0.6;
  }, 2.2);
}

export function rockTex() {
  const n = pnoise(SIZE, 4, 6, 7, 0.55), f = pnoise(SIZE, 24, 7, 3);
  const w = worley(SIZE, 7, 8);
  return build('rock', (i, x, y, o) => {
    const crack = smooth(0.08, 0.0, w.f2[i] - w.f1[i]);
    const strata = Math.sin((y / SIZE) * Math.PI * 14 + n[i] * 9) * 0.5 + 0.5;
    const v = 0.55 + n[i] * 0.45 + strata * 0.1 + f[i] * 0.1;
    const lichen = smooth(0.6, 0.8, n[(i + 7919) % (SIZE * SIZE)]) * 0.25;
    o[0] = (0.5 * v) * (1 - crack * 0.6) - lichen * 0.05;
    o[1] = (0.48 * v) * (1 - crack * 0.6) + lichen * 0.05;
    o[2] = (0.44 * v) * (1 - crack * 0.6) - lichen * 0.08;
    o[3] = n[i] * 0.8 + strata * 0.15 - crack * 0.5 + f[i] * 0.1;
  }, 3.0);
}

export function sandTex() {
  const n = pnoise(SIZE, 8, 9, 5), f = pnoise(SIZE, 64, 10, 2);
  return build('sand', (i, x, y, o) => {
    const ripple = Math.sin((x + n[i] * 80) / SIZE * Math.PI * 22) * 0.5 + 0.5;
    const v = 0.85 + n[i] * 0.2 + f[i] * 0.12;
    o[0] = 0.66 * v; o[1] = 0.6 * v; o[2] = 0.46 * v;
    o[3] = ripple * 0.25 + f[i] * 0.3;
  }, 1.2);
}

export function cobbleTex() {
  const w = worley(SIZE, 14, 12), n = pnoise(SIZE, 16, 13, 4);
  return build('cobble', (i, x, y, o) => {
    const edge = w.f2[i] - w.f1[i];
    const stone = smooth(0.0, 0.18, edge);
    const tone = 0.34 + w.id[i] * 0.2 + n[i] * 0.16;
    o[0] = mix(0.2, tone * 0.95, stone); o[1] = mix(0.18, tone * 0.9, stone); o[2] = mix(0.14, tone * 0.8, stone);
    o[3] = stone * (0.8 - w.f1[i] * 0.4) + n[i] * 0.1;
  }, 3.5);
}

export function stoneWallTex(variant = 'grey') {
  const n = pnoise(SIZE, 8, variant === 'white' ? 24 : 21, 6), f = pnoise(SIZE, 48, 22, 2);
  const pal = variant === 'white' ? [0.8, 0.78, 0.72] : [0.66, 0.62, 0.56];
  const rand = mulberry32(23);
  const rows = 8, rh = SIZE / rows;
  const offsets = [], widths = [], tones = [];
  for (let r = 0; r < rows; r++) {
    offsets.push(rand() * SIZE);
    const ws = []; let tot = 0;
    while (tot < SIZE) { const w = 40 + rand() * 60; ws.push(w); tones.push(rand()); tot += w; }
    const scale = SIZE / tot;
    widths.push(ws.map((w) => w * scale));
  }
  let toneIdx = 0;
  const blockTone = [];
  for (let r = 0; r < rows; r++) { blockTone.push(widths[r].map(() => tones[toneIdx++])); }
  return build('stonewall_' + variant, (i, x, y, o) => {
    const r = Math.floor(y / rh), ly = y - r * rh;
    let lx = (x + offsets[r]) % SIZE, b = 0;
    while (b < widths[r].length - 1 && lx > widths[r][b]) { lx -= widths[r][b]; b++; }
    const bw = widths[r][b];
    const ex = Math.min(lx, bw - lx), ey = Math.min(ly, rh - ly);
    const e = Math.min(ex, ey);
    const mortar = e < 2.5;
    const bevel = smooth(2, 9, e);
    const t = (variant === 'white' ? 0.82 : 0.62) + blockTone[r][b] * (variant === 'white' ? 0.14 : 0.3) + n[i] * 0.22 + f[i] * 0.08;
    if (mortar) { o[0] = pal[0] * 0.55; o[1] = pal[1] * 0.53; o[2] = pal[2] * 0.52; o[3] = 0; }
    else { o[0] = pal[0] * t; o[1] = pal[1] * t; o[2] = pal[2] * t; o[3] = 0.4 + bevel * 0.5 + n[i] * 0.25; }
  }, 3.2);
}

export function plasterTex() {
  const n = pnoise(SIZE, 6, 31, 6), f = pnoise(SIZE, 64, 32, 2);
  const w = worley(SIZE, 5, 33);
  return build('plaster', (i, x, y, o) => {
    const crack = smooth(0.03, 0.0, w.f2[i] - w.f1[i]) * smooth(0.55, 0.7, n[i]);
    const stain = smooth(0.5, 1, 1 - y / SIZE) * 0.06;
    const v = 0.86 + n[i] * 0.12 + f[i] * 0.05 - crack * 0.25 - stain;
    o[0] = 0.86 * v; o[1] = 0.8 * v; o[2] = 0.68 * v;
    o[3] = n[i] * 0.3 + f[i] * 0.3 - crack;
  }, 1.4);
}

export function woodTex(kind = 'timber') {
  const dark = kind === 'timber';
  const n = pnoise(SIZE, 3, dark ? 41 : 44, 4), f = pnoise(SIZE, 64, 42, 2);
  const planks = dark ? 1 : 5;
  return build(kind, (i, x, y, o) => {
    const p = Math.floor((x / SIZE) * planks);
    const lx = (x / SIZE) * planks - p;
    const grain = Math.sin((y / SIZE) * 90 + n[i] * 14 + p * 7) * 0.5 + 0.5;
    const knot = 0;
    const gap = planks > 1 && (lx < 0.012 || lx > 0.988) ? 1 : 0;
    const tone = 0.75 + ((p * 37) % 7) / 25 + grain * 0.18 + f[i] * 0.08;
    const [r, g, b] = dark ? [0.26, 0.17, 0.1] : [0.52, 0.37, 0.22];
    o[0] = r * tone * (1 - gap * 0.7); o[1] = g * tone * (1 - gap * 0.7); o[2] = b * tone * (1 - gap * 0.7);
    o[3] = grain * 0.3 + f[i] * 0.15 - gap + knot;
  }, 1.6);
}

export function roofTex() {
  const n = pnoise(SIZE, 8, 51, 5), f = pnoise(SIZE, 48, 52, 2);
  const rand = mulberry32(53);
  const rows = 14, rh = SIZE / rows;
  const jit = Array.from({ length: rows * 40 }, () => rand());
  return build('roof', (i, x, y, o) => {
    const r = Math.floor(y / rh), ly = (y - r * rh) / rh;
    const tw = SIZE / 12;
    const sx = x + (r % 2) * tw * 0.5;
    const ti = Math.floor(sx / tw), lx = (sx - ti * tw) / tw;
    const j = jit[(r * 40 + ti) % jit.length];
    const edge = Math.min(lx, 1 - lx) < 0.04;
    const shade = 0.6 + j * 0.35 + n[i] * 0.2 + f[i] * 0.08 - (1 - ly) * 0.25;
    o[0] = 0.32 * shade; o[1] = 0.28 * shade; o[2] = 0.27 * shade;
    if (edge) { o[0] *= 0.5; o[1] *= 0.5; o[2] *= 0.5; }
    o[3] = ly * 0.8 + (edge ? -0.3 : 0) + f[i] * 0.1;
  }, 3.0);
}

export function barkTex() {
  const n = pnoise(SIZE, 6, 61, 5), f = pnoise(SIZE, 32, 62, 3);
  return build('bark', (i, x, y, o) => {
    const fiss = Math.abs(Math.sin((x / SIZE) * Math.PI * 12 + n[i] * 6 + Math.sin(y / SIZE * 9) * 0.6));
    const v = 0.5 + fiss * 0.5 + f[i] * 0.2;
    o[0] = 0.33 * v; o[1] = 0.26 * v; o[2] = 0.19 * v;
    o[3] = fiss * 0.9 + f[i] * 0.2;
  }, 3.5);
}

export function ayleidTex() {
  const n = pnoise(SIZE, 6, 71, 6), f = pnoise(SIZE, 48, 72, 3), d = pnoise(SIZE, 3, 73, 4);
  return build('ayleid', (i, x, y, o) => {
    // large dressed blocks; a carved frieze band of interlocking arcs; grime toward the bottom
    const by = Math.floor(y / 128), ly = y % 128, lx = (x + (by % 2) * 128) % 256;
    const joint = ly < 2 || lx < 2;
    const frieze = by === 1 && ly > 40 && ly < 88;
    const arc = frieze && Math.abs(Math.hypot((x % 64) - 32, ly - 64) - 18) < 2.2;
    const groove = frieze && (Math.abs(ly - 44) < 1.5 || Math.abs(ly - 84) < 1.5);
    const cut = joint || arc || groove;
    const grime = smooth(0.4, 1.0, y / SIZE) * 0.12 + d[i] * 0.08;
    const v = 0.78 + n[i] * 0.16 + f[i] * 0.05 - grime;
    o[0] = 0.8 * v * (cut ? 0.72 : 1); o[1] = 0.79 * v * (cut ? 0.72 : 1); o[2] = 0.75 * v * (cut ? 0.78 : 1);
    o[3] = 0.6 + n[i] * 0.25 + f[i] * 0.1 - (cut ? 0.55 : 0);
  }, 3.0);
}

export function obrockTex() {
  const n = pnoise(SIZE, 5, 81, 7, 0.55), f = pnoise(SIZE, 32, 82, 3), m = pnoise(SIZE, 3, 84, 3);
  const w = worley(SIZE, 6, 83), w2 = worley(SIZE, 17, 85);
  return build('obrock', (i, x, y, o) => {
    // jagged volcanic rock: glowing veins only where a slow mask allows, and they flicker in width
    const vein = smooth(0.035, 0.0, w.f2[i] - w.f1[i]) * smooth(0.55, 0.7, m[i]);
    const crack = smooth(0.05, 0.0, w2.f2[i] - w2.f1[i]) * 0.5;
    const v = 0.3 + n[i] * 0.55 + f[i] * 0.15 - crack * 0.25;
    o[0] = 0.28 * v + vein * 0.25; o[1] = 0.16 * v + vein * 0.05; o[2] = 0.14 * v;
    o[3] = n[i] * 0.9 + f[i] * 0.2 - crack * 0.5 - vein * 0.4;
    o[4] = vein * (0.55 + f[i] * 0.45);
  }, 3.4, { emissive: true });
}

export function snowTex() {
  const n = pnoise(SIZE, 6, 91, 5), f = pnoise(SIZE, 48, 92, 2);
  return build('snow', (i, x, y, o) => {
    const v = 0.9 + n[i] * 0.1;
    o[0] = 0.92 * v; o[1] = 0.94 * v; o[2] = 0.98 * v;
    o[3] = n[i] * 0.4 + f[i] * 0.2;
  }, 0.8);
}

// ----------------------------------------------------------------- foliage sprites (alpha)
function alphaCanvas(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

/** Broadleaf cluster: hundreds of small overlapping leaves on twigs. */
export function leafTex(variant = 'oak') {
  const key = 'leaf_' + variant;
  if (cache.has(key)) return cache.get(key);
  const rand = mulberry32(variant === 'oak' ? 101 : 102);
  const base = variant === 'oak' ? [70, 100, 36] : variant === 'beech' ? [96, 124, 44] : [60, 92, 40];
  const t = alphaCanvas(512, 512, (ctx, W, H) => {
    // twigs
    ctx.strokeStyle = 'rgb(70,52,34)';
    ctx.lineCap = 'round';
    const twigs = [];
    for (let i = 0; i < 9; i++) {
      const x0 = W / 2 + (rand() - 0.5) * 60, y0 = H * 0.98;
      const ang = -Math.PI / 2 + (rand() - 0.5) * 1.8;
      const len = H * (0.45 + rand() * 0.35);
      const x1 = x0 + Math.cos(ang) * len, y1 = y0 + Math.sin(ang) * len;
      ctx.lineWidth = 3 + rand() * 2;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2 + (rand() - 0.5) * 60, (y0 + y1) / 2, x1, y1); ctx.stroke();
      twigs.push([x0, y0, x1, y1]);
    }
    // leaves: many small ellipses clustered along twigs, darker at the core, lighter at the edges
    const leaves = variant === 'oak' ? 900 : 750;
    for (let i = 0; i < leaves; i++) {
      const tw = twigs[Math.floor(rand() * twigs.length)];
      const t0 = 0.25 + rand() * 0.75;
      let x = tw[0] + (tw[2] - tw[0]) * t0 + (rand() - 0.5) * 110;
      let y = tw[1] + (tw[3] - tw[1]) * t0 + (rand() - 0.5) * 110;
      const dc = Math.hypot(x - W / 2, y - H / 2) / (W / 2);
      if (dc > 0.98) continue;
      const s = 9 + rand() * 9;
      const l = 0.65 + rand() * 0.5 + dc * 0.25;
      const hue = (rand() - 0.5) * 18;
      ctx.fillStyle = `rgb(${Math.min(255, base[0] * l + hue)},${Math.min(255, base[1] * l)},${Math.min(255, base[2] * l - hue * 0.5)})`;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rand() * Math.PI * 2);
      ctx.beginPath();
      ctx.ellipse(0, 0, s, s * 0.48, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(30,45,15,0.35)`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-s, 0); ctx.lineTo(s, 0); ctx.stroke();
      ctx.restore();
    }
  });
  cache.set(key, t);
  return t;
}

/** Fir branch: a central twig with drooping needles, for pine cards. */
/** Fir branch card: twigs fan out from the left edge (where the card meets the trunk), ragged tips. */
export function needleTex() {
  if (cache.has('needles')) return cache.get('needles');
  const rand = mulberry32(111);
  const t = alphaCanvas(512, 256, (ctx, W, H) => {
    const twig = (x0, y0, ang, len, depth) => {
      const x1 = x0 + Math.cos(ang) * len, y1 = y0 + Math.sin(ang) * len;
      ctx.strokeStyle = 'rgb(70,52,34)';
      ctx.lineWidth = Math.max(1, 3 - depth);
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      const n = Math.floor(len * 1.4);
      for (let i = 0; i < n; i++) {
        const t0 = rand();
        const x = x0 + (x1 - x0) * t0, y = y0 + (y1 - y0) * t0;
        const nl = (10 + rand() * 12) * (1 - t0 * 0.55);
        const side = rand() < 0.5 ? -1 : 1;
        const a = ang + side * (0.9 + rand() * 0.5) + 0.35;
        const l = (0.72 + rand() * 0.45) * (side < 0 ? 1.12 : 0.88);
        ctx.strokeStyle = `rgb(${54 * l},${92 * l},${50 * l})`;
        ctx.lineWidth = 1.7;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * nl, y + Math.sin(a) * nl); ctx.stroke();
      }
      if (depth < 2) for (let k = 0; k < 4; k++) {
        const t0 = 0.25 + rand() * 0.6;
        twig(x0 + (x1 - x0) * t0, y0 + (y1 - y0) * t0, ang + (rand() < 0.5 ? -1 : 1) * (0.5 + rand() * 0.4) + 0.15, len * (0.35 + rand() * 0.25), depth + 1);
      }
    };
    // main branch from the trunk end, drooping slightly; card corners stay empty
    twig(4, H * 0.42, 0.12, W * 0.88, 0);
  });
  cache.set('needles', t);
  return t;
}

/** Symmetric fir layer for the crossed "skirt" cards: a drooping triangle of needles around the trunk. */
export function firSkirtTex() {
  if (cache.has('firskirt')) return cache.get('firskirt');
  const rand = mulberry32(117);
  const t = alphaCanvas(512, 256, (ctx, W, H) => {
    for (let i = 0; i < 2600; i++) {
      // sample inside a drooping triangle: wide at the bottom, narrow at the top
      const v = rand();
      const half = (0.15 + v * 0.85) * W * 0.5 * (0.85 + rand() * 0.15);
      const x = W / 2 + (rand() * 2 - 1) * half;
      const y = H * (0.08 + v * 0.8) + Math.abs(x - W / 2) / W * H * 0.18;
      const len = 9 + rand() * 12;
      const a = Math.PI / 2 + (x < W / 2 ? 0.5 : -0.5) + (rand() - 0.5) * 0.9;
      const l = 0.65 + rand() * 0.5 + (1 - v) * 0.15;
      ctx.strokeStyle = `rgb(${52 * l},${90 * l},${48 * l})`;
      ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * len * 0.5, y + Math.sin(a) * len); ctx.stroke();
    }
  });
  cache.set('firskirt', t);
  return t;
}

/** Grass clump sprite with tapered blades, dark roots and sunlit tips. */
export function grassBladeTex() {
  if (cache.has('blades')) return cache.get('blades');
  const rand = mulberry32(121);
  const t = alphaCanvas(256, 256, (ctx, W, H) => {
    for (let i = 0; i < 110; i++) {
      // blades cluster toward the middle so the card edges stay transparent
      const spread = (rand() + rand() + rand()) / 3 - 0.5;
      const x0 = W * 0.5 + spread * W * 1.15;
      const hgt = H * (0.35 + rand() * 0.6) * (1 - Math.abs(spread) * 0.9);
      const bend = (rand() - 0.5) * 70;
      const w = 2.5 + rand() * 3.5;
      const g = ctx.createLinearGradient(0, H, 0, H - hgt);
      const l = 0.75 + rand() * 0.45;
      const yel = rand() * 0.25;
      g.addColorStop(0, `rgb(${70 * l},${88 * l},${38 * l})`);
      g.addColorStop(0.6, `rgb(${(92 + yel * 90) * l},${128 * l},${44 * l})`);
      g.addColorStop(1, `rgb(${(150 + yel * 70) * l},${170 * l},${80 * l})`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x0 - w, H);
      ctx.quadraticCurveTo(x0 - w * 0.3 + bend * 0.3, H - hgt * 0.5, x0 + bend, H - hgt);
      ctx.quadraticCurveTo(x0 + w * 0.3 + bend * 0.3, H - hgt * 0.5, x0 + w, H);
      ctx.closePath();
      ctx.fill();
    }
  });
  cache.set('blades', t);
  return t;
}

/** Small meadow flowers sprite. */
export function flowerTex() {
  if (cache.has('flowers')) return cache.get('flowers');
  const rand = mulberry32(131);
  const t = alphaCanvas(256, 256, (ctx, W, H) => {
    const cols = [[250, 220, 70], [240, 240, 250], [200, 110, 230], [240, 90, 80]];
    for (let i = 0; i < 26; i++) {
      const x = W * 0.1 + rand() * W * 0.8, top = H * (0.25 + rand() * 0.4);
      ctx.strokeStyle = 'rgb(60,96,34)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, H); ctx.quadraticCurveTo(x + (rand() - 0.5) * 20, (H + top) / 2, x, top); ctx.stroke();
      const c = cols[Math.floor(rand() * cols.length)];
      ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2;
        ctx.beginPath(); ctx.arc(x + Math.cos(a) * 5, top + Math.sin(a) * 5, 4.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = 'rgb(240,200,40)';
      ctx.beginPath(); ctx.arc(x, top, 3, 0, Math.PI * 2); ctx.fill();
    }
  });
  cache.set('flowers', t);
  return t;
}

// ----------------------------------------------------------------- character surfaces (neutral, tinted by material.color)
export function fabricTex() {
  const n = pnoise(SIZE, 8, 141, 5), f = pnoise(SIZE, 32, 142, 3), g = pnoise(SIZE, 96, 143, 2);
  return build('fabric', (i, x, y, o) => {
    // soft folds and a fine (mip-friendly) weave
    const fold = Math.sin((x / SIZE) * Math.PI * 6 + n[i] * 5) * 0.5 + 0.5;
    const v = 0.78 + n[i] * 0.16 + fold * 0.08 + g[i] * 0.06;
    o[0] = v; o[1] = v; o[2] = v;
    o[3] = fold * 0.5 + f[i] * 0.25 + g[i] * 0.15;
  }, 1.4);
}

export function leatherTex() {
  const n = pnoise(SIZE, 6, 151, 6), f = pnoise(SIZE, 48, 152, 3);
  return build('leather', (i, x, y, o) => {
    const crease = Math.abs(Math.sin(n[i] * 30)) < 0.08 ? 0.82 : 1;
    const v = (0.72 + n[i] * 0.3 + f[i] * 0.1) * crease;
    o[0] = v; o[1] = v * 0.94; o[2] = v * 0.88;
    o[3] = f[i] * 0.5 + n[i] * 0.3 - (crease < 1 ? 0.3 : 0);
  }, 1.6);
}

export function plateTex() {
  const n = pnoise(SIZE, 8, 161, 5), f = pnoise(SIZE, 48, 162, 2);
  return build('plate', (i, x, y, o) => {
    const band = Math.floor(y / 64), ly = y % 64;
    const edge = ly < 4 || ly > 60;
    const rivet = Math.hypot((x % 64) - 32, ly - 8) < 4.5;
    const v = 0.78 + n[i] * 0.18 + f[i] * 0.06 - (band % 2) * 0.05 - (edge ? 0.2 : 0);
    o[0] = v; o[1] = v; o[2] = v;
    o[3] = 0.5 + (edge ? -0.4 : 0) + (rivet ? 0.6 : 0) + f[i] * 0.05;
  }, 2.5);
}

export function hairTex() {
  const n = pnoise(SIZE, 4, 171, 4);
  const f = pnoise(SIZE, 64, 172, 2);
  return build('hair', (i, x, y, o) => {
    const strand = Math.sin(x * 0.9 + n[i] * 30) * 0.5 + 0.5;
    const v = 0.65 + strand * 0.35 * (0.6 + f[i] * 0.4);
    o[0] = v; o[1] = v; o[2] = v;
    o[3] = strand * 0.5;
  }, 1.5);
}

export function skinTex() {
  const n = pnoise(SIZE, 16, 181, 4), f = pnoise(SIZE, 96, 182, 2);
  return build('skin', (i, x, y, o) => {
    const v = 0.93 + n[i] * 0.08 + f[i] * 0.04;
    o[0] = v; o[1] = v * 0.98; o[2] = v * 0.97;
    o[3] = f[i] * 0.3;
  }, 0.5);
}

/** Painted face, projected onto the front of the head. kind: human | cat | lizard | skull | dremora | orc | goblin */
export function faceTex(skinHex, kind = 'human', eyeHex = 0x5a7aa0, female = false) {
  const key = `face_${skinHex}_${kind}_${eyeHex}_${female}`;
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const r = (skinHex >> 16) & 255, g = (skinHex >> 8) & 255, b = skinHex & 255;
  const rgb = (k, a = 1) => `rgba(${Math.min(255, r * k)},${Math.min(255, g * k)},${Math.min(255, b * k)},${a})`;
  ctx.fillStyle = rgb(1);
  ctx.fillRect(0, 0, 256, 256);
  // soft shading: cheeks, temples, under the brow
  const shade = (x, y, rad, k, a) => { const gr = ctx.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, rgb(k, a)); gr.addColorStop(1, rgb(k, 0)); ctx.fillStyle = gr; ctx.fillRect(0, 0, 256, 256); };
  const ex = 128, eyeY = 110, eyeDX = 34;
  if (kind === 'skull') {
    ctx.fillStyle = '#d8d0b8'; ctx.fillRect(0, 0, 256, 256);
    for (const s of [-1, 1]) { ctx.fillStyle = '#1a1410'; ctx.beginPath(); ctx.ellipse(ex + s * eyeDX, eyeY, 20, 17, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#2a2018'; ctx.beginPath(); ctx.moveTo(ex, 135); ctx.lineTo(ex - 9, 160); ctx.lineTo(ex + 9, 160); ctx.fill();
    ctx.fillStyle = '#e8e0c8'; for (let i = -4; i <= 4; i++) ctx.fillRect(ex + i * 9 - 3, 185, 6, 14);
    ctx.strokeStyle = '#3a3020'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ex - 42, 192); ctx.lineTo(ex + 42, 192); ctx.stroke();
  } else {
    shade(ex - 50, 150, 40, 1.08, 0.5); shade(ex + 50, 150, 40, 1.08, 0.5);
    shade(ex, eyeY - 6, 70, 0.86, 0.35);
    shade(ex, 175, 40, 0.92, 0.3);
    if (!female && kind === 'human') shade(ex, 200, 60, 0.88, 0.35); // stubble shadow
    // eyes
    const iris = `#${eyeHex.toString(16).padStart(6, '0')}`;
    for (const s of [-1, 1]) {
      const x = ex + s * eyeDX;
      ctx.fillStyle = rgb(0.7, 0.6); ctx.beginPath(); ctx.ellipse(x, eyeY, 20, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = kind === 'cat' || kind === 'lizard' ? '#d8b030' : '#f2ece2';
      ctx.beginPath(); ctx.ellipse(x, eyeY, 15, 7.5, 0, 0, Math.PI * 2); ctx.fill();
      if (kind === 'cat' || kind === 'lizard') { ctx.fillStyle = '#100808'; ctx.fillRect(x - 1.8, eyeY - 7, 3.6, 14); }
      else {
        ctx.fillStyle = kind === 'dremora' ? '#ff4010' : iris; ctx.beginPath(); ctx.arc(x, eyeY, 6.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#100c0a'; ctx.beginPath(); ctx.arc(x, eyeY, 2.8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(x + 2, eyeY - 2, 1.4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = 'rgba(20,12,8,0.85)'; ctx.lineWidth = female ? 2.6 : 2;
      ctx.beginPath(); ctx.ellipse(x, eyeY, 15.5, 8, 0, Math.PI, Math.PI * 2); ctx.stroke();
      // brows
      ctx.strokeStyle = kind === 'lizard' ? rgb(0.6) : 'rgba(40,28,18,0.85)'; ctx.lineWidth = female ? 3 : 5;
      ctx.beginPath(); ctx.moveTo(x - s * 16, eyeY - 14); ctx.quadraticCurveTo(x, eyeY - (female ? 22 : 20), x + s * 18, eyeY - 15); ctx.stroke();
    }
    // nose
    ctx.strokeStyle = rgb(0.72, 0.6); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(ex - 6, eyeY + 10); ctx.quadraticCurveTo(ex - 10, 152, ex - 7, 158); ctx.stroke();
    ctx.fillStyle = rgb(0.6, 0.7);
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(ex + s * 8, 160, 4, 2.5, 0, 0, Math.PI * 2); ctx.fill(); }
    // mouth
    const lip = kind === 'human' || kind === 'orc' || kind === 'goblin' ? (female ? '#a05050' : 'rgba(120,60,50,0.9)') : rgb(0.5);
    ctx.fillStyle = lip;
    ctx.beginPath(); ctx.moveTo(ex - 22, 185); ctx.quadraticCurveTo(ex, 178, ex + 22, 185); ctx.quadraticCurveTo(ex, female ? 197 : 192, ex - 22, 185); ctx.fill();
    ctx.strokeStyle = 'rgba(40,16,12,0.8)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(ex - 22, 185); ctx.quadraticCurveTo(ex, 188, ex + 22, 185); ctx.stroke();
    if (kind === 'dremora') {
      ctx.strokeStyle = 'rgba(140,20,10,0.8)'; ctx.lineWidth = 4;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(ex + s * 20, 60); ctx.lineTo(ex + s * 40, 150); ctx.stroke(); }
    }
    if (kind === 'cat') {
      ctx.fillStyle = 'rgba(60,40,20,0.35)';
      for (let i = 0; i < 6; i++) { ctx.fillRect(ex - 60 + i * 22, 40, 6, 40); }
      ctx.fillStyle = '#3a2418'; ctx.beginPath(); ctx.moveTo(ex - 8, 150); ctx.lineTo(ex + 8, 150); ctx.lineTo(ex, 160); ctx.fill();
    }
    if (kind === 'lizard') {
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      for (let y = 0; y < 256; y += 9) for (let x = (y % 18) / 2; x < 256; x += 9) { ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill(); }
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  cache.set(key, t);
  return t;
}

export function furTex() {
  const n = pnoise(SIZE, 8, 191, 5);
  const rand = mulberry32(192);
  const h = new Float32Array(SIZE * SIZE);
  for (let i = 0; i < 26000; i++) {
    const x0 = rand() * SIZE, y0 = rand() * SIZE, len = 6 + rand() * 10;
    for (let k = 0; k < len; k++) {
      const x = Math.floor(x0 + k * 0.25) % SIZE, y = Math.floor(y0 + k) % SIZE;
      h[y * SIZE + x] = Math.max(h[y * SIZE + x], 0.3 + (k / len) * 0.7 * (0.6 + rand() * 0.4));
    }
  }
  return build('fur', (i, x, y, o) => {
    const v = 0.62 + h[i] * 0.35 + n[i] * 0.2;
    o[0] = v; o[1] = v * 0.97; o[2] = v * 0.93;
    o[3] = h[i];
  }, 2.0);
}

/** Photo texture for a kind if one was loaded, otherwise the given procedural fallback. */
export function photoOr(kind, fallback) {
  if (photo[kind]) return build(kind, () => {});
  return fallback();
}
