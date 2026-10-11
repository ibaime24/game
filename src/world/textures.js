// Procedural canvas textures (all tileable). Cached by key.
import * as THREE from 'three';
import { mulberry32 } from '../core/noise.js';

const cache = new Map();

/** Periodic value noise, returns Float32Array size*size in [0,1]. */
export function tileNoise(size, cells, seed = 1, octaves = 4) {
  const out = new Float32Array(size * size);
  let amp = 1, norm = 0;
  for (let o = 0; o < octaves; o++) {
    const c = cells << o;
    const rand = mulberry32(seed * 97 + o * 13);
    const lattice = new Float32Array(c * c);
    for (let i = 0; i < lattice.length; i++) lattice[i] = rand();
    for (let y = 0; y < size; y++) {
      const fy = (y / size) * c;
      const y0 = Math.floor(fy), ty = fy - y0;
      const sy = ty * ty * (3 - 2 * ty);
      const y1 = (y0 + 1) % c;
      for (let x = 0; x < size; x++) {
        const fx = (x / size) * c;
        const x0 = Math.floor(fx), tx = fx - x0;
        const sx = tx * tx * (3 - 2 * tx);
        const x1 = (x0 + 1) % c;
        const a = lattice[y0 * c + x0], b = lattice[y0 * c + x1];
        const d = lattice[y1 * c + x0], e = lattice[y1 * c + x1];
        const v = (a + (b - a) * sx) * (1 - sy) + (d + (e - d) * sx) * sy;
        out[y * size + x] += v * amp;
      }
    }
    norm += amp;
    amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= norm;
  return out;
}

function makeCanvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}

function finish(canvas, repeat = 1, srgb = true) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 16;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

function hexRGB(hex) {
  return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
}

/** Fill canvas with base colour modulated by noise. */
function noiseFill(ctx, size, base, variation, seed, cells = 8, octaves = 4) {
  const n = tileNoise(size, cells, seed, octaves);
  const img = ctx.createImageData(size, size);
  const [r, g, b] = hexRGB(base);
  for (let i = 0; i < size * size; i++) {
    const k = 1 + (n[i] - 0.5) * variation;
    img.data[i * 4] = Math.min(255, r * k);
    img.data[i * 4 + 1] = Math.min(255, g * k);
    img.data[i * 4 + 2] = Math.min(255, b * k);
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return n;
}

function cached(key, fn) {
  if (!cache.has(key)) cache.set(key, fn());
  return cache.get(key);
}

export function groundDetail() {
  return cached('ground', () => {
    const size = 256, c = makeCanvas(size), ctx = c.getContext('2d');
    noiseFill(ctx, size, 0xd8d8d8, 0.55, 3, 16, 5);
    // speckles: little grass strokes
    const rand = mulberry32(9);
    for (let i = 0; i < 1400; i++) {
      const x = rand() * size, y = rand() * size;
      const l = 140 + rand() * 115;
      ctx.strokeStyle = `rgba(${l},${l},${l},0.35)`;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rand() - 0.5) * 3, y - 2 - rand() * 4);
      ctx.stroke();
    }
    return finish(c, 1, false);
  });
}

export function stoneBlocks(base = 0x8a8478, key = 'stone') {
  return cached(key + base, () => {
    const size = 256, c = makeCanvas(size), ctx = c.getContext('2d');
    noiseFill(ctx, size, base, 0.45, 5, 8, 4);
    const rand = mulberry32(base & 0xffff);
    const rows = 8, rh = size / rows;
    ctx.lineWidth = 2;
    for (let r = 0; r < rows; r++) {
      const y = r * rh;
      ctx.strokeStyle = 'rgba(30,26,22,0.55)';
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke();
      let x = (r % 2) * (size / 8);
      while (x < size + 1) {
        const w = size / 4 * (0.6 + rand() * 0.6);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + rh); ctx.stroke();
        // shading per block
        const l = rand() * 30 - 15;
        ctx.fillStyle = l > 0 ? `rgba(255,255,255,${l / 255})` : `rgba(0,0,0,${-l / 255})`;
        ctx.fillRect(x + 1, y + 1, w - 2, rh - 2);
        x += w;
      }
    }
    return finish(c);
  });
}

export function plaster() {
  return cached('plaster', () => {
    const size = 256, c = makeCanvas(size), ctx = c.getContext('2d');
    noiseFill(ctx, size, 0xe0d6c0, 0.22, 11, 6, 5);
    return finish(c);
  });
}

