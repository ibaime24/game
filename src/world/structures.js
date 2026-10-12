// Overworld architecture and points of interest.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { M, textPlank } from './builder.js';
import { buildTreeMesh } from './vegetation.js';
import { LOCATIONS, BRIDGE, ISLAND } from './layout.js';
import { Inventory } from '../data/items.js';
import { mat } from '../actors/models.js';
import { hasProp, makeProp, placeProp } from './props.js';
import { buildChorrol } from './chorrol.js';
import { roseVine, hangingBasket, flowerPot, picketFence, toadstools } from './cute.js';

const PI = Math.PI;

/** Local frame helper: returns world (x,z) for local offsets in a rotated frame. */
export function frame(x, z, rot) {
  const c = Math.cos(rot), s = Math.sin(rot);
  return (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
}

// ------------------------------------------------------------------ generic pieces
/** Leaded window: dark glass, timber frame, cross mullions, a sill. (lx,lz) in the house frame. */
function windowPane(b, P, rot, lx, lz, y, w, h, outward) {
  const [gx, gz] = P(lx, lz);
  const ox = Math.sin(rot) * outward * 0.04, oz = Math.cos(rot) * outward * 0.04;
  b.box(w, h, 0.05, 'window', gx, y, gz, rot, { collide: false, cast: false });
  const f = 0.09;
  b.box(w + f * 2, f, 0.1, 'timber', gx + ox, y + h / 2 + f / 2, gz + oz, rot, { collide: false, cast: false });
  b.box(w + f * 2, f, 0.1, 'timber', gx + ox, y - h / 2 - f / 2, gz + oz, rot, { collide: false, cast: false });
  const [lx1, lz1] = P(lx - w / 2 - f / 2, lz), [lx2, lz2] = P(lx + w / 2 + f / 2, lz);
  b.box(f, h, 0.1, 'timber', lx1 + ox, y, lz1 + oz, rot, { collide: false, cast: false });
  b.box(f, h, 0.1, 'timber', lx2 + ox, y, lz2 + oz, rot, { collide: false, cast: false });
  b.box(0.04, h, 0.07, 'iron', gx + ox, y, gz + oz, rot, { collide: false, cast: false });
  b.box(w, 0.04, 0.07, 'iron', gx + ox, y, gz + oz, rot, { collide: false, cast: false });
  b.box(w + 0.3, 0.07, 0.22, 'stone', gx + ox * 2, y - h / 2 - 0.1, gz + oz * 2, rot, { collide: false, cast: false });
}

// storybook paint: pastel plaster, warm timbers, cheerful doors and tinted roof tiles
const PLASTER = ['f4ead2', 'f2cfc4', 'f5e3a6', 'd4e8cf', 'cfdfee', 'e2d4ec', 'f6d6b4', 'f7efe4'];
const TIMBER = ['6a4630', '5a3a26', '7a5236', '4a3a4a', '3a4a5a'];
const DOORS = ['b8443a', '3a7a78', '3d5a8c', 'd9a83a', '4f7a3a', '8a3a6a', 'c46a3a'];
const ROOFS = ['roofred', 'roofred@ffb8a0', 'roof@9aaac8', 'roof@a8c098', 'roofred@f0c0d0', 'roof@c8b8d8', 'roofred'];
export function storybookPaint(seed) {
  const h = (k) => Math.abs(Math.floor(Math.sin(seed * 12.9898 + k * 78.233) * 43758.5453));
  return {
    plaster: 'plaster@' + PLASTER[h(1) % PLASTER.length],
    timber: 'timber@' + TIMBER[h(2) % TIMBER.length],
    doorPaint: 'wood@' + DOORS[h(3) % DOORS.length],
    roof: ROOFS[h(4) % ROOFS.length],
    stone: ['stone@f2e8d8', 'stone@e8e0d4', 'whitestone@fff4e6', 'stone@e0d8cc'][h(5) % 4],
  };
}

export function house(b, x, z, h0, w, d, rot, o = {}) {
  if (o.decor && !o.plaster) {
    const paint = storybookPaint(x * 0.37 + z * 0.91);
    o = { ...o, ...paint, ...(o.keepRoof ? { roof: o.roof } : {}) };
  }
  const P = frame(x, z, rot);
  const baseH = 3.4, upH = o.oneStorey ? 0 : 3.0;
  const base = o.stone ?? 'stone';
  b.box(w, baseH + 1.2, d, base, x, h0 + baseH / 2 - 0.6, z, rot);
  let top = h0 + baseH;
  if (upH) {
    b.box(w + 0.5, upH, d + 0.5, o.plaster ?? 'plaster', x, top + upH / 2, z, rot, { collide: false });
    // timber framing
    const beams = Math.max(2, Math.round(w / 2.2));
    for (let i = 0; i <= beams; i++) {
      const lx = -w / 2 - 0.25 + (i / beams) * (w + 0.5);
      for (const side of [-1, 1]) {
        const [bx, bz] = P(lx, side * (d / 2 + 0.28));
        b.box(0.22, upH, 0.08, (o.timber ?? 'timber'), bx, top + upH / 2, bz, rot, { collide: false, cast: false });
      }
    }
    for (const side of [-1, 1]) {
      const [bx, bz] = P(0, side * (d / 2 + 0.28));
      b.box(w + 0.6, 0.22, 0.1, (o.timber ?? 'timber'), bx, top + 0.1, bz, rot, { collide: false, cast: false });
      b.box(w + 0.6, 0.18, 0.1, (o.timber ?? 'timber'), bx, top + upH - 0.1, bz, rot, { collide: false, cast: false });
      // diagonal braces
      const [cx, cz] = P(side * (w / 4), d / 2 + 0.29);
      b.box(0.16, upH * 1.1, 0.06, (o.timber ?? 'timber'), cx, top + upH / 2, cz, rot, { collide: false, cast: false, rz: side * 0.6 });
    }
    // windows upstairs
    for (let i = -1; i <= 1; i += 2) {
      for (const side of [-1, 1]) windowPane(b, P, rot + (side < 0 ? Math.PI : 0), i * w / 4 * side, side * (d / 2 + 0.3), top + upH / 2, 0.85, 1.0, 1);
    }
    top += upH;
  }
  // ground floor windows, corner quoins and plinth
  for (const i of [-1, 1]) windowPane(b, P, rot, i * w / 3, d / 2 + 0.03, h0 + 1.8, 0.75, 0.85, 1);
  if (o.decor) houseDecor(b, P, rot, w, d, h0, upH, o);
  for (const [qx, qz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const [cx, cz] = P(qx * (w / 2 + 0.02), qz * (d / 2 + 0.02));
    b.box(0.5, baseH + 0.1, 0.5, 'darkstone', cx, h0 + baseH / 2 - 0.05, cz, rot, { collide: false, cast: false });
  }
  b.box(w + 0.3, 0.35, d + 0.3, 'darkstone', x, h0 + 0.1, z, rot, { collide: false, cast: false });
  b.roof(w + 1.4, d + 1.4, o.roofH ?? 3.2, o.roof ?? 'roof', x, top, z, rot);
  if (o.snowRoof) snowCap(b, P, x, z, top, w, d, rot, o.roofH ?? 3.2);
  b.box(w + 1.6, 0.22, 0.26, (o.timber ?? 'timber'), x, top + (o.roofH ?? 3.2) + 0.02, z, rot, { collide: false });
  // chimney
  const [chx, chz] = P(w / 2 - 1, -d / 4);
  b.box(0.9, 4, 0.9, 'stone', chx, top + 1.6, chz, rot, { collide: false });
  // door
  const [dx, dz] = P(0, d / 2 + 0.1);
  b.box(1.3, 2.3, 0.16, o.doorPaint ?? 'wood', dx, h0 + 1.15, dz, rot, { collide: false });
  for (const sx of [-1, 1]) { const [fx, fz] = P(sx * 0.78, d / 2 + 0.12); b.box(0.26, 2.6, 0.32, 'darkstone', fx, h0 + 1.3, fz, rot, { collide: false }); }
  b.box(1.9, 0.3, 0.34, 'darkstone', dx, h0 + 2.6, dz, rot, { collide: false });
  for (const hy of [0.5, 1.8]) { const [hx, hz] = P(-0.3, d / 2 + 0.2); b.box(0.75, 0.06, 0.03, 'iron', hx, h0 + hy, hz, rot, { collide: false, cast: false }); }
  const [ringX, ringZ] = P(0.4, d / 2 + 0.2);
  b.cyl(0.05, 0.05, 0.03, 'iron', ringX, h0 + 1.1, ringZ, { collide: false, cast: false, seg: 8 });
  const [ix, iz] = P(0, d / 2 + 0.8);
  const door = o.door || { kind: 'door', name: o.name || 'House', locked: true };
  b.interact({ ...door, pos: new THREE.Vector3(ix, h0 + 1.2, iz), radius: 1.3, name: o.name || door.name || 'House', verb: door.kind === 'door' && door.cell ? 'Enter' : 'Open' });
  // shop sign
  if (o.sign) {
    const [sx, sz] = P(1.6, d / 2 + 0.9);
    const [bx, bz] = P(1.6, d / 2 + 0.45);
    b.box(0.08, 0.08, 1.1, 'iron', bx, h0 + 3.1, bz, rot, { collide: false });
    const sgn = textPlank(o.sign, 1.6, 0.6);
    sgn.position.set(sx, h0 + 2.7, sz);
    sgn.rotation.y = rot + PI / 2;
    b.add(sgn);
  }
  if (o.clutter !== false && hasProp('wine_barrel_01')) houseClutter(b, P, rot, w, d, h0, Math.abs(Math.sin(x * 12.9898 + z * 78.233)) * 43758.5453, !!o.decor);
  return door;
}

/** A blanket of snow over a gabled roof, its edge rounded over the eaves, and icicles hanging from them. */
function snowCap(b, P, x, z, top, w, d, rot, roofH) {
  b.roof(w + 1.62, d + 1.66, roofH + 0.16, 'snow', x, top + 0.1, z, rot);
  for (const s of [-1, 1]) {
    const [ex, ez] = P(0, s * (d + 1.5) / 2);
    const lip = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, w + 1.55, 8), M('snow'));
    lip.rotation.set(0, rot, Math.PI / 2);
    lip.position.set(ex, top + 0.08, ez);
    b.add(lip);
  }
  // icicles along both eaves, longest in the middle where the meltwater runs
  const parts = [];
  const n = Math.round(w * 1.6);
  for (const s of [-1, 1]) {
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n;
      const len = 0.12 + Math.abs(Math.sin(i * 12.9898 + s * 4.1 + x)) * 0.45 * (0.5 + Math.sin(u * Math.PI) * 0.5);
      const g = new THREE.ConeGeometry(0.035 + len * 0.05, len, 5);
      g.rotateX(Math.PI);
      const [ix, iz] = P(-(w + 1.3) / 2 + u * (w + 1.3), s * (d + 1.42) / 2);
      g.translate(ix, top - len / 2 - 0.02, iz);
      parts.push(g);
    }
  }
  if (parts.length) {
    const ice = new THREE.Mesh(mergeGeometries(parts), M('ice'));
    b.add(ice);
  }
}

