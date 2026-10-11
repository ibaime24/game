// Chorrol, built out: the houses of the town plan (layout.js), the market round the Great Oak,
// lantern posts, street and garden trees, the Chapel of Stendarr's graveyard, open gates, wall
// torches, a grander Castle Chorrol, and the town's green-and-gold oak banners.
import * as THREE from 'three';
import { M, textPlank } from './builder.js';
import { house, lamp, frame } from './structures.js';
import { buildTreeMesh } from './vegetation.js';
import { hasProp, placeProp, makeProp } from './props.js';
import { LOCATIONS, CHORROL_HOUSES } from './layout.js';
import { mat } from '../actors/models.js';
import { bunting, hangingBasket, flowerPot, toadstools, fountain, roseVine, picketFence } from './cute.js';

const PI = Math.PI;

function rng(seed) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** Chorrol's banner: a gold oak on green, with a fringe. */
let bannerMat = null;
function banner() {
  if (bannerMat) return bannerMat;
  const c = document.createElement('canvas');
  c.width = 128; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#1f4a26'; g.fillRect(0, 0, 128, 256);
  g.fillStyle = '#163a1c'; g.fillRect(0, 0, 10, 256); g.fillRect(118, 0, 10, 256);
  g.strokeStyle = '#c8a040'; g.lineWidth = 4; g.strokeRect(14, 12, 100, 214);
  // the oak: trunk, roots and a round crown
  g.fillStyle = '#d8b050';
  g.fillRect(58, 110, 12, 70);
  g.beginPath(); g.moveTo(50, 182); g.lineTo(78, 182); g.lineTo(90, 196); g.lineTo(38, 196); g.fill();
  for (const [x, y, r] of [[64, 82, 34], [40, 98, 22], [88, 98, 22], [50, 62, 20], [78, 62, 20]]) { g.beginPath(); g.arc(x, y, r, 0, PI * 2); g.fill(); }
  // fringe
  g.fillStyle = '#c8a040';
  for (let x = 0; x < 128; x += 10) { g.beginPath(); g.moveTo(x, 236); g.lineTo(x + 5, 256); g.lineTo(x + 10, 236); g.fill(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  bannerMat = new THREE.MeshStandardMaterial({ map: t, roughness: 0.95, side: THREE.DoubleSide });
  return bannerMat;
}
function hangBanner(b, x, y, z, rot, w = 1.3, h = 2.8) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), banner());
  m.position.set(x, y, z);
  m.rotation.y = rot;
  m.castShadow = true;
  b.add(m);
  b.box(w + 0.3, 0.08, 0.08, 'timber', x, y + h / 2 + 0.05, z, rot, { collide: false, cast: false });
}

/** A market stall: counter, posts, a coloured awning and its wares. */
function stall(b, x, z, h0, rot, awning, wares, rnd) {
  const P = frame(x, z, rot);
  b.box(2.8, 0.9, 1.2, 'wood', x, h0 + 0.45, z, rot);
  for (const [lx, lz] of [[-1.3, -0.6], [1.3, -0.6], [-1.3, 0.6], [1.3, 0.6]]) {
    const [px, pz] = P(lx, lz);
    b.box(0.1, 2.5, 0.1, 'timber', px, h0 + 1.25, pz, rot, { collide: false });
  }
  const aw = b.box(3.2, 0.05, 1.9, awning, x, h0 + 2.55, z, rot, { collide: false, rx: 0.18 });
  aw.castShadow = true;
  if (!hasProp('wicker_basket_01')) return;
  for (let i = 0; i < 3; i++) {
    const [wx, wz] = P(-0.9 + i * 0.9, 0.05);
    const w = wares[i % wares.length];
    if (w.basket) {
      placeProp(b, 'wicker_basket_01', wx, h0 + 0.9, wz, { rot: rot + rnd(), collide: false });
      for (let k = 0; k < 5; k++) {
        const [fx, fz] = P(-0.9 + i * 0.9 + ((k % 3) - 1) * 0.08, 0.05 + (k < 3 ? -0.05 : 0.06));
        placeProp(b, w.id, fx, h0 + 0.95 + (k > 2 ? 0.04 : 0), fz, { rot: k * 1.7, collide: false, shadow: false });
      }
    } else placeProp(b, w.id, wx, h0 + 0.9, wz, { rot: rot + rnd() * 2, collide: false, scale: w.scale ?? 1 });
  }
  // crates and a barrel behind the counter
  const [cx, cz] = P(1.1, -1.1);
  placeProp(b, 'wooden_crate_01', cx, h0, cz, { rot, collide: false });
  const [bx, bz] = P(-1.2, -1.2);
  placeProp(b, 'wine_barrel_01', bx, h0, bz, { scale: 0.9 });
}