export function woodPlanks(base = 0x6a4a2c, key = 'planks') {
  return cached(key + base, () => {
    const size = 256, c = makeCanvas(size), ctx = c.getContext('2d');
    const n = tileNoise(size, 4, 21, 3);
    const img = ctx.createImageData(size, size);
    const [r, g, b] = hexRGB(base);
    const planks = 6;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = y * size + x;
        const pi = Math.floor((x / size) * planks);
        const grain = Math.sin((y / size) * 60 + n[i] * 12 + pi * 3) * 0.12;
        let k = 1 + grain + (n[i] - 0.5) * 0.3 + ((pi * 37) % 7) / 50 - 0.06;
        if ((x % (size / planks)) < 2) k *= 0.45;
        img.data[i * 4] = Math.min(255, r * k);
        img.data[i * 4 + 1] = Math.min(255, g * k);
        img.data[i * 4 + 2] = Math.min(255, b * k);
        img.data[i * 4 + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return finish(c);
  });
}

export function roofTiles(base = 0x5a4a44) {
  return cached('roof' + base, () => {
    const size = 256, c = makeCanvas(size), ctx = c.getContext('2d');
    noiseFill(ctx, size, base, 0.35, 31, 8, 3);
    const rows = 12, rh = size / rows;
    for (let r = 0; r < rows; r++) {
      const y = r * rh;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(0, y + rh - 3, size, 3);
      for (let x = (r % 2) * 10; x < size; x += 20) {
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(x, y, 2, rh);
      }
    }
    return finish(c);
  });
}

export function bark() {
  return cached('bark', () => {
    const size = 128, c = makeCanvas(size), ctx = c.getContext('2d');
    const n = tileNoise(size, 4, 41, 4);
    const img = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const k = 0.6 + 0.5 * Math.abs(Math.sin(x / size * Math.PI * 10 + n[i] * 8)) * n[i];
      img.data[i * 4] = 95 * k; img.data[i * 4 + 1] = 72 * k; img.data[i * 4 + 2] = 50 * k; img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return finish(c);
  });
}

export function ayleidStone() {
  return cached('ayleid', () => {
    const size = 256, c = makeCanvas(size), ctx = c.getContext('2d');
    noiseFill(ctx, size, 0xc8c4b8, 0.25, 51, 8, 4);
    ctx.strokeStyle = 'rgba(90,90,100,0.5)';
    ctx.lineWidth = 2;
    for (let r = 0; r <= 4; r++) {
      ctx.beginPath(); ctx.moveTo(0, r * 64); ctx.lineTo(size, r * 64); ctx.stroke();
    }
    // engraved curling glyphs
    ctx.strokeStyle = 'rgba(80,90,110,0.45)';
    for (let i = 0; i < 4; i++) {
      const y = i * 64 + 32;
      ctx.beginPath();
      for (let x = 0; x <= size; x += 4) ctx.lineTo(x, y + Math.sin(x / 16) * 8);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(64 + (i % 2) * 128, y, 10, 0, Math.PI * 2); ctx.stroke();
    }
    return finish(c);
  });
}

export function oblivionRock() {
  return cached('obrock', () => {
    const size = 256, c = makeCanvas(size), ctx = c.getContext('2d');
    const n = tileNoise(size, 8, 61, 5);
    const img = ctx.createImageData(size, size);
    for (let i = 0; i < size * size; i++) {
      const v = n[i];
      const crack = Math.abs(v - 0.5) < 0.007 ? 1 : 0;
      img.data[i * 4] = 40 + v * 60 + crack * 110;
      img.data[i * 4 + 1] = 22 + v * 25 + crack * 30;
      img.data[i * 4 + 2] = 20 + v * 20;
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return finish(c);
  });
}

export function lava() {
  return cached('lava', () => {
    const size = 256, c = makeCanvas(size), ctx = c.getContext('2d');
    const n = tileNoise(size, 6, 71, 5);
    const img = ctx.createImageData(size, size);
    for (let i = 0; i < size * size; i++) {
      const v = Math.pow(n[i], 1.6);
      img.data[i * 4] = 255;
      img.data[i * 4 + 1] = 60 + v * 190;
      img.data[i * 4 + 2] = v * 60;
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return finish(c);
  });
}

export function fabric(base) {
  return cached('fabric' + base, () => {
    const size = 64, c = makeCanvas(size), ctx = c.getContext('2d');
    noiseFill(ctx, size, base, 0.2, 81, 4, 3);
    for (let i = 0; i < size; i += 2) {
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      ctx.fillRect(0, i, size, 1);
    }
    return finish(c);
  });
}

/** Radial soft sprite for particles/glows. */
export function softSprite() {
  return cached('sprite', () => {
    const size = 64, c = makeCanvas(size), ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.3, 'rgba(255,255,255,0.6)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const t = new THREE.CanvasTexture(c);
    return t;
  });
}