const SHUTTERS = [0x3a5a2a, 0x6a2a1a, 0x2a3a5a, 0x5a4a2a, 0x2a4a3a, 0x7a5a2a];
/**
 * The touches that make a town feel lived in: painted shutters, window boxes of flowers, a dormer,
 * a balcony, a shop awning, and smoke from the chimney.
 * o.decor: { shutter: hex, flowers, dormer, balcony, awning: 'clothred'|'clothgreen'|'cloth', smoke }
 */
function houseDecor(b, P, rot, w, d, h0, upH, o) {
  const D = o.decor;
  const sh = mat(D.shutter ?? SHUTTERS[Math.abs(Math.round(w * 7 + d * 3)) % SHUTTERS.length], { rough: 0.8 });
  const baseH = 3.4;
  const shutter = (lx, lz, y, h) => {
    for (const s of [-1, 1]) {
      const [x, z] = P(lx + s * 0.62, lz);
      b.box(0.42, h, 0.05, sh, x, y, z, rot + s * 0.25, { collide: false, cast: false });
    }
  };
  for (const i of [-1, 1]) shutter(i * w / 3, d / 2 + 0.1, h0 + 1.8, 0.95);
  if (upH) {
    for (const i of [-1, 1]) {
      const lx = i * w / 4;
      shutter(lx, d / 2 + 0.36, h0 + baseH + upH / 2, 1.1);
      if (D.flowers) {
        // a window box spilling over with flowers
        const [bx, bz] = P(lx, d / 2 + 0.5);
        b.box(1.05, 0.22, 0.3, 'timber', bx, h0 + baseH + upH / 2 - 0.66, bz, rot, { collide: false, cast: false });
        if (hasProp('celandine_01')) {
          for (let k = -1; k <= 1; k++) {
            const [fx, fz] = P(lx + k * 0.32, d / 2 + 0.5);
            const id = (k + i) % 2 ? 'celandine_01' : 'dandelion_01';
            const g = makeProp(id, { variant: (k + 2) * 3 + i, height: 0.28, shadow: false });
            g.position.set(fx, h0 + baseH + upH / 2 - 0.55, fz);
            g.rotation.y = rot + k;
            b.add(g);
          }
        }
      }
    }
  }
  if (D.balcony && upH) {
    // a timber balcony over the door, on carved brackets
    const [bx, bz] = P(0, d / 2 + 0.95);
    b.box(w * 0.42, 0.12, 1.1, 'timber', bx, h0 + baseH + 0.08, bz, rot, { collide: false });
    for (const s of [-1, 1]) {
      const [rx, rz] = P(s * w * 0.21, d / 2 + 0.95);
      b.box(0.08, 0.9, 1.1, 'timber', rx, h0 + baseH + 0.55, rz, rot, { collide: false, cast: false });
      const [kx, kz] = P(s * w * 0.18, d / 2 + 0.55);
      b.box(0.12, 0.6, 0.12, 'timber', kx, h0 + baseH - 0.3, kz, rot, { collide: false, cast: false, rx: 0.6 });
    }
    const [fx, fz] = P(0, d / 2 + 1.48);
    b.box(w * 0.42, 0.08, 0.06, 'timber', fx, h0 + baseH + 1.0, fz, rot, { collide: false, cast: false });
    for (let k = 0; k < 7; k++) {
      const [px, pz] = P(-w * 0.19 + (k / 6) * w * 0.38, d / 2 + 1.48);
      b.box(0.05, 0.9, 0.05, 'timber', px, h0 + baseH + 0.55, pz, rot, { collide: false, cast: false });
    }
  }
  if (D.dormer && upH) {
    // a dormer window in the front slope of the roof
    const top = h0 + baseH + upH;
    const [dx, dz] = P(-w * 0.18, d / 4 + 0.2);
    b.box(1.5, 1.3, 1.8, 'plaster', dx, top + 0.85, dz, rot, { collide: false, cast: false });
    b.roof(1.9, 2.1, 0.75, o.roof ?? 'roof', dx, top + 1.5, dz, rot + PI / 2);
    windowPane(b, P, rot, -w * 0.18, d / 4 + 1.12, top + 0.9, 0.6, 0.7, 1);
  }
  if (D.awning) {
    // a striped canvas awning over a shop door
    const [ax, az] = P(0, d / 2 + 0.9);
    const aw = b.box(2.8, 0.05, 1.5, D.awning, ax, h0 + 2.75, az, rot, { collide: false, rx: 0.32 });
    aw.castShadow = true;
    for (const s of [-1, 1]) {
      const [px, pz] = P(s * 1.3, d / 2 + 1.55);
      b.cyl(0.04, 0.04, 2.5, 'timber', px, h0 + 1.25, pz, { collide: false, cast: false, seg: 5 });
    }
  }
  // ---- storybook touches
  const hash = Math.abs(Math.round(w * 13 + d * 7 + h0 * 3 + (P(1, 0)[0] * 0.17)));
  // a round window in each gable end
  if (upH || D.oculus) {
    const top = h0 + baseH + (upH || 0);
    for (const s of [-1, 1]) {
      const [gx, gz] = P(s * (w / 2 + 0.72), 0);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.08, 6, 18), M(o.timber ?? 'timber'));
      ring.position.set(gx, top + (o.roofH ?? 3.2) * 0.38, gz);
      ring.rotation.y = rot + PI / 2;
      b.add(ring);
      const glass = new THREE.Mesh(new THREE.CircleGeometry(0.4, 16), M('window'));
      glass.position.copy(ring.position);
      glass.rotation.y = rot + PI / 2 + (s < 0 ? PI : 0);
      b.add(glass);
    }
  }
  // climbing roses up the front corners, one rose arch over the door
  const roseKinds = ['pink', 'red', 'white', 'gold'];
  const rk = roseKinds[hash % 4];
  for (const s of [-1, 1]) {
    if ((hash + s) % 3 === 0) continue;
    const [rx, rz] = P(s * (w / 2 - 0.55), d / 2 + 0.02);
    roseVine(b, rx, h0, rz, rot, 1.1, baseH * 0.95, rk);
  }
  if (hash % 2 === 0) {
    const [ax, az] = P(0, d / 2 + 0.04);
    roseVine(b, ax, h0 + 2.3, az, rot, 2.4, 1.0, roseKinds[(hash + 1) % 4]);
  }
  // hanging baskets either side of the door
  for (const s of [-1, 1]) {
    const [kx, kz] = P(s * 1.15, d / 2 + 0.35);
    const [ax, az] = P(s * 1.15, d / 2 + 0.18);
    b.box(0.05, 0.05, 0.4, 'iron', ax, h0 + 2.72, az, rot, { collide: false, cast: false });
    hangingBasket(b, kx, h0 + 2.25, kz, hash + s);
  }
  // pots of flowers on the doorstep
  for (const s of [-1, 1]) {
    const [fx, fz] = P(s * 0.95, d / 2 + 0.45);
    flowerPot(b, fx, h0, fz, hash + s + 3, 0.9);
  }
  // a little fenced front garden either side of the path
  if (D.garden !== false) {
    const gd = 1.45;
    for (const s of [-1, 1]) {
      const [ax, az] = P(s * 1.4, d / 2 + gd);
      const [cx, cz] = P(s * (w / 2 + 0.1), d / 2 + gd);
      const [ex, ez] = P(s * (w / 2 + 0.1), d / 2 + 0.25);
      picketFence(b, { x: ax, z: az }, { x: cx, z: cz }, h0);
      picketFence(b, { x: cx, z: cz }, { x: ex, z: ez }, h0);
      const span = w / 2 - 1.5;
      for (let k = 0; k < Math.max(2, Math.round(span / 0.55)); k++) {
        const t = 1.6 + (k / Math.max(1, Math.round(span / 0.55) - 1)) * (span - 0.4);
        for (const row of [0.75, 1.35]) {
          const [fx, fz] = P(s * t, d / 2 + row);
          if (hasProp('celandine_01')) {
            const id = ['celandine_01', 'dandelion_01', 'nettle_plant'][(k + (row > 1 ? 1 : 0) + hash) % 3];
            const f = makeProp(id, { variant: k * 2 + hash, height: 0.36 + ((k * 7) % 5) * 0.06, shadow: false });
            f.position.set(fx, h0 - 0.02, fz);
            f.rotation.y = k * 1.3;
            b.add(f);
          }
        }
      }
      if ((hash + s) % 4 === 0) {
        const [tx, tz] = P(s * (w / 2 - 0.5), d / 2 + 1.1);
        toadstools(b, tx, h0, tz, 4, hash + s, 0.8);
      }
    }
  }
  if (D.smoke) {
    const top = h0 + baseH + (upH || 0);
    const [cx, cz] = P(w / 2 - 1, -d / 4);
    b.emitter('smoke', cx, top + 3.7, cz, 0.7, { range: 140 });
  }
}