/** A lantern post: stone foot, iron pole and arm, a hanging lantern that glows at night. */
function lanternPost(b, x, z, h0, rot) {
  const P = frame(x, z, rot);
  b.cyl(0.22, 0.28, 0.4, 'darkstone', x, h0 + 0.2, z, { seg: 8 });
  b.cyl(0.06, 0.08, 3.4, 'iron', x, h0 + 1.9, z, { seg: 6 });
  // a curled bracket arm and a chain holding the lantern
  const [ax, az] = P(0, 0.36);
  b.box(0.08, 0.08, 0.78, 'iron', ax, h0 + 3.52, az, rot, { collide: false, cast: false });
  const [bx, bz] = P(0, 0.17);
  b.box(0.06, 0.06, 0.45, 'iron', bx, h0 + 3.3, bz, rot, { collide: false, cast: false, rx: -0.85 });
  const [lx, lz] = P(0, 0.7);
  b.box(0.03, 0.32, 0.03, 'iron', lx, h0 + 3.35, lz, rot, { collide: false, cast: false });
  b.box(0.16, 0.24, 0.16, 'lanternglow', lx, h0 + 3.0, lz, rot, { collide: false, cast: false });
  if (hasProp('wooden_lantern_01')) placeProp(b, 'wooden_lantern_01', lx, h0 + 2.86, lz, { collide: false, scale: 0.8, rot });
  b.light(0xffb060, 12, 13, lx, h0 + 2.9, lz, { night: true });
  const [hx, hz] = P(0, -0.32);
  b.box(0.05, 0.05, 0.38, 'iron', x + (hx - x) * 0.5, h0 + 2.6, z + (hz - z) * 0.5, rot, { collide: false, cast: false });
  hangingBasket(b, hx, h0 + 2.15, hz, Math.round(x * 3 + z));
}

/** Footprints of everything already standing in Chorrol, so new things don't overlap it. */
function occupied(C) {
  const rects = CHORROL_HOUSES.map(([u, v, w, d, f]) => {
    const side = Math.abs(Math.sin(f)) > 0.5;
    return [u, v, (side ? d : w) / 2 + 1.5, (side ? w : d) / 2 + 1.5];
  });
  // the original buildings and fixtures
  rects.push(
    [-24, 30, 6.5, 8.5], [24, 30, 6.5, 8.5], [-26, -24, 5.5, 6.5], [-44, 6, 5.5, 6.5], [42, 44, 5.5, 6.5],
    [-44, 44, 6.5, 7.5], [15, 48, 6.5, 5.5], [44, 4, 5.5, 6], [31, -22, 11, 6.5], [0, -46, 21, 9],
    [-48, -42, 5, 5], [6, 58, 3, 3], [-55, 52, 5, 5], [-48, -30, 4, 4], [12, 12, 2.5, 2.5], [20, -30, 2.5, 2.5], [-40, 10, 2, 2], [-20, 38, 4, 3],
  );
  const free = (u, v, r) => {
    if (Math.abs(u) > 58 - r || Math.abs(v) > 58 - r) return false;
    if (Math.hypot(u, v) < 23 + r) return false;
    for (const [x, y, hw, hd] of rects) if (Math.abs(u - x) < hw + r && Math.abs(v - y) < hd + r) return false;
    return true;
  };
  return { rects, free, reserve: (u, v, r) => rects.push([u, v, r, r]) };
}

/** Chickens and cats that live in town: [template, u, v]. */
export const CHORROL_CRITTERS = [
  ['chicken', -46, -27], ['chicken', -50, -26], ['chicken', -45, -31], ['rooster', -48, -24], ['chicken', 22, 44], ['chicken', 24, 46],
  ['cat', 8, 9], ['cat', -20, 18], ['cat', 30, -16], ['cat', -14, 50],
];