/** Everyday clutter around a house front and sides: barrels, buckets, crates, a bench by the door. */
function houseClutter(b, P, rot, w, d, h0, seed, frontGarden = false) {
  let st = Math.floor(seed) % 2147483647 || 1;
  const rnd = () => (st = (st * 16807) % 2147483647) / 2147483647;
  let spots = [[-w / 2 + 0.7, d / 2 + 0.55, 0], [w / 2 - 0.7, d / 2 + 0.55, 0], [-w / 2 - 0.6, d / 4, -PI / 2], [w / 2 + 0.6, -d / 4, PI / 2], [-w / 2 + 1.2, -d / 2 - 0.6, PI]];
  if (frontGarden) spots = spots.slice(2);
  const kits = [
    [['wine_barrel_01', 0, 0], ['wine_barrel_01', 0.7, 0.15], ['wooden_bucket_01', 0.35, -0.55]],
    [['wooden_crate_02', 0, 0], ['wooden_crate_01', 0, 0, 0.46]],
    [['wine_barrel_01', 0, 0], ['wooden_broom', 0.65, 0.05]],
    [['painted_wooden_bench', 0, 0]],
    [['wooden_bucket_02', 0, 0], ['wicker_basket_02', 0.6, 0.1]],
    [['wooden_ladder', 0, 0]],
    [['tree_stump_02', 0, 0, 0, 0.55], ['hatchet', 0.05, 0, 0.27]],
  ];
  const n = 2 + Math.floor(rnd() * 2);
  for (let i = 0; i < n; i++) {
    const [lx, lz, r] = spots[Math.floor(rnd() * spots.length)];
    const kit = kits[Math.floor(rnd() * kits.length)];
    for (const [id, ox, oz, oy = 0, sc = 1] of kit) {
      const [px, pz] = P(lx + ox, lz + oz);
      const o = { rot: rot + r + (rnd() - 0.5) * 0.4, scale: sc };
      if (id === 'hatchet') { o.rot = rot; }
      placeProp(b, id, px, h0 + oy, pz, { ...o, collide: oy === 0 });
    }
  }
}

export function steeple(b, x, z, h0, size, height, mat = 'stone', roofMat = 'roof') {
  b.box(size, height, size, mat, x, h0 + height / 2, z, 0);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(size * 0.8, size * 2.2, 4), M(roofMat));
  cone.position.set(x, h0 + height + size * 1.1, z);
  cone.rotation.y = PI / 4;
  cone.castShadow = true;
  b.add(cone);
}

function chapel(b, x, z, h0, rot, name) {
  const P = frame(x, z, rot);
  b.box(10, 7, 18, 'stone', x, h0 + 3, z, rot);
  b.roof(19, 11, 4.5, 'roof', x, h0 + 6.5, z, rot + PI / 2);
  const [tx, tz] = P(0, 9.5);
  steeple(b, tx, tz, h0, 4, 16);
  for (const s of [-1, 1]) for (let i = -1; i <= 1; i++) {
    const [wx, wz] = P(s * 5.05, i * 5);
    b.box(0.06, 3, 1.1, 'window', wx, h0 + 3.6, wz, rot, { collide: false, cast: false });
  }
  const [ix, iz] = P(0, 12.2);
  b.box(1.8, 3, 0.2, 'timber', ...P(0, 11.55).flatMap((v, i) => i === 0 ? [v, h0 + 1.5] : [v]), rot, { collide: false });
  b.interact({ kind: 'door', name, locked: true, lockMsg: 'The chapel doors are barred while the priests tend to the refugees from Kvatch.', pos: new THREE.Vector3(ix, h0 + 1.2, iz), radius: 1.5, verb: 'Open' });
}

export function lamp(b, x, z, h0) {
  b.cyl(0.08, 0.1, 3.2, 'iron', x, h0 + 1.6, z, { seg: 6 });
  b.box(0.35, 0.45, 0.35, 'window', x, h0 + 3.3, z, 0, { collide: false });
  b.light(0xffb060, 14, 14, x, h0 + 3.3, z, { night: true });
}

export function barrel(b, x, z, h0, o = {}) {
  let m;
  if (hasProp('wine_barrel_01')) m = placeProp(b, 'wine_barrel_01', x, h0, z, { scale: 1.15, rot: x * 3.1 });
  else {
    m = b.cyl(0.38, 0.34, 1.0, 'wood', x, h0 + 0.5, z, { seg: 10 });
    b.cyl(0.39, 0.39, 0.06, 'iron', x, h0 + 0.8, z, { collide: false, seg: 10 });
    b.cyl(0.39, 0.39, 0.06, 'iron', x, h0 + 0.2, z, { collide: false, seg: 10 });
  }
  if (o.container !== false) b.interact({ kind: 'container', id: o.id, name: 'Barrel', loot: 'barrel', owner: o.owner || null, pos: new THREE.Vector3(x, h0 + 0.8, z), radius: 0.7, verb: 'Open', mesh: m });
}

export function crate(b, x, z, h0, rot = 0, s = 1) {
  if (hasProp('wooden_crate_02')) { placeProp(b, s < 1 ? 'wooden_crate_01' : 'wooden_crate_02', x, h0, z, { rot, scale: 1.25 * s }); return; }
  b.box(0.9 * s, 0.9 * s, 0.9 * s, 'wood', x, h0 + 0.45 * s, z, rot, { tile: 1 });
}

export function chest(b, x, y, z, rot, o = {}) {
  if (hasProp('treasure_chest')) {
    const g = makeProp('treasure_chest', { scale: 1.05 });
    g.position.set(x, y, z);
    g.rotation.y = rot;
    b.add(g);
    b.col.addBox(x, z, 0.5, 0.28, rot, y, y + 0.65);
    return b.interact({
      kind: 'container', id: o.id, name: o.name || 'Chest', loot: o.loot || 'chest_common', items: o.items,
      lock: o.lock ? { level: o.lock } : null, owner: o.owner || null,
      pos: new THREE.Vector3(x, y + 0.5, z), radius: 0.9, verb: 'Open', mesh: g,
    });
  }
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.55, 0.65), M('wood'));
  body.position.y = 0.28;
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 1.1, 10, 1, false, 0, PI), M('wood'));
  lid.rotation.z = PI / 2;
  lid.position.y = 0.55;
  const band = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.08, 0.68), M('iron'));
  band.position.y = 0.45;
  const lockPlate = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.18, 0.04), M('gold'));
  lockPlate.position.set(0, 0.45, 0.34);
  for (const m of [body, lid, band, lockPlate]) { m.castShadow = true; g.add(m); }
  g.position.set(x, y, z);
  g.rotation.y = rot;
  b.add(g);
  b.col.addBox(x, z, 0.55, 0.33, rot, y, y + 0.7);
  return b.interact({
    kind: 'container', id: o.id, name: o.name || 'Chest', loot: o.loot || 'chest_common', items: o.items,
    lock: o.lock ? { level: o.lock } : null, owner: o.owner || null,
    pos: new THREE.Vector3(x, y + 0.5, z), radius: 0.9, verb: 'Open', mesh: g,
  });
}

function tent(b, x, z, h0, rot, matName = 'cloth') {
  const geo = new THREE.ConeGeometry(2.2, 2.6, 4, 1, true);
  const m = new THREE.Mesh(geo, M(matName));
  m.position.set(x, h0 + 1.3, z);
  m.rotation.y = rot + PI / 4;
  m.scale.set(1, 1, 1.4);
  m.castShadow = true;
  b.add(m);
  b.col.addCircle(x, z, 1.4, h0, h0 + 2.4, { walkable: false });
}

function campfire(b, x, z, h0) {
  if (hasProp('stone_fire_pit')) {
    placeProp(b, 'stone_fire_pit', x, h0 - 0.05, z, { collide: false, scale: 1.0, rot: x });
    for (let i = 0; i < 3; i++) b.box(0.12, 0.12, 0.9, 'timber', x, h0 + 0.12, z, i * 1.1, { collide: false });
    // logs to sit on
    for (const a of [0.6, 2.6, 4.4]) placeProp(b, 'dead_tree_trunk', x + Math.cos(a) * 2.2, h0, z + Math.sin(a) * 2.2, { rot: -a - PI / 2, scale: 0.7, collide: false });
    b.light(0xff8030, 30, 18, x, h0 + 1, z, { flicker: true });
    b.emitter('flame', x, h0 + 0.15, z, 25, { color: 0xff7020, size: 0.8 });
    b.emitter('smoke', x, h0 + 1.2, z, 2);
    b.col.addCircle(x, z, 0.8, h0, h0 + 0.4, { walkable: true });
    return;
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * PI * 2;
    b.box(0.35, 0.25, 0.3, 'darkstone', x + Math.cos(a) * 0.7, h0 + 0.12, z + Math.sin(a) * 0.7, a, { collide: false });
  }
  for (let i = 0; i < 3; i++) b.box(0.15, 0.15, 1.1, 'timber', x, h0 + 0.15, z, i * 1.1, { collide: false });
  b.light(0xff8030, 30, 18, x, h0 + 1, z, { flicker: true });
  b.emitter('flame', x, h0 + 0.15, z, 25, { color: 0xff7020, size: 0.8 });
  b.emitter('smoke', x, h0 + 1.2, z, 2);
  b.col.addCircle(x, z, 0.8, h0, h0 + 0.4, { walkable: true });
}

function bedroll(b, x, z, h0, rot, id, owner = null) {
  const m = b.box(0.9, 0.12, 2, 'clothred', x, h0 + 0.06, z, rot, { collide: false });
  b.interact({ kind: 'bed', id, name: 'Bedroll', owner, pos: new THREE.Vector3(x, h0 + 0.3, z), radius: 1.0, verb: 'Sleep', mesh: m });
}

function fence(b, x0, z0, x1, z1, h0fn) {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const n = Math.ceil(len / 2.5);
  const rot = Math.atan2(x1 - x0, z1 - z0) - PI / 2;
  for (let i = 0; i <= n; i++) {
    const x = x0 + (x1 - x0) * (i / n), z = z0 + (z1 - z0) * (i / n);
    const h = h0fn(x, z);
    b.box(0.15, 1.3, 0.15, 'timber', x, h + 0.55, z, 0, { collide: false });
    if (i < n) {
      const xm = x0 + (x1 - x0) * ((i + 0.5) / n), zm = z0 + (z1 - z0) * ((i + 0.5) / n);
      const hm = h0fn(xm, zm);
      b.box(len / n, 0.1, 0.06, 'timber', xm, hm + 0.9, zm, rot, { collide: false, cast: false });
      b.box(len / n, 0.1, 0.06, 'timber', xm, hm + 0.5, zm, rot, { collide: false, cast: false });
      b.col.addBox(xm, zm, len / n / 2, 0.1, rot, hm - 1, hm + 1.0, { walkable: false });
    }
  }
}

function signpost(b, x, z, h0, signs) {
  b.cyl(0.08, 0.1, 3, 'timber', x, h0 + 1.5, z, { seg: 6 });
  signs.forEach(([text, angle], i) => {
    const p = textPlank(text, 1.5, 0.28);
    p.position.set(x + Math.sin(angle) * 0.75, h0 + 2.6 - i * 0.35, z + Math.cos(angle) * 0.75);
    p.rotation.y = angle + PI / 2;
    p.castShadow = true;
    b.add(p);
  });
  b.interact({ kind: 'sign', name: 'Signpost', text: signs.map(([t]) => t).join(' · '), pos: new THREE.Vector3(x, h0 + 2.2, z), radius: 1.2, verb: 'Read' });
}

function wayshrine(b, x, z, h0, id, deity) {
  b.cyl(2.2, 2.4, 0.4, 'whitestone', x, h0 + 0.2, z, { seg: 8 });
  b.cyl(1.6, 1.8, 0.4, 'whitestone', x, h0 + 0.6, z, { seg: 8 });
  b.cyl(0.35, 0.45, 2.2, 'whitestone', x, h0 + 1.9, z, { seg: 8 });
  b.cyl(0.7, 0.4, 0.4, 'whitestone', x, h0 + 3.1, z, { seg: 8, collide: false });
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.35), M('varla'));
  gem.position.set(x, h0 + 3.7, z);
  gem.userData.spin = true;
  b.add(gem);
  b.light(0xffc070, 10, 10, x, h0 + 3.7, z, { flicker: false });
  b.interact({ kind: 'shrine', id, name: `Wayshrine of ${deity}`, deity, pos: new THREE.Vector3(x, h0 + 1.5, z), radius: 2.4, verb: 'Pray' });
}

function oak(b, x, z, h0, scale) {
  const m = buildTreeMesh('oak', scale, 77);
  m.position.set(x, h0 - 0.3, z);
  b.add(m);
  b.col.addCircle(x, z, 0.45 * scale, h0 - 1, h0 + 5 * scale, { walkable: false });
}

// ------------------------------------------------------------------ portal shader
export function portalMaterial(colorA = 0xff6010, colorB = 0x400000) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uA: { value: new THREE.Color(colorA) }, uB: { value: new THREE.Color(colorB) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `
      uniform float uTime; uniform vec3 uA; uniform vec3 uB; varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x), u.y); }
      void main(){
        vec2 c = vUv - 0.5;
        float r = length(c) * 2.0;
        float a = atan(c.y, c.x);
        float sw = a + r * 4.0 - uTime * 1.6;
        float v = n(vec2(sw * 2.0, r * 6.0 - uTime)) * 0.6 + n(vec2(sw * 5.0, r * 12.0)) * 0.4;
        vec3 col = mix(uB, uA, v + (1.0 - r) * 0.6);
        col += vec3(1.0, 0.7, 0.3) * pow(1.0 - r, 4.0) * 1.5;
        float alpha = smoothstep(1.0, 0.85, r);
        gl_FragColor = vec4(col * 1.6, alpha);
      }`,
    transparent: true, side: THREE.DoubleSide, depthWrite: false, forceSinglePass: true,
  });
}

/**
 * The Oblivion Gate: two great claws of black volcanic rock curving up out of a cracked, lava-veined dais and
 * all but meeting overhead, and between them a swirling door of fire. `fade` holds every material, so the
 * whole thing can fade in out of the ash as you come within fifty metres of it (see game.updateGateVisibility).
 */
function oblivionGate() {
  const gate = new THREE.Group();
  const fade = [];
  const own = (m) => { const c = m.clone(); c.transparent = true; c.userData.baseOpacity = c.opacity ?? 1; fade.push(c); return c; };
  const rock = own(M('obrock'));
  rock.flatShading = true;
  const lava = own(M('lava'));
  const vein = own(new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 0.55, 0.12) }));
  const ember = own(new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.35, 0.08) }));
  const rnd = (() => { let s = 4242; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  // a rough, flat-shaded lump: a displaced low-poly shape
  const lumpy = (geo, amt) => {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + (rnd() - 0.5) * amt, p.getY(i) + (rnd() - 0.5) * amt * 0.6, p.getZ(i) + (rnd() - 0.5) * amt);
    geo.computeVertexNormals();
    return geo;
  };
  // ---- the dais: three cracked plates of black rock, stepping up to the door
  for (const [r0, r1, h, y] of [[13, 14.5, 1.0, -0.4], [10.5, 11.5, 0.9, 0.4], [7.5, 8.4, 0.8, 1.15]]) {
    const plate = new THREE.Mesh(lumpy(new THREE.CylinderGeometry(r0, r1, h, 16, 1), 0.5), rock);
    plate.position.y = y;
    plate.receiveShadow = true; plate.castShadow = true;
    gate.add(plate);
  }
  // lava running in the cracks of the dais, and two pools before it
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + rnd() * 0.4;
    const len = 3 + rnd() * 5, r = 4 + rnd() * 6;
    const crack = new THREE.Mesh(new THREE.BoxGeometry(0.22 + rnd() * 0.2, 0.06, len), lava);
    crack.position.set(Math.sin(a) * r, 0.62 + (r < 7.5 ? 0.95 : 0.1), Math.cos(a) * r);
    crack.rotation.y = a + (rnd() - 0.5) * 0.6;
    gate.add(crack);
  }
  for (const s of [-1, 1]) {
    const pool = new THREE.Mesh(new THREE.CircleGeometry(1.8 + rnd(), 12), lava);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(s * 6.5, 0.12, 10.5);
    gate.add(pool);
  }
  // ---- the claws: tapering, gnarled horns that sweep up and in, with spines down their backs and lava in their seams
  const taper = (curve, r0, r1, n = 48, radial = 9) => {
    const geo = new THREE.TubeGeometry(curve, n, 1, radial, false);
    const p = geo.attributes.position;
    const pt = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      const ring = Math.floor(i / (radial + 1));
      const t = ring / n;
      curve.getPointAt(t, pt);
      const r = (r0 + (r1 - r0) * Math.pow(t, 0.8)) * (0.9 + rnd() * 0.22);
      p.setXYZ(i, pt.x + (p.getX(i) - pt.x) * r, pt.y + (p.getY(i) - pt.y) * r, pt.z + (p.getZ(i) - pt.z) * r);
    }
    geo.computeVertexNormals();
    return geo;
  };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  for (const s of [-1, 1]) {
    const claw = new THREE.CatmullRomCurve3([V(s * 7.2, 1, 0.4), V(s * 8.6, 6, 0.9), V(s * 8.2, 11.5, 0.5), V(s * 5.8, 16.4, -0.2), V(s * 2.2, 19.6, -0.7), V(s * 0.5, 20.4, -0.9)]);
    const horn = new THREE.Mesh(taper(claw, 2.1, 0.22), rock);
    horn.castShadow = true;
    gate.add(horn);
    // a slimmer inner rib, framing the door
    const rib = new THREE.CatmullRomCurve3([V(s * 5.4, 1.4, 1.2), V(s * 6.3, 7, 1.5), V(s * 5.6, 12.5, 1.1), V(s * 3.4, 16.2, 0.6), V(s * 1.0, 17.6, 0.4)]);
    const ribM = new THREE.Mesh(taper(rib, 0.85, 0.16, 36, 7), rock);
    ribM.castShadow = true;
    gate.add(ribM);
    // glowing seams of lava down the front of each claw
    const seam = new THREE.CatmullRomCurve3(claw.getPoints(24).map((q, i) => q.clone().add(V(-s * 0.15, 0, 1.3 - i * 0.035))));
    gate.add(new THREE.Mesh(taper(seam, 0.14, 0.04, 40, 5), vein));
    // spines down the outside of the claw, their tips smouldering
    for (let k = 0; k < 9; k++) {
      const t = 0.08 + k * 0.1;
      const q = claw.getPointAt(t), tan = claw.getTangentAt(t);
      const out = V(s, 0.35, 0).normalize();
      const len = 1.4 + (1 - t) * 1.6;
      const sp = new THREE.Mesh(new THREE.ConeGeometry(0.32 * (1.2 - t), len, 6), rock);
      sp.position.copy(q).addScaledVector(out, 1.6 * (1.15 - t));
      sp.quaternion.setFromUnitVectors(V(0, 1, 0), out.clone().add(tan.multiplyScalar(0.3)).normalize());
      sp.castShadow = true;
      gate.add(sp);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.1 * (1.2 - t), len * 0.28, 5), ember);
      tip.position.copy(sp.position).addScaledVector(sp.up.clone().applyQuaternion(sp.quaternion), len * 0.4);
      tip.quaternion.copy(sp.quaternion);
      gate.add(tip);
    }
  }
  // ---- the door of fire, with a burning rim
  const portalMat = portalMaterial();
  portalMat.uniforms.uOpacity = { value: 1 };
  portalMat.fragmentShader = portalMat.fragmentShader.replace('uniform float uTime;', 'uniform float uTime; uniform float uOpacity;').replace('col += vec3(1.0, 0.7, 0.3) * pow(1.0 - r, 4.0) * 1.5;', 'col += vec3(1.0, 0.55, 0.2) * pow(1.0 - r, 5.0) * 0.45;')
    // dimmer than the old door, so the swirl of fire reads instead of blooming into a white disc
    .replace('gl_FragColor = vec4(col * 1.6, alpha);', 'gl_FragColor = vec4(col * 0.85, alpha * uOpacity);');
  const portal = new THREE.Mesh(new THREE.CircleGeometry(1, 64), portalMat);
  portal.position.set(0, 9.2, 0.6);
  portal.scale.set(5.0, 7.6, 1);
  portal.renderOrder = 3;
  gate.add(portal);
  const back = portal.clone();
  back.rotation.y = Math.PI;
  back.position.z = 0.55;
  gate.add(back);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 6, 64), own(new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 0.55, 0.15), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
  rim.position.copy(portal.position).setZ(0.7);
  rim.scale.set(5.05, 7.65, 1);
  gate.add(rim);
  return { gate, portal, back, portalMats: [portalMat, back.material], fade };
}