export function buildChorrol(b, H) {
  const C = LOCATIONS.chorrol;
  const h0 = H(C.x, C.z);
  const rnd = rng(1777);
  const at = (u, v) => [C.x + u, C.z + v];

  // ---------------------------------------------------------------- houses of the town plan
  const roofs = ['roof', 'roof', 'roofred'];
  const stones = ['stone', 'stone', 'darkstone', 'whitestone'];
  const awnings = ['clothred', 'clothgreen', 'cloth'];
  CHORROL_HOUSES.forEach(([u, v, w, d, f, name, style], i) => {
    const [x, z] = at(u, v);
    const shop = style === 'shop';
    house(b, x, z, h0, w, d, f, {
      name,
      oneStorey: style === 'one',
      roof: roofs[i % roofs.length],
      roofH: 2.6 + (i % 4) * 0.35,
      stone: stones[(i * 7) % stones.length],
      sign: shop ? name.replace(/^The /, '') : undefined,
      door: { kind: 'door', name, locked: true, lockLevel: 1 + (i % 4), lockMsg: shop ? `${name} is closed until morning. A painted sign reads: "Back soon. Probably."` : undefined },
      decor: { flowers: i % 3 !== 1, dormer: !style && w >= 8 && i % 2 === 0, balcony: !style && i % 3 === 0, awning: shop ? awnings[i % awnings.length] : null, smoke: i % 5 !== 2 },
    });
  });

  // ---------------------------------------------------------------- the Great Oak's garden and plaza
  // flower beds inside the garden ring
  for (let k = 0; k < 4; k++) {
    const a = k * PI / 2 + PI / 4;
    const [x, z] = at(Math.cos(a) * 9.4, Math.sin(a) * 9.4);
    b.box(3.2, 0.42, 1.4, 'darkstone', x, h0 + 0.21, z, -a + PI / 2, { walkable: true });
    b.box(3.0, 0.08, 1.2, mat(0x3a2a1a, { rough: 1 }), x, h0 + 0.44, z, -a + PI / 2, { collide: false, cast: false });
    if (hasProp('celandine_01')) {
      for (let n = 0; n < 7; n++) {
        const t = (n / 6 - 0.5) * 2.6;
        const fx = x + Math.cos(-a + PI / 2) * t + (rnd() - 0.5) * 0.3, fz = z - Math.sin(-a + PI / 2) * t + (rnd() - 0.5) * 0.3;
        const id = ['celandine_01', 'dandelion_01', 'nettle_plant'][n % 3];
        placeProp(b, id, fx, h0 + 0.46, fz, { variant: n, height: 0.38 + rnd() * 0.15, rot: rnd() * 6, collide: false, shadow: false });
      }
    }
  }
  // a low clipped hedge round the garden, broken by the four paths
  if (hasProp('shrub_02')) {
    for (let k = 0; k < 28; k++) {
      const a = (k / 28) * PI * 2;
      if (Math.min(...[0, PI / 2, PI, PI * 1.5, PI * 2].map((p) => Math.abs(a - p))) < 0.2) continue;
      const [x, z] = at(Math.cos(a) * 12.2, Math.sin(a) * 12.2);
      placeProp(b, 'shrub_02', x, h0 - 0.05, z, { variant: k % 4, height: 0.9, rot: a, collide: false, shadow: false });
    }
  }
  // lantern posts round the plaza and down the avenues
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * PI * 2 + PI / 8;
    const [x, z] = at(Math.cos(a) * 12.4, Math.sin(a) * 12.4);
    lanternPost(b, x, z, h0, -a - PI / 2);
  }
  for (const [u, v, r] of [[4.9, 28, -PI / 2], [-4.9, 42, PI / 2], [4.9, 54, -PI / 2], [-4.9, -30, PI / 2], [4.9, -30, -PI / 2],
    [28, 4.9, PI], [42, -4.9, 0], [55, 4.9, PI], [-28, -4.9, 0], [-42, 4.9, PI]]) {
    const [x, z] = at(u, v);
    lanternPost(b, x, z, h0, r);
  }

  // ---------------------------------------------------------------- the market
  const produce = [{ id: 'food_apple_01', basket: true }, { id: 'yellow_onion', basket: true }, { id: 'lemon', basket: true }, { id: 'sweet_potato', basket: true }, { id: 'food_pears_asian_01', basket: true }];
  const crockery = [{ id: 'jug_01' }, { id: 'ceramic_vase_01' }, { id: 'antique_ceramic_vase_01' }, { id: 'metal_jug' }, { id: 'brass_pot_01' }];
  const tools = [{ id: 'hatchet', scale: 1.4 }, { id: 'wooden_hammer_01', scale: 1.3 }, { id: 'brass_goblets' }, { id: 'wooden_lantern_01' }];
  [[0.45, 'cloth@f6b0c0', produce], [1.1, 'cloth@b8e0f0', crockery], [2.75, 'cloth@fff0a0', tools], [3.75, 'cloth@c8f0b8', produce.slice(2)]].forEach(([a, aw, wares]) => {
    const [x, z] = at(Math.cos(a) * 19.5, Math.sin(a) * 19.5);
    stall(b, x, z, h0, Math.atan2(-Math.cos(a), -Math.sin(a)), aw, wares, rnd);
  });

  // ---------------------------------------------------------------- notice board by the south gate
  {
    const [x, z] = at(-9, 55);
    for (const s of [-1, 1]) b.box(0.14, 2.4, 0.14, 'timber', x + s * 0.95, h0 + 1.2, z, 0, { collide: false });
    b.box(2.1, 1.3, 0.1, 'wood', x, h0 + 1.65, z, 0);
    b.roof(2.4, 0.6, 0.35, 'roof', x, h0 + 2.4, z, 0);
    const paper = mat(0xe8dcc0, { rough: 1 });
    for (const [px, py, r] of [[-0.6, 1.9, 0.08], [0.1, 1.95, -0.05], [0.65, 1.75, 0.1], [-0.45, 1.4, -0.12], [0.35, 1.38, 0.04]]) b.box(0.42, 0.5, 0.02, paper, x + px, h0 + py, z + 0.07, 0, { collide: false, cast: false, rz: r });
    b.interact({ kind: 'sign', name: 'Chorrol Notice Board', text: 'BY ORDER OF THE COUNTESS ARRIANA VALGA: the gates close at dusk while the Kvatch troubles last. Refugees may shelter at the Chapel of Stendarr.\n\nFIGHTERS GUILD — gone to Kvatch. Back when it is over. — Modryn Oreyn\n\nLOST: one lute, answers to "Lady Plucksworth". Last seen in the claws of a crab. — T. Larkspur, Bard of the Third Verse\n\nTHE MAGES GUILD would like to remind citizens that it does not, and will not, teach necromancy, and asks that you stop asking.\n\nWANTED: BLACK BRUGO. 300 septims. Enquire of Captain Peneles.\n\nSomeone has written at the bottom, very small: THEY ARE WATCHING THE OAK. — G.', pos: new THREE.Vector3(x, h0 + 1.5, z + 0.7), radius: 1.4, verb: 'Read' });
  }

  // ---------------------------------------------------------------- the town gates, open, with portcullises raised
  const S = 62;
  for (const [gx, gz, rot] of [[0, S, 0], [S, 0, PI / 2]]) {
    const P = frame(C.x + gx, C.z + gz, rot);
    for (const s of [-1, 1]) {
      const [lx, lz] = P(s * 4.7, -2.8);
      b.box(0.3, 6, 4.4, 'wood', lx, h0 + 3, lz, rot + s * 0.05, { collide: false });
      for (const hy of [1.2, 4.6]) b.box(0.34, 0.14, 4.4, 'iron', lx, h0 + hy, lz, rot + s * 0.05, { collide: false, cast: false });
    }
    for (let k = -4; k <= 4; k++) {
      const [bx, bz] = P(k * 0.9, 0.2);
      b.box(0.08, 1.4, 0.08, 'iron', bx, h0 + 6.6, bz, rot, { collide: false, cast: false });
    }
    const [hx, hz] = P(0, 1.3);
    hangBanner(b, hx, h0 + 4.9, hz, rot, 1.2, 2.2);
  }
  // banners on the corner and gate towers
  for (const [tu, tv] of [[-S, -S], [S, -S], [-S, S], [S, S], [-6, S], [6, S], [S, -6], [S, 6]]) {
    const out = new THREE.Vector2(tu, tv).normalize();
    const [x, z] = at(tu + out.x * 3.45, tv + out.y * 3.45);
    hangBanner(b, x, h0 + 6.2, z, Math.atan2(out.x, out.y), 1.3, 3);
  }
  // torches along the inside of the walls
  for (let k = -48; k <= 48; k += 24) {
    for (const [u, v, r] of [[k, -S + 1.15, 0], [k, S - 1.15, PI], [-S + 1.15, k, PI / 2], [S - 1.15, k, -PI / 2]]) {
      if (Math.abs(k) < 10 && (v === S - 1.15 || u === S - 1.15)) continue; // the gates
      const [x, z] = at(u, v);
      const fx = Math.sin(r), fz = Math.cos(r);
      b.box(0.12, 0.5, 0.35, 'iron', x, h0 + 3.6, z, r, { collide: false, cast: false });
      b.box(0.14, 0.14, 0.14, 'lanternglow', x + fx * 0.25, h0 + 3.9, z + fz * 0.25, r, { collide: false, cast: false });
      b.emitter('flame', x + fx * 0.25, h0 + 3.92, z + fz * 0.25, 7, { color: 0xff8030, range: 90, size: 0.32 });
      b.light(0xff9040, 10, 10, x + fx * 0.5, h0 + 4, z + fz * 0.5, { night: true });
    }
  }

  // ---------------------------------------------------------------- Castle Chorrol, made grand
  {
    const [kx, kz] = at(0, -46);
    // a great tower rising behind the hall
    b.cyl(4.6, 5, 30, 'stone', kx, h0 + 15, kz - 5, { seg: 16, tile: 4 });
    const spire = new THREE.Mesh(new THREE.ConeGeometry(5.6, 9, 16), M('roof'));
    spire.position.set(kx, h0 + 34.5, kz - 5);
    spire.castShadow = true;
    b.add(spire);
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * PI * 2;
      b.box(1.1, 1.2, 0.9, 'stone', kx + Math.cos(a) * 4.9, h0 + 30.4, kz - 5 + Math.sin(a) * 4.9, -a, { collide: false, cast: false });
    }
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * PI * 2 + 0.3;
      b.box(0.5, 1.6, 0.1, 'dark', kx + Math.cos(a) * 4.62, h0 + 22, kz - 5 + Math.sin(a) * 4.62, -a + PI / 2, { collide: false, cast: false });
    }
    // battlements along the hall's front, and arrow slits
    for (let i = -6; i <= 6; i++) b.box(1.1, 1.0, 1.0, 'stone', kx + i * 2.2, h0 + 14.9, kz + 7.6, 0, { collide: false, cast: false });
    for (const lx of [-9, -4.5, 4.5, 9]) b.box(0.45, 2.2, 0.1, 'dark', kx + lx, h0 + 9.5, kz + 8.05, 0, { collide: false, cast: false });
    // the great door: an arch of dressed stone, steps, braziers
    b.box(4.4, 0.7, 0.6, 'whitestone', kx, h0 + 4.8, kz + 8.3, 0, { collide: false });
    for (const s of [-1, 1]) b.box(0.6, 4.6, 0.6, 'whitestone', kx + s * 1.9, h0 + 2.3, kz + 8.3, 0, { collide: false });
    for (let k = 0; k < 3; k++) b.box(6 - k * 0.8, 0.22, 1.1, 'whitestone', kx, h0 + 0.11 + k * 0.22, kz + 9.7 - k * 0.5, 0, { walkable: true });
    for (const s of [-1, 1]) {
      const x = kx + s * 3.4, z = kz + 10.2;
      b.cyl(0.42, 0.26, 1.2, 'iron', x, h0 + 0.6, z, { seg: 8 });
      b.emitter('flame', x, h0 + 1.22, z, 16, { color: 0xff7020, range: 120, size: 0.72 });
      b.light(0xff8030, 18, 14, x, h0 + 2, z, { flicker: true });
    }
    for (const s of [-1, 1]) hangBanner(b, kx + s * 6, h0 + 9, kz + 8.12, 0, 1.6, 4);
  }

  // ---------------------------------------------------------------- the Chapel of Stendarr's graveyard
  {
    const fence = mat(0x262628, { rough: 0.5, metal: 0.7 });
    const [gx, gz] = at(32, -34);
    for (const [w, d, ox, oz] of [[14, 0.08, 0, -4.2], [14, 0.08, 0, 4.2], [0.08, 8.4, -7, 0], [0.08, 8.4, 7, 0]]) {
      b.box(Math.max(w, 0.06), 0.06, Math.max(d, 0.06), fence, gx + ox, h0 + 1.0, gz + oz, 0, { collide: false, cast: false });
      const n = Math.round(Math.max(w, d) / 0.5);
      for (let k = 0; k <= n; k++) {
        const t = k / n - 0.5;
        if (oz === 4.2 && Math.abs(t * w) < 1) continue; // the gate gap
        b.box(0.04, 1.15, 0.04, fence, gx + ox + (w > 1 ? t * w : 0), h0 + 0.58, gz + oz + (d > 1 ? t * d : 0), 0, { collide: false, cast: false });
      }
    }
    b.col.addBox(gx, gz - 4.2, 7, 0.1, 0, h0, h0 + 1.2);
    b.col.addBox(gx - 7, gz, 0.1, 4.2, 0, h0, h0 + 1.2);
    b.col.addBox(gx + 7, gz, 0.1, 4.2, 0, h0, h0 + 1.2);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) {
      if ((r + c) % 4 === 3) continue;
      const x = gx - 5 + c * 2.5 + (rnd() - 0.5) * 0.4, z = gz - 2.6 + r * 2.4;
      const tall = (r * 5 + c) % 3 === 0;
      const st = b.box(0.7, tall ? 1.2 : 0.85, 0.18, 'darkstone', x, h0 + (tall ? 0.55 : 0.4), z, (rnd() - 0.5) * 0.15, { rz: (rnd() - 0.5) * 0.12, collide: false });
      st.castShadow = true;
      if (tall) b.box(0.18, 0.5, 0.2, 'darkstone', x, h0 + 1.4, z, 0, { collide: false });
      b.box(0.8, 0.04, 1.6, mat(0x3a4a2a, { rough: 1 }), x, h0 + 0.03, z + 1, 0, { collide: false, cast: false });
    }
    // two old yews keep watch
    for (const [u, v] of [[24, -39], [40, -30]]) {
      const [x, z] = at(u, v);
      const t = buildTreeMesh('pine', 0.55, 21 + u);
      t.position.set(x, h0 - 0.2, z);
      b.add(t);
      b.col.addCircle(x, z, 0.4, h0 - 1, h0 + 5);
    }
    b.interact({ kind: 'sign', name: 'Chapel Graveyard', text: 'The stones are old and the names worn soft. One newer marker, still sharp at the edges, reads:\n\nSEVERUS JEMANE\nHE WENT INTO VILVERIN\nAND NEVER CAME OUT\n\nSomeone has left a sprig of Lady\'s Mantle on it.', pos: new THREE.Vector3(gx, h0 + 1, gz + 4.6), radius: 2, verb: 'Read' });
  }

  // ---------------------------------------------------------------- trees in the streets and the gardens behind the houses
  const occ = occupied(C);
  const kinds = ['oak', 'beech', 'beech'];
  let planted = 0;
  for (let i = 0; i < 600 && planted < 22; i++) {
    const u = (rnd() - 0.5) * 112, v = (rnd() - 0.5) * 112;
    if (Math.abs(u) < 7 || Math.abs(v) < 7) continue; // keep the avenues open
    if (!occ.free(u, v, 2.2)) continue;
    const [x, z] = at(u, v);
    const kind = kinds[planted % 3];
    const t = buildTreeMesh(kind, 0.55 + rnd() * 0.25, 30 + planted);
    t.position.set(x, h0 - 0.25, z);
    t.rotation.y = rnd() * 6;
    b.add(t);
    b.col.addCircle(x, z, 0.35, h0 - 1, h0 + 4);
    occ.reserve(u, v, 3);
    planted++;
  }
  // garden clutter: hedges, wood piles, washing lines
  for (let i = 0, placed = 0; i < 400 && placed < 14; i++) {
    const u = (rnd() - 0.5) * 110, v = (rnd() - 0.5) * 110;
    if (Math.abs(u) < 7 || Math.abs(v) < 7 || !occ.free(u, v, 1.6)) continue;
    const [x, z] = at(u, v);
    const kind = placed % 3;
    if (kind === 0 && hasProp('shrub_02')) placeProp(b, 'shrub_02', x, h0 - 0.05, z, { variant: placed % 4, height: 1.2, rot: rnd() * 6, collide: false });
    else if (kind === 1 && hasProp('dry_branches_medium_01')) {
      placeProp(b, 'dry_branches_medium_01', x, h0, z, { rot: rnd() * 6, collide: false });
      placeProp(b, 'tree_stump_01', x + 1.2, h0 - 0.1, z, { scale: 0.45 });
    } else {
      // a washing line between two posts, hung with cloth
      const r = rnd() * PI;
      const P = frame(x, z, r);
      for (const s of [-1, 1]) { const [px, pz] = P(s * 1.8, 0); b.cyl(0.05, 0.06, 2.1, 'timber', px, h0 + 1.05, pz, { collide: false, seg: 5 }); }
      b.box(3.6, 0.02, 0.02, 'timber', x, h0 + 2.0, z, r, { collide: false, cast: false });
      const cloths = [0xd8d0c0, 0x8a3a2a, 0x3a5a7a, 0xc8b070];
      for (let k = 0; k < 4; k++) {
        const [cx, cz] = P(-1.3 + k * 0.85, 0);
        const cl = b.box(0.6, 0.7 + (k % 2) * 0.2, 0.02, mat(cloths[(k + placed) % 4], { rough: 1 }), cx, h0 + 1.6 - (k % 2) * 0.1, cz, r, { collide: false });
        cl.castShadow = true;
      }
    }
    occ.reserve(u, v, 2);
    placed++;
  }

  // ---------------------------------------------------------------- storybook Chorrol
  // bunting strung round the plaza between the lantern posts, and across the avenues
  {
    const ring = [];
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * PI * 2 + PI / 8;
      const [x, z] = at(Math.cos(a) * 12.4, Math.sin(a) * 12.4);
      ring.push(new THREE.Vector3(x, h0 + 3.55, z));
    }
    for (let k = 0; k < 8; k++) bunting(b, ring[k], ring[(k + 1) % 8], 0.55);
    // from the plaza out toward the gates and the castle
    for (const [u0, v0, u1, v1] of [[-7.3, 30, 7.3, 30], [-7.3, 46, 7.3, 46], [30, -4.3, 30, 8.3], [46, -6, 46, 6], [-30, -6, -30, 6], [-7.3, -22, 7.3, -22]]) {
      const [x0, z0] = at(u0, v0), [x1, z1] = at(u1, v1);
      bunting(b, new THREE.Vector3(x0, h0 + 5.1, z0), new THREE.Vector3(x1, h0 + 5.1, z1), 0.9);
    }
    // to the castle towers
    for (const s2 of [-1, 1]) {
      const [x0, z0] = at(s2 * 12, -30), [x1, z1] = at(s2 * 15, -38.5);
      bunting(b, new THREE.Vector3(x0, h0 + 3.6, z0), new THREE.Vector3(x1, h0 + 9, z1), 0.6);
    }
    for (const [u, v] of [[12, -30], [-12, -30]]) {
      const [x, z] = at(u, v);
      b.cyl(0.08, 0.1, 3.8, 'timber@8a5a3a', x, h0 + 1.9, z, { seg: 6 });
    }
  }
  // a tiered fountain in the castle forecourt, ringed with flowers
  {
    const [fx, fz] = at(0, -33);
    fountain(b, fx, fz, h0);
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * PI * 2;
      flowerPot(b, fx + Math.cos(a) * 3.1, h0, fz + Math.sin(a) * 3.1, k, 1.15);
    }
  }
  // the Great Oak's roots: toadstools and a fairy ring
  {
    for (let k = 0; k < 11; k++) {
      const a = (k / 11) * PI * 2 + 0.3;
      const [x, z] = at(Math.cos(a) * 6.6, Math.sin(a) * 6.6);
      toadstools(b, x, h0 + 0.05, z, 2 + (k % 3), k + 3, 0.7 + (k % 2) * 0.3);
    }
    // butterflies over the flower beds by day, fireflies round the oak at night
    const [ox, oz] = at(0, 0);
    b.emitter('butterfly', ox, h0 + 0.6, oz, 1.6, { day: true, spread: 11, range: 90 });
    b.emitter('firefly', ox, h0 + 0.5, oz, 4, { night: true, spread: 13, range: 90 });
  }
  // butterflies over the cottage gardens, fireflies in the back gardens
  for (const [u, v] of [[-10, 30], [10, 34], [32, 46], [-30, 46], [40, -20], [-40, -20], [30, 20], [-30, 20]]) {
    const [x, z] = at(u, v);
    b.emitter('butterfly', x, h0 + 0.5, z, 0.5, { day: true, spread: 6, range: 70 });
    b.emitter('firefly', x, h0 + 0.4, z, 1.4, { night: true, spread: 8, range: 70 });
  }
  // a hen coop in a back garden
  {
    const [cx, cz] = at(-48, -30);
    b.box(1.8, 1.0, 1.2, 'wood@e8c890', cx, h0 + 0.7, cz, 0.3);
    b.roof(2.2, 1.6, 0.7, 'roofred@ffb8a0', cx, h0 + 1.2, cz, 0.3);
    for (const [ox, oz] of [[-0.8, -0.5], [0.8, -0.5], [-0.8, 0.5], [0.8, 0.5]]) b.box(0.08, 0.4, 0.08, 'timber', cx + ox, h0 + 0.2, cz + oz, 0.3, { collide: false });
    const ramp = b.box(0.4, 0.04, 0.9, 'wood', cx + 0.2, h0 + 0.3, cz + 1.0, 0.3, { collide: false, rx: -0.5 });
    ramp.castShadow = true;
    if (hasProp('wicker_basket_02')) placeProp(b, 'wicker_basket_02', cx + 1.4, h0, cz + 0.6, { collide: false });
    for (let k = 0; k < 4; k++) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), mat(0xf6ecd8, { rough: 0.6 })); e.scale.y = 1.3; e.position.set(cx + 1.4 + (k - 1.5) * 0.06, h0 + 0.12, cz + 0.6 + (k % 2) * 0.05); b.add(e); }
    picketFence(b, { x: cx - 3, z: cz - 2.5 }, { x: cx + 3, z: cz - 2.5 }, h0);
    picketFence(b, { x: cx - 3, z: cz - 2.5 }, { x: cx - 3, z: cz + 3 }, h0);
  }
  // a toadstool or three in the back gardens
  for (let i = 0, n = 0; i < 300 && n < 12; i++) {
    const u = (rnd() - 0.5) * 112, v = (rnd() - 0.5) * 112;
    if (Math.abs(u) < 7 || Math.abs(v) < 7 || !occ.free(u, v, 0.8)) continue;
    const [x, z] = at(u, v);
    toadstools(b, x, h0, z, 3 + (n % 4), n + 40, n % 3 === 0 ? 1.4 : 0.8);
    n++;
  }

  // ---------------------------------------------------------------- Quillwhistle's Spire: a crooked wizard's tower
  {
    const [tx, tz] = at(-55, 52);
    const R = 3.4;
    b.cyl(R, R + 0.25, 9, 'stone@ece2d4', tx, h0 + 4.3, tz, { seg: 18, tile: 3 });
    b.cyl(R + 0.1, R + 0.1, 3.4, 'plaster@ddd0f2', tx, h0 + 10.4, tz, { seg: 18, collide: false });
    b.cyl(R + 0.35, R + 0.35, 0.3, 'timber@5a3a6a', tx, h0 + 8.85, tz, { seg: 18, collide: false });
    // a tall, crooked witch's-hat roof
    const hat = new THREE.Mesh(new THREE.ConeGeometry(R + 1.1, 9, 18, 4), M('roof@b098e8'));
    const hp = hat.geometry.attributes.position;
    for (let i = 0; i < hp.count; i++) {
      const y = hp.getY(i) + 4.5;
      hp.setX(i, hp.getX(i) + (y / 9) ** 2 * 1.6);
    }
    hat.geometry.computeVertexNormals();
    hat.position.set(tx, h0 + 16.6, tz);
    hat.castShadow = true;
    b.add(hat);
    // golden star at the tip
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), new THREE.MeshStandardMaterial({ color: 0xffd860, emissive: 0xffb020, emissiveIntensity: 1.6, metalness: 0.8, roughness: 0.3 }));
    star.scale.set(1, 1, 0.4);
    star.position.set(tx + 1.6, h0 + 21.3, tz);
    star.userData.spin = true;
    b.add(star);
    b.emitter('sparkle', tx + 1.6, h0 + 21, tz, 3, { range: 120 });
    b.light(0xffd080, 10, 14, tx + 1.6, h0 + 21, tz, { night: true });
    // round windows up the tower
    for (const [a, y] of [[0.4, 3.5], [2.2, 6.2], [4.1, 4.8], [5.6, 7.6], [1.3, 10.4], [3.4, 10.4], [5.2, 10.4]]) {
      const x = tx + Math.cos(a) * (R + 0.12), z = tz + Math.sin(a) * (R + 0.12);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.07, 6, 18), M('timber@5a3a6a'));
      ring.position.set(x, h0 + y, z);
      ring.rotation.y = -a + Math.PI / 2;
      b.add(ring);
      const glass = new THREE.Mesh(new THREE.CircleGeometry(0.4, 16), M('window'));
      glass.position.set(tx + Math.cos(a) * (R + 0.13), h0 + y, tz + Math.sin(a) * (R + 0.13));
      glass.rotation.y = -a + Math.PI / 2;
      b.add(glass);
    }
    // a little balcony and a brass telescope pointing at the sky
    const ba = 0.9;
    b.box(2.2, 0.15, 1.2, 'timber@5a3a6a', tx + Math.cos(ba) * (R + 0.6), h0 + 9.1, tz + Math.sin(ba) * (R + 0.6), -ba + Math.PI / 2, { collide: false });
    const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 1.8, 10), M('gold'));
    scope.position.set(tx + Math.cos(ba) * (R + 0.9), h0 + 9.9, tz + Math.sin(ba) * (R + 0.9));
    scope.rotation.set(0.6, -ba, 0.9);
    scope.castShadow = true;
    b.add(scope);
    // the door (facing the street, east) with a sign and roses
    const da = 0;
    const dx = tx + Math.cos(da) * (R + 0.15), dz = tz + Math.sin(da) * (R + 0.15);
    b.box(0.2, 2.4, 1.4, 'wood@7a4ab0', dx, h0 + 1.2, dz, 0, { collide: false });
    b.box(0.3, 0.3, 1.9, 'stone@f4ecdc', dx + 0.05, h0 + 2.55, dz, 0, { collide: false });
    const sign = textPlank("Quillwhistle's Wonders", 2.0, 0.42, '#5a3a8a', '#ffe8a0');
    sign.position.set(dx + 0.9, h0 + 3.0, dz + 1.1);
    sign.rotation.y = 0;
    b.add(sign);
    b.box(0.06, 0.06, 0.8, 'iron', dx + 0.5, h0 + 3.32, dz + 1.1, PI / 2, { collide: false, cast: false });
    roseVine(b, dx + 0.05, h0, dz + 1.15, PI / 2, 1.0, 3.2, 'white');
    roseVine(b, dx + 0.05, h0, dz - 1.15, PI / 2, 1.0, 3.0, 'pink');
    flowerPot(b, dx + 0.8, h0, dz + 1.1, 3, 1);
    flowerPot(b, dx + 0.8, h0, dz - 1.1, 5, 1);
    hangingBasket(b, dx + 0.45, h0 + 2.2, dz - 0.95, 9);
    b.interact({ kind: 'door', cell: 'quill_spire', name: "Quillwhistle's Spire", pos: new THREE.Vector3(dx + 0.7, h0 + 1.2, dz), radius: 1.4, verb: 'Enter' });
    // a pumpkin-and-toadstool patch, naturally
    toadstools(b, tx + 2.5, h0, tz - 3.2, 5, 77, 1.3);
  }

  // ---------------------------------------------------------------- a Libram page caught high in the Great Oak
  {
    const [px, pz] = at(3.2, 2.4);
    b.libramPage = { x: px, y: h0 + 7.6, z: pz };
  }

  // ---------------------------------------------------------------- stone fire braziers, like a festival night
  for (const [u, v] of [[-5.6, 58], [5.6, 58], [58, -5.6], [58, 5.6], [-5.2, 36], [5.2, 22], [22, -5.2], [-22, 5.2], [-44, -5.2], [36, 5.2], [-5.2, -40]]) {
    const [x, z] = at(u, v);
    b.cyl(0.42, 0.55, 1.05, 'stone@cfc2b0', x, h0 + 0.52, z, { seg: 8 });
    b.cyl(0.6, 0.38, 0.32, 'iron', x, h0 + 1.2, z, { seg: 12 });
    b.box(0.55, 0.12, 0.55, 'darkstone', x, h0 + 1.02, z, 0.4, { collide: false });
    b.emitter('flame', x, h0 + 1.3, z, 14, { color: 0xff7020, range: 140, size: 0.68 });
    b.light(0xff8a3a, 22, 15, x, h0 + 2.1, z, { flicker: true });
  }

  // ---------------------------------------------------------------- a water trough and a cart by the east gate
  {
    const [x, z] = at(54, 9);
    b.box(2.4, 0.7, 0.9, 'darkstone', x, h0 + 0.35, z, PI / 2);
    b.box(2.2, 0.05, 0.7, mat(0x2a4a5a, { rough: 0.1, metal: 0.2 }), x, h0 + 0.62, z, PI / 2, { collide: false, cast: false });
    if (hasProp('wooden_bucket_01')) placeProp(b, 'wooden_bucket_01', x - 0.8, h0, z - 1.6, {});
  }
}