// ------------------------------------------------------------------ the world
/** The ward over the Mages Guild's door: rings of sigils in additive blue light (hidden by game.js once it falls). */
function guildWard(x, y, z) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 128, 6, 64, 128, 120);
  grd.addColorStop(0, 'rgba(200,225,255,0.55)'); grd.addColorStop(0.6, 'rgba(110,160,255,0.22)'); grd.addColorStop(1, 'rgba(60,100,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 256);
  g.strokeStyle = 'rgba(220,235,255,0.9)'; g.lineWidth = 2;
  for (const r of [26, 44]) { g.beginPath(); g.arc(64, 128, r, 0, Math.PI * 2); g.stroke(); }
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    g.save(); g.translate(64 + Math.cos(a) * 35, 128 + Math.sin(a) * 35); g.rotate(a);
    g.beginPath(); g.moveTo(-3, -4); g.lineTo(3, 0); g.lineTo(-3, 4); g.stroke(); g.restore();
  }
  g.beginPath(); g.moveTo(64, 104); g.lineTo(84, 128); g.lineTo(64, 152); g.lineTo(44, 128); g.closePath(); g.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.6), new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  pane.position.set(x, y, z);
  pane.renderOrder = 6;
  pane.userData.dynamic = true;
  return pane;
}

export function buildWorldStructures(b, terrain, state) {
  const H = (x, z) => terrain.heightAt(x, z);

  // ===== Sewer exit =====
  {
    const L = LOCATIONS.sewer;
    const h0 = H(L.x, L.z);
    const rot = Math.atan2(260 - L.x, 260 - L.z); // face the lake
    const P = frame(L.x, L.z, rot);
    // mound + tunnel mouth behind the start point
    const [mx, mz] = P(0, -9);
    b.box(16, 9, 10, 'darkstone', mx, h0 + 3, mz, rot);
    const [ax, az] = P(0, -3.9);
    b.box(1.2, 5, 1.6, 'stone', ...P(-2.4, -3.9).flatMap((v, i) => i ? [v] : [v, h0 + 2.5]), rot);
    b.box(1.2, 5, 1.6, 'stone', ...P(2.4, -3.9).flatMap((v, i) => i ? [v] : [v, h0 + 2.5]), rot);
    b.box(6, 1.2, 1.6, 'stone', ax, h0 + 5.3, az, rot);
    b.box(3.6, 4.6, 0.2, 'dark', ...P(0, -4.2).flatMap((v, i) => i ? [v] : [v, h0 + 2.3]), rot, { collide: false });
    for (let i = -3; i <= 3; i++) {
      const [gx, gz] = P(i * 0.5, -3.3);
      b.cyl(0.05, 0.05, 4.6, 'iron', gx, h0 + 2.3, gz, { seg: 5, collide: false });
    }
    b.col.addBox(ax, az, 1.8, 0.3, rot, h0 - 1, h0 + 5);
    b.box(3.6, 0.1, 0.1, 'iron', ...P(0, -3.3).flatMap((v, i) => i ? [v] : [v, h0 + 1.5]), rot, { collide: false });
    b.interact({ kind: 'sign', name: 'Sewer Grate', text: 'The grate has swung shut behind you. There is no going back to the Imperial Sewers.', pos: new THREE.Vector3(ax, h0 + 1.5, az).add(new THREE.Vector3(Math.sin(rot), 0, Math.cos(rot)).multiplyScalar(0.8)), radius: 1.6, verb: 'Examine' });
    state.sewerSpawn = { x: P(0, -1)[0], z: P(0, -1)[1], y: h0, yaw: rot + PI };
  }

  // ===== Imperial City island =====
  {
    const cx = ISLAND.x, cz = ISLAND.z, h0 = ISLAND.h;
    const R = 62, segs = 40, wallH = 16;
    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * PI * 2, a1 = ((i + 1) / segs) * PI * 2, am = (a0 + a1) / 2;
      if (Math.abs(((am - PI + PI * 3) % (PI * 2)) - PI) < 0.08) {
        // west gate gap (facing the bridge)
        continue;
      }
      const x = cx + Math.cos(am) * R, z = cz + Math.sin(am) * R;
      const len = 2 * R * Math.sin(PI / segs) + 0.4;
      b.box(len, wallH, 3, 'whitestone', x, h0 + wallH / 2 - 1, z, am + PI / 2, { tile: 4 });
      if (i % 2 === 0) b.box(len * 0.4, 1.4, 3.2, 'whitestone', x, h0 + wallH, z, am + PI / 2, { collide: false });
    }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * PI * 2 + PI / 8;
      const x = cx + Math.cos(a) * R, z = cz + Math.sin(a) * R;
      b.cyl(5, 5.5, wallH + 6, 'whitestone', x, h0 + (wallH + 6) / 2 - 1, z, { seg: 14, tile: 4 });
      const cone = new THREE.Mesh(new THREE.ConeGeometry(5.8, 7, 14), M('roof'));
      cone.position.set(x, h0 + wallH + 8.5, z);
      cone.castShadow = true;
      b.add(cone);
    }
    // gate towers & door at west (angle PI)
    const gx = cx - R, gz = cz;
    b.cyl(4.5, 5, wallH + 10, 'whitestone', gx, h0 + (wallH + 10) / 2 - 1, gz - 7, { seg: 14, tile: 4 });
    b.cyl(4.5, 5, wallH + 10, 'whitestone', gx, h0 + (wallH + 10) / 2 - 1, gz + 7, { seg: 14, tile: 4 });
    b.box(4, 6, 10, 'whitestone', gx, h0 + wallH - 2, gz, 0);
    b.box(0.5, 9, 6, 'timber', gx - 0.5, h0 + 4.5, gz, 0);
    b.interact({ kind: 'sign', name: 'Imperial City Gate', text: 'The gates of the Imperial City are sealed by order of the Elder Council while the Emperor\'s assassins are hunted. "Stop right there!" a guard calls from the battlements. "No one enters until the Council says otherwise."', pos: new THREE.Vector3(gx - 1.5, h0 + 1.5, gz), radius: 3, verb: 'Open' });
    // inner districts
    b.cyl(36, 36, 22, 'whitestone', cx, h0 + 10, cz, { seg: 40, tile: 6 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * PI * 2;
      const dome = new THREE.Mesh(new THREE.SphereGeometry(7, 16, 10, 0, PI * 2, 0, PI / 2), M('roofred'));
      dome.position.set(cx + Math.cos(a) * 46, h0 + 9, cz + Math.sin(a) * 46);
      b.add(dome);
      b.box(12, 10, 12, 'plaster', cx + Math.cos(a) * 46, h0 + 4, cz + Math.sin(a) * 46, a, { collide: false });
    }
    // White-Gold Tower
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 10, 150, 24, 1), M('whitestone'));
    tower.position.set(cx, h0 + 75 + 20, cz);
    tower.castShadow = true;
    b.add(tower);
    for (let k = 0; k < 4; k++) {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(10.5 - k * 1.0, 10.5 - k * 1.0, 3, 24), M('whitestone'));
      ring.position.set(cx, h0 + 40 + k * 32, cz);
      b.add(ring);
    }
    const spire = new THREE.Mesh(new THREE.ConeGeometry(6.5, 40, 24), M('whitestone'));
    spire.position.set(cx, h0 + 170 + 20, cz);
    b.add(spire);
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * PI * 2;
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.8, 6, 0.3), M('window'));
      win.position.set(cx + Math.cos(a) * 7.6, h0 + 100 + (k % 3) * 20, cz + Math.sin(a) * 7.6);
      win.rotation.y = a + PI / 2;
      b.add(win);
    }
  }

  // ===== Bridge =====
  {
    const { x0, z0, x1, z1, y, width } = BRIDGE;
    const len = Math.hypot(x1 - x0, z1 - z0);
    const rot = Math.atan2(x1 - x0, z1 - z0) - PI / 2;
    const n = Math.ceil(len / 16);
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n, tm = (t0 + t1) / 2;
      const x = x0 + (x1 - x0) * tm, z = z0 + (z1 - z0) * tm;
      b.box(len / n + 0.05, 1, width, 'whitestone', x, y - 0.5, z, rot, { tile: 4 });
      for (const s of [-1, 1]) {
        const ox = -Math.sin(rot + PI / 2) * 0, oz = 0;
        const nx = Math.sin(rot) * s * (width / 2 - 0.2), nz = Math.cos(rot) * s * (width / 2 - 0.2);
        b.box(len / n + 0.05, 1.1, 0.4, 'whitestone', x + nx + ox, y + 0.55, z + nz + oz, rot, { walkable: false });
      }
      if (i > 0) {
        const px = x0 + (x1 - x0) * t0, pz = z0 + (z1 - z0) * t0;
        b.box(2.4, 16, width - 0.5, 'whitestone', px, y - 9, pz, rot, { tile: 4 });
      }
    }
  }

  // ===== Chorrol =====
  {
    const C = LOCATIONS.chorrol;
    const h0 = H(C.x, C.z);
    const S = 62, wallH = 8;
    const wall = (x, z, len, rot) => {
      b.box(len, wallH, 2, 'stone', x, h0 + wallH / 2 - 1, z, rot, { tile: 4 });
      const n = Math.floor(len / 2);
      for (let i = 0; i < n; i += 2) {
        const off = -len / 2 + 1 + i * 1;
        const c = Math.cos(rot), s = Math.sin(rot);
        b.box(0.9, 0.9, 2.1, 'stone', x + off * c, h0 + wallH - 0.5, z - off * s, rot, { collide: false, cast: false });
      }
    };
    const gap = 5;
    // south & north walls (along x), east & west (along z)
    wall(C.x - (S + gap) / 2, C.z + S, S - gap, 0);
    wall(C.x + (S + gap) / 2, C.z + S, S - gap, 0);
    wall(C.x, C.z - S, S * 2, 0);
    wall(C.x - S, C.z, S * 2, PI / 2);
    wall(C.x + S, C.z - (S + gap) / 2, S - gap, PI / 2);
    wall(C.x + S, C.z + (S + gap) / 2, S - gap, PI / 2);
    for (const [tx, tz] of [[-S, -S], [S, -S], [-S, S], [S, S], [-gap - 1, S], [gap + 1, S], [S, -gap - 1], [S, gap + 1]]) {
      b.cyl(3, 3.4, wallH + 4, 'stone', C.x + tx, h0 + (wallH + 4) / 2 - 1, C.z + tz, { seg: 12, tile: 4 });
      const cone = new THREE.Mesh(new THREE.ConeGeometry(3.8, 5, 12), M('roof'));
      cone.position.set(C.x + tx, h0 + wallH + 5.5, C.z + tz);
      cone.castShadow = true;
      b.add(cone);
    }
    // gate arches
    b.box(gap * 2 + 2, 2.5, 2.4, 'stone', C.x, h0 + wallH - 0.25, C.z + S, 0, { collide: false });
    b.box(2.4, 2.5, gap * 2 + 2, 'stone', C.x + S, h0 + wallH - 0.25, C.z, 0, { collide: false });
    const banner = (x, z, rot) => { const m = b.box(1.4, 3, 0.05, 'clothgreen', x, h0 + 5, z, rot, { collide: false }); return m; };
    banner(C.x - gap - 3.6, C.z + S + 1.05, 0); banner(C.x + gap + 3.6, C.z + S + 1.05, 0);

    // the Great Oak
    oak(b, C.x, C.z, h0, 2.6);
    b.cyl(5.5, 5.8, 0.5, 'stone', C.x, h0 + 0.1, C.z, { seg: 20, collide: false });
    // benches around the Great Oak, a bucket at the well
    if (hasProp('painted_wooden_bench')) {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * PI * 2 + 0.3;
        placeProp(b, 'painted_wooden_bench', C.x + Math.cos(a) * 7.2, h0, C.z + Math.sin(a) * 7.2, { rot: -a + PI / 2 + PI, scale: 1.1 });
      }
      placeProp(b, 'wooden_bucket_01', C.x + 13.3, h0, C.z + 12.6, { rot: 0.4 });
      placeProp(b, 'wooden_barrels_01', C.x - 20, h0, C.z + 38, { variant: 0, rot: 0.3 });
      placeProp(b, 'wooden_barrels_01', C.x - 19, h0, C.z + 39.2, { variant: 1, rot: 1.3 });
      placeProp(b, 'spinning_wheel_01', C.x - 40, h0, C.z + 10, { rot: PI / 2 });
      placeProp(b, 'gothic_statue', C.x + 20, h0, C.z - 30, { rot: -PI / 2, scale: 1.4 });
    }
    // well & stalls
    b.cyl(1.0, 1.0, 1.0, 'stone', C.x + 12, h0 + 0.5, C.z + 12, { seg: 12 });
    b.box(0.15, 2.2, 0.15, 'timber', C.x + 11.2, h0 + 1.6, C.z + 12, 0, { collide: false });
    b.box(0.15, 2.2, 0.15, 'timber', C.x + 12.8, h0 + 1.6, C.z + 12, 0, { collide: false });
    b.roof(2.2, 2.2, 0.8, 'roof', C.x + 12, h0 + 2.7, C.z + 12, PI / 2);
    for (const [sx, sz, r] of [[-12, 14, 0.2], [14, -12, 1.4]]) {
      const P = frame(C.x + sx, C.z + sz, r);
      b.box(3, 0.9, 1.4, 'wood', C.x + sx, h0 + 0.45, C.z + sz, r);
      for (const [lx, lz] of [[-1.4, -0.7], [1.4, -0.7], [-1.4, 0.7], [1.4, 0.7]]) {
        const [px, pz] = P(lx, lz);
        b.box(0.1, 2.4, 0.1, 'timber', px, h0 + 1.2, pz, r, { collide: false });
      }
      const awn = b.box(3.4, 0.06, 2, 'clothred', C.x + sx, h0 + 2.5, C.z + sz, r, { collide: false, rx: 0.2 });
      awn.castShadow = true;
      if (hasProp('wicker_basket_01')) {
        // baskets of produce for sale
        const produce = ['food_apple_01', 'yellow_onion', 'lemon', 'food_pears_asian_01', 'sweet_potato'];
        for (let i = 0; i < 3; i++) {
          const [px, pz] = P(-0.95 + i * 0.95, 0.05);
          placeProp(b, 'wicker_basket_01', px, h0 + 0.9, pz, { rot: r + (i - 1) * 0.2, collide: false });
          const pid = produce[(i + (sx > 0 ? 2 : 0)) % produce.length];
          for (let k = 0; k < 5; k++) {
            const [fx, fz] = P(-0.95 + i * 0.95 + ((k % 3) - 1) * 0.08, 0.05 + (k < 3 ? -0.05 : 0.06));
            placeProp(b, pid, fx, h0 + 0.95 + (k > 2 ? 0.04 : 0), fz, { rot: k * 1.7, collide: false, shadow: false });
          }
        }
        const [jx, jz] = P(1.35, -0.45);
        placeProp(b, 'wooden_crate_01', jx, h0, jz + 0.9, { rot: r, collide: false });
      } else {
        for (let i = 0; i < 4; i++) {
          const [px, pz] = P(-1 + i * 0.66, 0);
          const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 4), mat([0xc02020, 0x40a020, 0xe0c020, 0xc06010][i]));
          fruit.position.set(px, h0 + 0.98, pz);
          b.add(fruit);
        }
      }
    }

    // buildings
    house(b, C.x - 24, C.z + 30, h0, 14, 10, PI / 2, { decor: { flowers: true, smoke: true, balcony: true, dormer: false }, name: 'The Grey Mare', sign: 'The Grey Mare', door: { kind: 'door', cell: 'inn', name: 'The Grey Mare' } });
    house(b, C.x + 24, C.z + 30, h0, 12, 10, -PI / 2, { decor: { flowers: true, smoke: true, balcony: false, dormer: false }, name: 'Northern Goods and Trade', sign: 'Northern Goods', door: { kind: 'door', cell: 'shop', name: 'Northern Goods and Trade' } });
    house(b, C.x - 26, C.z - 24, h0, 10, 8, PI / 2, { decor: { flowers: true, smoke: true, balcony: false, dormer: true }, name: "Reynald Jemane's House", door: { kind: 'door', name: "Reynald Jemane's House", locked: true, lockLevel: 3 } });
    house(b, C.x - 44, C.z + 6, h0, 10, 8, PI / 2, { decor: { flowers: true, smoke: true, balcony: false, dormer: false }, name: "Laythe Wavrick's House", door: { kind: 'door', name: "Laythe Wavrick's House", locked: true, lockLevel: 2 } });
    house(b, C.x + 42, C.z + 44, h0, 10, 8, -PI / 2, { decor: { flowers: true, smoke: true, balcony: true, dormer: false }, name: "Valus Odiil's House", door: { kind: 'door', name: "Valus Odiil's House", locked: true, lockLevel: 4 } });
    house(b, C.x - 44, C.z + 44, h0, 12, 9, PI / 2, { decor: { flowers: true, smoke: true, balcony: false, dormer: false }, name: 'Fighters Guild', sign: 'Fighters Guild', door: { kind: 'door', name: 'Fighters Guild', locked: true, lockMsg: 'A note on the door reads: "Closed. Gone to Kvatch to fight the Daedra. — Modryn Oreyn"' } });
    house(b, C.x + 15, C.z + 48, h0, 10, 8, PI, { decor: { flowers: true, smoke: true, balcony: false, dormer: true }, name: 'Mages Guild', sign: 'Mages Guild', door: { kind: 'door', cell: 'mages_guild', name: 'Mages Guild', guildDoor: true } });
    // the ward the Magister has held over the Guild's door for nine days: a pane of shimmering blue sigils
    state.guildWard = guildWard(C.x + 15, h0 + 1.3, C.z + 48 - 4.32);
    b.add(state.guildWard);
    house(b, C.x + 44, C.z + 4, h0, 9, 8, -PI / 2, { decor: { flowers: true, smoke: true, balcony: false, dormer: false }, name: "Glarthir's House", door: { kind: 'door', name: "Glarthir's House", locked: true, lockLevel: 5 } });
    chapel(b, C.x + 32, C.z - 22, h0, -PI / 2, 'Chapel of Stendarr');
    // Castle Chorrol (north)
    {
      const kx = C.x, kz = C.z - 46;
      b.box(28, 15, 16, 'stone', kx, h0 + 7, kz, 0, { tile: 4 });
      b.roof(29, 17, 6, 'roof', kx, h0 + 14.5, kz, 0);
      for (const sx of [-1, 1]) {
        b.cyl(4, 4.4, 22, 'stone', kx + sx * 15, h0 + 10, kz + 7, { seg: 14, tile: 4 });
        const cone = new THREE.Mesh(new THREE.ConeGeometry(5, 7, 14), M('roof'));
        cone.position.set(kx + sx * 15, h0 + 24.5, kz + 7);
        b.add(cone);
      }
      b.box(3, 4.5, 0.3, 'timber', kx, h0 + 2.2, kz + 8.1, 0, { collide: false });
      b.interact({ kind: 'door', name: 'Castle Chorrol', locked: true, lockMsg: 'A guard bars your way: "The Countess Arriana Valga is not receiving petitioners today."', pos: new THREE.Vector3(kx, h0 + 1.5, kz + 9), radius: 2, verb: 'Open' });

    }
    // barrels, crates (lantern posts are part of the town plan in chorrol.js)
    barrel(b, C.x - 16, C.z + 24, h0, { id: 'chorrol_barrel_1', owner: 'Emfrid' });
    barrel(b, C.x - 16.8, C.z + 25.2, h0, { id: 'chorrol_barrel_2' });
    barrel(b, C.x + 16, C.z + 24, h0, { id: 'chorrol_barrel_3', owner: 'Seed-Neeus' });
    crate(b, C.x + 17, C.z + 26, h0, 0.3);
    crate(b, C.x + 17.2, C.z + 26.1, h0 + 0.9, 0.7, 0.8);
    crate(b, C.x - 12, C.z - 36, h0, 0.1);
    // haystacks & cart
    b.cyl(1.2, 1.5, 1.8, 'hay', C.x - 50, h0 + 0.9, C.z - 40, { seg: 10 });
    b.cyl(1.2, 1.5, 1.8, 'hay', C.x - 47, h0 + 0.9, C.z - 44, { seg: 10 });
    b.box(1.8, 0.6, 3.2, 'wood', C.x + 6, h0 + 0.9, C.z + 58, 0.2);
    for (const s of [-1, 1]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.12, 12), M('timber'));
      wheel.rotation.z = PI / 2;
      wheel.position.set(C.x + 6 + s * 1 * Math.cos(0.2), h0 + 0.6, C.z + 58 - s * Math.sin(0.2));
      b.add(wheel);
    }
    signpost(b, C.x + 8, C.z + S + 6, H(C.x + 8, C.z + S + 6), [['Weynon Priory', PI * 0.8], ['Kvatch', PI], ['Imperial City', PI * 0.6]]);
    buildChorrol(b, H);
  }

  // ===== Weynon Priory =====
  {
    const P0 = LOCATIONS.priory;
    const h0 = H(P0.x, P0.z);
    house(b, P0.x, P0.z, h0, 12, 9, 0, { name: 'Weynon House', stone: 'stone', door: { kind: 'door', cell: 'priory', name: 'Weynon House' } });
    chapel(b, P0.x + 18, P0.z - 6, h0, 0, 'Weynon Priory Chapel');
    const hp = (x, z) => H(x, z);
    fence(b, P0.x - 32, P0.z - 12, P0.x - 12, P0.z - 12, hp);
    fence(b, P0.x - 32, P0.z - 12, P0.x - 32, P0.z + 12, hp);
    fence(b, P0.x - 32, P0.z + 12, P0.x - 12, P0.z + 12, hp);
    b.box(6, 3, 4, 'wood', P0.x - 22, h0 + 1.5, P0.z - 8, 0);
    b.roof(6.6, 4.6, 1.6, 'roof', P0.x - 22, h0 + 3, P0.z - 8, 0);
    b.cyl(1.2, 1.5, 1.8, 'hay', P0.x - 26, h0 + 0.9, P0.z + 4, { seg: 10 });
    chest(b, P0.x + 7.5, h0, P0.z + 6, 0, { id: 'priory_chest', loot: 'chest_common', owner: 'Prior Maborel' });
    if (hasProp('wooden_ladder')) {
      placeProp(b, 'wooden_ladder', P0.x - 19.5, h0, P0.z - 5.6, { rot: 0 });
      placeProp(b, 'wooden_barrels_01', P0.x - 25, h0, P0.z - 4, { variant: 2, rot: 0.5, collide: false });
      placeProp(b, 'tree_stump_01', P0.x - 16, h0, P0.z + 2, { scale: 0.7 });
      placeProp(b, 'wooden_axe', P0.x - 16, h0 + 0.38, P0.z + 2, { rot: 0.4, collide: false });
      placeProp(b, 'rusted_spade_01', P0.x - 24.6, h0, P0.z - 5.9, { rot: 0.2, collide: false });
      placeProp(b, 'wooden_bucket_02', P0.x - 22.8, h0, P0.z - 5.6, {});
      placeProp(b, 'marble_bust_01', P0.x + 18, h0 + 1.0, P0.z + 6.5, { scale: 1.6, collide: false });
      b.box(0.8, 1.0, 0.8, 'stone', P0.x + 18, h0 + 0.5, P0.z + 6.5, 0);
    }
  }

  // ===== Roxey Inn =====
  {
    const L = LOCATIONS.roxey_inn;
    const h0 = H(L.x, L.z);
    house(b, L.x, L.z - 4, h0, 14, 10, 0.6, { name: 'Roxey Inn', sign: 'Roxey Inn', roof: 'roofred', door: { kind: 'door', name: 'Roxey Inn', locked: true, lockMsg: 'The common room is full of Kvatch refugees. Mirabelle serves travellers out front.' } });
    if (hasProp('painted_wooden_table')) {
      for (const [tx, tz] of [[4, 8], [-3, 9]]) {
        placeProp(b, 'painted_wooden_table', L.x + tx, h0, L.z + tz, { rot: 0.6, scale: 0.75 });
        for (const s2 of [-1, 1]) placeProp(b, 'painted_wooden_bench', L.x + tx + s2 * 0.9 * Math.sin(0.6), h0, L.z + tz + s2 * 0.9 * Math.cos(0.6), { rot: 0.6 + (s2 > 0 ? PI : 0), scale: 1.2 });
        placeProp(b, 'wine_bottles_01', L.x + tx, h0 + 0.72, L.z + tz, { variant: (tx > 0 ? 1 : 3), collide: false });
      }
      placeProp(b, 'wooden_barrels_01', L.x + 9, h0, L.z + 3, { variant: 0, rot: 0.6 });
    } else b.box(2.4, 0.8, 1.2, 'wood', L.x + 4, h0 + 0.4, L.z + 8, 0.6);
    barrel(b, L.x + 6.5, L.z + 6, h0, { id: 'roxey_barrel', owner: 'Mirabelle Monet' });
    lamp(b, L.x + 3, L.z + 10, h0);
  }

  // ===== Wayshrines & signposts =====
  wayshrine(b, LOCATIONS.wayshrine_akatosh.x, LOCATIONS.wayshrine_akatosh.z, H(LOCATIONS.wayshrine_akatosh.x, LOCATIONS.wayshrine_akatosh.z), 'shrine_akatosh', 'Akatosh');
  wayshrine(b, LOCATIONS.wayshrine_dibella.x, LOCATIONS.wayshrine_dibella.z, H(LOCATIONS.wayshrine_dibella.x, LOCATIONS.wayshrine_dibella.z), 'shrine_dibella', 'Dibella');
  signpost(b, -104, -48, H(-104, -48), [['Chorrol', -2.2], ['Kvatch', 2.6], ['Imperial City', 0.6]]);
  signpost(b, 16, 74, H(16, 74), [['Vilverin', 2.0], ['Chorrol', -1.0], ['Imperial City', 0.0]]);
  signpost(b, 116, -2, H(116, -2), [['Black Road', 2.6], ['Vilverin', 1.6]]);

  // ===== Vilverin =====
  {
    const V = LOCATIONS.vilverin;
    const h0 = H(V.x, V.z);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * PI * 2;
      const broken = i % 3 === 1;
      const ph = broken ? 2 + (i % 2) * 2 : 7;
      b.cyl(0.6, 0.75, ph, 'ayleid', V.x + Math.cos(a) * 11, h0 + ph / 2 - 0.3, V.z + Math.sin(a) * 11, { seg: 10, tile: 2 });
      if (!broken && i % 2 === 0) {
        const a2 = ((i + 1) / 8) * PI * 2;
        const mx = V.x + Math.cos((a + a2) / 2) * 10.9, mz = V.z + Math.sin((a + a2) / 2) * 10.9;
        b.box(2 * 11 * Math.sin(PI / 8) + 1.2, 0.8, 1, 'ayleid', mx, h0 + 7.2, mz, (a + a2) / 2 + PI / 2, { collide: false });
      }
    }
    // fallen blocks
    for (let i = 0; i < 6; i++) {
      const a = i * 1.7;
      b.box(1.2 + (i % 2), 0.8, 2, 'ayleid', V.x + Math.cos(a) * (14 + i), h0 + 0.2, V.z + Math.sin(a) * (14 + i), a, { rz: 0.1 * (i % 3), collide: true });
    }
    // dais & entrance
    b.cyl(6, 6.5, 0.6, 'ayleid', V.x, h0 + 0.1, V.z, { seg: 24, tile: 2 });
    b.box(4, 4, 2.4, 'ayleid', V.x, h0 + 2.3, V.z - 1, 0, { tile: 2 });
    b.box(4.8, 0.8, 3, 'ayleid', V.x, h0 + 4.6, V.z - 1, 0, { collide: false, tile: 2 });
    b.box(2.2, 3, 0.1, 'dark', V.x, h0 + 1.9, V.z + 0.25, 0, { collide: false });
    const wel = new THREE.Mesh(new THREE.OctahedronGeometry(0.3), M('welkynd'));
    wel.position.set(V.x, h0 + 5.4, V.z - 1);
    wel.userData.spin = true;
    b.add(wel);
    b.light(0x60a0ff, 14, 12, V.x, h0 + 4, V.z + 1, { flicker: false });
    b.interact({ kind: 'door', cell: 'vilverin', name: 'Vilverin', pos: new THREE.Vector3(V.x, h0 + 1.2, V.z + 1.0), radius: 1.6, verb: 'Enter' });
  }

  // ===== Bandit camp =====
  {
    const Bc = LOCATIONS.bandit_camp;
    const h0 = H(Bc.x, Bc.z);
    campfire(b, Bc.x, Bc.z, h0);
    tent(b, Bc.x - 7, Bc.z - 4, H(Bc.x - 7, Bc.z - 4), 0.4, 'clothred');
    tent(b, Bc.x + 6, Bc.z - 6, H(Bc.x + 6, Bc.z - 6), -0.3);
    tent(b, Bc.x + 1, Bc.z + 8, H(Bc.x + 1, Bc.z + 8), 1.2);
    bedroll(b, Bc.x - 3, Bc.z + 3, h0, 0.5, 'bandit_bed_1', 'Bandits');
    bedroll(b, Bc.x + 4, Bc.z + 2, h0, -0.4, 'bandit_bed_2', null);
    chest(b, Bc.x - 6, H(Bc.x - 6, Bc.z + 6), Bc.z + 6, 0.8, { id: 'brugo_chest', loot: 'chest_boss', lock: 2, name: "Brugo's Strongbox" });
    crate(b, Bc.x + 9, Bc.z + 1, H(Bc.x + 9, Bc.z + 1), 0.4);
    crate(b, Bc.x + 9.8, Bc.z + 1.7, H(Bc.x + 9.8, Bc.z + 1.7), 0.9);
    barrel(b, Bc.x + 8, Bc.z + 3, H(Bc.x + 8, Bc.z + 3), { id: 'bandit_barrel' });
    if (hasProp('kite_shield')) {
      placeProp(b, 'kite_shield', Bc.x + 7.2, H(Bc.x + 7.2, Bc.z - 1) + 0.0, Bc.z - 1, { rot: 0.4, collide: false });
      placeProp(b, 'wine_barrel_01', Bc.x - 9, H(Bc.x - 9, Bc.z), Bc.z, { rot: 1.1 });
      placeProp(b, 'tree_stump_02', Bc.x + 3, H(Bc.x + 3, Bc.z - 9), Bc.z - 9, { scale: 0.8 });
      placeProp(b, 'hatchet', Bc.x + 3, H(Bc.x + 3, Bc.z - 9) + 0.42, Bc.z - 9, { collide: false });
      placeProp(b, 'dry_branches_medium_01', Bc.x - 2, H(Bc.x - 2, Bc.z - 7), Bc.z - 7, { collide: false });
      placeProp(b, 'brass_pot_01', Bc.x + 1.1, H(Bc.x + 1.1, Bc.z + 0.9), Bc.z + 0.9, { collide: false });
    }
    // palisade
    for (let i = 0; i < 14; i++) {
      const a = PI * 0.15 + (i / 14) * PI * 1.3;
      const x = Bc.x + Math.cos(a) * 16, z = Bc.z + Math.sin(a) * 16;
      const hh = H(x, z);
      b.cyl(0.18, 0.22, 3.4, 'timber', x, hh + 1.4, z, { seg: 6 });
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 6), M('timber'));
      tip.position.set(x, hh + 3.35, z);
      b.add(tip);
    }
  }

  // ===== Kvatch (burned) & the Oblivion Gate =====
  {
    const K = LOCATIONS.kvatch;
    const h0 = H(K.x, K.z);
    const R = 48;
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * PI * 2;
      if (i % 5 === 3) continue; // breaches
      const x = K.x + Math.cos(a) * R, z = K.z + Math.sin(a) * R;
      const hh = 4 + ((i * 7) % 5) * 1.6;
      b.box(2 * R * Math.sin(PI / 28) + 0.3, hh, 2.2, 'burnt', x, H(x, z) + hh / 2 - 1, z, a + PI / 2, { tile: 4 });
    }
    // ruined buildings
    const ruins = [[-20, 8, 10, 8, 0.2], [14, -12, 12, 9, 1.1], [0, 22, 9, 9, 0.5], [22, 16, 8, 10, 2.0], [-18, -20, 14, 10, 0.9]];
    for (const [dx, dz, w, d, r] of ruins) {
      const x = K.x + dx, z = K.z + dz;
      const P = frame(x, z, r);
      const hh = 3 + ((dx + dz) & 3);
      for (const [lx, lz, ww, dd] of [[0, d / 2, w, 0.6], [0, -d / 2, w * 0.6, 0.6], [w / 2, 0, 0.6, d], [-w / 2, 0, 0.6, d * 0.7]]) {
        const [wx, wz] = P(lx, lz);
        b.box(ww, hh, dd, 'burnt', wx, h0 + hh / 2 - 0.5, wz, r);
      }
      for (let k = 0; k < 3; k++) {
        const [bx, bz] = P((k - 1) * 2, 0);
        b.box(0.3, 0.3, d * 0.9, 'dark', bx, h0 + hh - 0.5, bz, r + 0.2 * k, { collide: false, rz: 0.15 });
      }
      b.emitter('flame', x, h0 + 0.2, z, 8, { color: 0xff6010, size: 1.7 });
      b.emitter('smoke', x, h0 + 2, z, 1.5);
      b.light(0xff6020, 22, 20, x, h0 + 2, z, { flicker: true });
    }
    // chapel ruin with steeple stump
    steeple(b, K.x + 4, K.z - 2, h0, 6, 10, 'burnt', 'dark');
  }
  {
    // the Gate
    const G = LOCATIONS.gate;
    const h0 = H(G.x, G.z);
    const faceRot = Math.atan2(-360 - G.x, 240 - G.z); // face the siege camp
    const built = oblivionGate();
    const gate = built.gate;
    gate.position.set(G.x, h0, G.z);
    gate.rotation.y = faceRot;
    gate.userData.dynamic = true;
    gate.traverse((o) => { o.userData.dynamic = true; });
    b.add(gate);
    const portal = built.portal, portalBack = built.back;
    b.col.addCircle(G.x, G.z, 10, h0 - 2, h0 + 0.5, { walkable: true });
    b.col.addBox(G.x, G.z, 9, 1.2, faceRot, h0 - 1, h0 + 16);
    for (const s of [-1, 1]) {
      const c = Math.cos(faceRot), sn = Math.sin(faceRot);
      b.col.addCircle(G.x + s * 7 * c, G.z - s * 7 * sn, 1.6, h0 - 1, h0 + 18);
    }
    state.gate = { group: gate, portal, portalMats: built.portalMats, fade: built.fade, x: G.x, z: G.z };
    const front = new THREE.Vector3(Math.sin(faceRot), 0, Math.cos(faceRot));
    const ip = new THREE.Vector3(G.x, h0 + 2.6, G.z).addScaledVector(front, 1.6);
    state.gateInteract = b.interact({ kind: 'gate', id: 'kvatch_gate', name: 'Oblivion Gate', pos: ip, radius: 3.2, verb: 'Enter' });
    state.gateLight = b.light(0xff4010, 60, 40, G.x, h0 + 8, G.z, { flicker: true });
    state.gateEmitter = b.emitter('ember', G.x, h0 + 1, G.z, 14);
    // smoke climbing off the claws, and embers spilling out of the door (both only near: see updateGateVisibility)
    state.gateSmoke = [b.emitter('smoke', G.x, h0 + 18, G.z, 2.5), b.emitter('ember', G.x + front.x * 2, h0 + 6, G.z + front.z * 2, 10, { spread: 3 })];
    state.gateFront = { x: G.x + front.x * 10, z: G.z + front.z * 10, yaw: faceRot };

    // siege camp
    const cx = -362, cz = 238;
    const ch = H(cx, cz);
    campfire(b, cx, cz, ch);
    tent(b, cx + 6, cz - 6, H(cx + 6, cz - 6), 0.2, 'clothgreen');
    tent(b, cx + 10, cz + 4, H(cx + 10, cz + 4), 1.0, 'cloth');
    bedroll(b, cx + 3, cz + 4, H(cx + 3, cz + 4), 0.4, 'kvatch_bed', null);
    if (hasProp('wooden_crate_02')) {
      crate(b, cx - 5, cz + 3, H(cx - 5, cz + 3), 0.3);
      crate(b, cx - 5.4, cz + 4.3, H(cx - 5.4, cz + 4.3), 1.1);
      barrel(b, cx - 3.5, cz + 6, H(cx - 3.5, cz + 6), { id: 'kvatch_barrel' });
      placeProp(b, 'kite_shield', cx + 2, H(cx + 2, cz - 3), cz - 3, { rot: 2.2, collide: false });
      placeProp(b, 'kite_shield', cx + 2.5, H(cx + 2.5, cz - 3.2), cz - 3.2, { rot: 2.0, collide: false });
    }
    for (let i = 0; i < 7; i++) {
      // spiked barricades facing the gate
      const a = faceRot + PI + (i - 3) * 0.12;
      const x = cx + Math.sin(a) * 9 * 0 + (i - 3) * 3.2 * Math.cos(faceRot), z = cz - (i - 3) * 3.2 * Math.sin(faceRot) - 6 * Math.cos(faceRot) * 0;
      const hh = H(x - 8 * Math.sin(faceRot) * 0, z);
      const stake = b.box(0.18, 2.6, 0.18, 'timber', x, hh + 0.8, z, faceRot, { rx: 0.6, collide: false });
      stake.castShadow = true;
      b.col.addCircle(x, z, 0.3, hh, hh + 1.6);
    }
  }
}
