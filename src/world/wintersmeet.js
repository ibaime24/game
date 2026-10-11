// Wintersmeet: a snowbound hamlet on the north road into the Jerall foothills. Seven snug cottages
// round a green with a lit fir tree, the Snow Hare inn, snowmen, braziers, a frozen pond and fairy lights.
import * as THREE from 'three';
import { M, textPlank } from './builder.js';
import { house, frame } from './structures.js';
import { buildTreeMesh } from './vegetation.js';
import { LOCATIONS, WINTERSMEET_HOUSES } from './layout.js';
import { hasProp, placeProp } from './props.js';
import { bunting, picketFence } from './cute.js';
import { buildHareMesh } from './hare.js';

const PI = Math.PI;

function rng(seed) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

const glow = (r, g, b) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b) });

/** A snowman: three balls of snow, coal eyes and buttons, a carrot nose, stick arms and a knitted scarf. */
function snowman(b, x, z, h0, rot, seed) {
  const r = rng(seed);
  const snow = M('snow');
  const g = new THREE.Group();
  const s = 0.9 + r() * 0.25;
  const balls = [[0.55, 0.45], [0.4, 1.18], [0.28, 1.72]];
  for (const [rad, y] of balls) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(rad, 16, 12), snow);
    m.position.y = y;
    m.scale.set(1, 0.92, 1);
    m.castShadow = true;
    g.add(m);
  }
  const coal = new THREE.MeshStandardMaterial({ color: 0x141210, roughness: 0.9 });
  for (const sx of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), coal);
    e.position.set(sx * 0.1, 1.8, 0.24);
    g.add(e);
  }
  for (let i = 0; i < 3; i++) {
    const bt = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 5), coal);
    bt.position.set(0, 1.0 + i * 0.16, 0.38 - i * 0.02);
    g.add(bt);
  }
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.26, 7), new THREE.MeshStandardMaterial({ color: 0xe06a1a, roughness: 0.6 }));
  nose.rotation.x = PI / 2;
  nose.position.set(0, 1.72, 0.38);
  g.add(nose);
  // a little smile of coal
  for (let i = 0; i < 5; i++) {
    const a = (i - 2) * 0.28;
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.022, 5, 4), coal);
    m.position.set(Math.sin(a) * 0.13, 1.62 - Math.cos(a) * 0.04, 0.25);
    g.add(m);
  }
  const twig = new THREE.MeshStandardMaterial({ color: 0x4a3424, roughness: 1 });
  for (const sx of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.028, 0.75, 5), twig);
    arm.position.set(sx * 0.62, 1.32, 0);
    arm.rotation.z = sx * (1.0 + r() * 0.3);
    g.add(arm);
  }
  const scarfCol = [0xc8343a, 0x3a6ac8, 0x3a9a5a, 0xd8a030][Math.floor(r() * 4)];
  const scarfMat = new THREE.MeshStandardMaterial({ color: scarfCol, roughness: 0.95 });
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.06, 6, 16), scarfMat);
  scarf.rotation.x = PI / 2;
  scarf.position.y = 1.5;
  g.add(scarf);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.42, 0.04), scarfMat);
  tail.position.set(0.16, 1.32, 0.26);
  tail.rotation.z = 0.25;
  g.add(tail);
  if (r() < 0.6) {
    // a battered bucket for a hat
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.21, 0.24, 10), new THREE.MeshStandardMaterial({ color: 0x5a5048, roughness: 0.7, metalness: 0.4 }));
    hat.position.set(0.02, 2.06, 0);
    hat.rotation.z = 0.15;
    g.add(hat);
  }
  g.scale.setScalar(s);
  g.position.set(x, h0, z);
  g.rotation.y = rot;
  b.add(g);
  b.col.addCircle(x, z, 0.55 * s, h0, h0 + 2 * s, { walkable: false });
  b.interact({ kind: 'sign', name: 'A Snowman', text: ['Somebody has given this snowman a very stern expression and a carrot that is far too long. A scrap of parchment pinned to its scarf reads: "HIS NAME IS SIR FROSTWICK. DO NOT TOUCH HIS NOSE."', 'A lopsided snowman with a bucket for a hat and one arm raised as if waving at the road. Fresh footprints circle it: whoever built it keeps coming back to fix it.'][seed % 2], pos: new THREE.Vector3(x, h0 + 1.2, z), radius: 1.3, verb: 'Examine' });
}

/** A stone fire brazier, like Chorrol's, to warm hands at. */
function brazier(b, x, z, h0) {
  b.cyl(0.4, 0.5, 0.8, 'darkstone', x, h0 + 0.4, z, { seg: 8 });
  b.cyl(0.55, 0.32, 0.32, 'iron', x, h0 + 0.96, z, { seg: 10 });
  b.emitter('flame', x, h0 + 1.08, z, 18, { color: 0xff7020, size: 0.6 });
  b.light(0xff8a3a, 20, 14, x, h0 + 2.0, z, { flicker: true });
}

/** An iron lantern post with a wreath of fir and a red ribbon. */
function lanternPost(b, x, z, h0, rot) {
  const P = frame(x, z, rot);
  b.cyl(0.22, 0.28, 0.4, 'darkstone', x, h0 + 0.2, z, { seg: 8 });
  b.cyl(0.06, 0.08, 3.4, 'iron', x, h0 + 1.9, z, { seg: 6 });
  const [ax, az] = P(0, 0.36);
  b.box(0.08, 0.08, 0.78, 'iron', ax, h0 + 3.52, az, rot, { collide: false, cast: false });
  const [lx, lz] = P(0, 0.7);
  b.box(0.03, 0.32, 0.03, 'iron', lx, h0 + 3.35, lz, rot, { collide: false, cast: false });
  b.box(0.16, 0.24, 0.16, 'lanternglow', lx, h0 + 3.0, lz, rot, { collide: false, cast: false });
  if (hasProp('wooden_lantern_01')) placeProp(b, 'wooden_lantern_01', lx, h0 + 2.86, lz, { collide: false, scale: 0.8, rot });
  b.light(0xffb060, 12, 13, lx, h0 + 2.9, lz, { night: true });
  // a cap of snow on the bracket
  const [cx, cz] = P(0, 0.36);
  b.box(0.14, 0.06, 0.82, 'snow', cx, h0 + 3.59, cz, rot, { collide: false, cast: false });
  wreath(b, x + Math.sin(rot) * 0.1, h0 + 2.2, z + Math.cos(rot) * 0.1, rot, 0.22);
}

/** A ring of fir with berries and a red bow. */
function wreath(b, x, y, z, rot, s = 0.28) {
  const g = new THREE.Group();
  const fir = new THREE.Mesh(new THREE.TorusGeometry(s, s * 0.32, 8, 18), new THREE.MeshStandardMaterial({ color: 0x2a5a32, roughness: 0.9 }));
  g.add(fir);
  const berry = glow(1.2, 0.12, 0.1);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * PI * 2;
    const m = new THREE.Mesh(new THREE.SphereGeometry(s * 0.09, 5, 4), berry);
    m.position.set(Math.cos(a) * s, Math.sin(a) * s, s * 0.25);
    g.add(m);
  }
  const red = new THREE.MeshStandardMaterial({ color: 0xc02028, roughness: 0.6 });
  for (const sx of [-1, 1]) {
    const loop = new THREE.Mesh(new THREE.SphereGeometry(s * 0.25, 8, 6), red);
    loop.scale.set(1.3, 0.7, 0.5);
    loop.position.set(sx * s * 0.25, -s * 0.95, s * 0.3);
    g.add(loop);
  }
  g.position.set(x, y, z);
  g.rotation.y = rot;
  b.add(g);
}

/** The town tree: a great fir dressed in coloured lights, with a star on top. */
function townTree(b, x, z, h0) {
  const tree = buildTreeMesh('pine', 1.9, 61);
  tree.position.set(x, h0 - 0.2, z);
  b.add(tree);
  b.col.addCircle(x, z, 0.8, h0 - 1, h0 + 12, { walkable: false });
  const box = new THREE.Box3().setFromObject(tree);
  const top = box.max.y, base = h0 + 1.6;
  const cols = [glow(2.4, 0.5, 0.3), glow(2.2, 1.6, 0.4), glow(0.5, 1.2, 2.6), glow(0.5, 2.2, 0.8), glow(2.0, 0.6, 1.8)];
  // the lights wind up the tree in a spiral, hugging its cone
  const n = 70;
  const parts = cols.map(() => []);
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const y = base + t * (top - base - 1.0);
    const rad = (1 - t) * 2.6 + 0.35;
    const a = t * PI * 2 * 5.5;
    const g = new THREE.SphereGeometry(0.075, 6, 4);
    g.translate(x + Math.cos(a) * rad, y, z + Math.sin(a) * rad);
    parts[i % cols.length].push(g);
  }
  parts.forEach((list, k) => list.forEach((g) => b.add(new THREE.Mesh(g, cols[k]))));
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), glow(2.6, 2.0, 0.7));
  star.scale.set(1, 1.3, 0.35);
  star.position.set(x, top + 0.1, z);
  star.userData.spin = true;
  b.add(star);
  b.light(0xffd27a, 10, 12, x, top - 0.4, z, { night: true, flicker: false });
  b.light(0xffc0a0, 12, 14, x, base + 2, z, { night: true, flicker: false });
  b.interact({ kind: 'sign', name: 'The Wintersmeet Fir', text: 'A great fir, older than any house in the village, hung with coloured lamps that somebody climbs up to refill every evening. Ribbons are tied round the lowest branches, one for every child born in Wintersmeet, the oldest faded almost white.\n\nAt its foot a little carved sign says: "LIGHT THE WAY HOME".', pos: new THREE.Vector3(x, h0 + 1.2, z + 1.4), radius: 1.6, verb: 'Examine' });
}

function sled(b, x, z, h0, rot) {
  const P = frame(x, z, rot);
  b.box(0.7, 0.08, 1.4, 'wood@b0583a', x, h0 + 0.28, z, rot, { collide: false });
  for (const s of [-1, 1]) {
    const [rx, rz] = P(s * 0.3, 0);
    b.box(0.05, 0.05, 1.6, 'iron', rx, h0 + 0.05, rz, rot, { collide: false, cast: false });
    for (const k of [-0.5, 0.4]) { const [px, pz] = P(s * 0.3, k); b.box(0.05, 0.24, 0.05, 'wood@b0583a', px, h0 + 0.16, pz, rot, { collide: false, cast: false }); }
  }
  const [cx, cz] = P(0, -0.72);
  b.box(0.7, 0.05, 0.12, 'iron', cx, h0 + 0.18, cz, rot, { collide: false, cast: false, rx: 0.6 });
}

function woodpile(b, x, z, h0, rot) {
  const P = frame(x, z, rot);
  for (let row = 0; row < 4; row++) for (let i = 0; i < 6 - row; i++) {
    const [lx, lz] = P(-1.1 + i * 0.36 + row * 0.18, 0);
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.1, 7), M('timber'));
    log.rotation.set(0, rot, 0);
    log.rotateX(PI / 2);
    log.position.set(lx, h0 + 0.16 + row * 0.29, lz);
    log.castShadow = true;
    b.add(log);
  }
  b.box(2.3, 0.08, 1.3, 'snow', x, h0 + 1.24, z, rot, { collide: false, cast: false });
  b.col.addBox(x, z, 1.15, 0.6, rot, h0, h0 + 1.2);
}

export function buildWintersmeet(b, terrain) {
  const W = LOCATIONS.wintersmeet;
  const H = (x, z) => terrain.heightAt(x, z);
  const h0 = H(W.x, W.z);
  const at = (u, v) => [W.x + u, W.z + v];
  const state = {};

  // ---- houses: storybook paint under heavy snow, smoke from every chimney
  for (const [u, v, w, d, rot, name, style] of WINTERSMEET_HOUSES) {
    const [x, z] = at(u, v);
    if (style === 'inn') {
      house(b, x, z, h0, w, d, rot, {
        name, sign: 'The Snow Hare', snowRoof: true, roofH: 3.6,
        decor: { smoke: true, balcony: true, flowers: false, shutter: 0x2a4a6a },
        door: { kind: 'door', cell: 'snow_hare', name: 'The Snow Hare' },
      });
      // a snow hare carved and painted on a board above the door
      const P = frame(x, z, rot);
      const [hx, hz] = P(0, d / 2 + 0.25);
      const plank = textPlank('~ The Snow Hare ~', 2.6, 0.5, '#2a3a5a', '#f4f0e0');
      plank.position.set(hx, h0 + 3.0, hz);
      plank.rotation.y = rot;
      b.add(plank);
      wreath(b, ...P(0, d / 2 + 0.24).flatMap((c, i) => (i === 0 ? [c, h0 + 2.05] : [c])), rot, 0.3);
      // lanterns either side of the door
      for (const s of [-1, 1]) {
        const [lx, lz] = P(s * 1.3, d / 2 + 0.35);
        b.box(0.18, 0.28, 0.18, 'lanternglow', lx, h0 + 2.0, lz, rot, { collide: false, cast: false });
        b.light(0xffb868, 9, 9, lx, h0 + 2.0, lz, { night: true });
      }
      state.inn = { x, z };
      continue;
    }
    house(b, x, z, h0, w, d, rot, {
      name, snowRoof: true, oneStorey: style === 'one', sign: style === 'shop' ? name : undefined,
      decor: { smoke: true, flowers: false, balcony: false },
      door: { kind: 'door', name, locked: true, lockMsg: `The door of ${name} is shut tight against the cold.` },
    });
    const P = frame(x, z, rot);
    wreath(b, ...P(0, d / 2 + 0.24).flatMap((c, i) => (i === 0 ? [c, h0 + 2.05] : [c])), rot, 0.26);
  }

  // ---- the green: the lit fir, braziers, benches
  const [tx, tz] = at(0, 1);
  townTree(b, tx, tz, h0);
  for (const [u, v] of [[-5.5, 6], [5.5, 6], [0, -6.5]]) brazier(b, ...at(u, v), h0);
  if (hasProp('painted_wooden_bench')) {
    for (const [u, v, rot] of [[-9.5, 1, PI / 2], [9.5, 1, -PI / 2]]) {
      const [x, z] = at(u, v);
      placeProp(b, 'painted_wooden_bench', x, h0, z, { rot, scale: 1.1 });
      b.box(1.8, 0.07, 0.5, 'snow', x, h0 + 0.5, z, rot + PI / 2, { collide: false, cast: false });
    }
  }
  // fairy lights strung across the green between the cottages
  const roofY = h0 + 4.1;
  bunting(b, new THREE.Vector3(...[at(-14.5, -10)].flatMap(([x, z]) => [x, roofY, z])), new THREE.Vector3(...[at(14.5, -10)].flatMap(([x, z]) => [x, roofY, z])), 1.1, true);
  bunting(b, new THREE.Vector3(...[at(-16.5, 8)].flatMap(([x, z]) => [x, h0 + 3.6, z])), new THREE.Vector3(...[at(16, 8)].flatMap(([x, z]) => [x, h0 + 3.6, z])), 1.0, true);
  bunting(b, new THREE.Vector3(...[at(-6, 21)].flatMap(([x, z]) => [x, h0 + 3.3, z])), new THREE.Vector3(...[at(6.5, 22)].flatMap(([x, z]) => [x, h0 + 3.3, z])), 0.8, true);

  // ---- snowmen, a sled, firewood
  snowman(b, ...at(-8, 13), h0, 0.4, 3);
  snowman(b, ...at(9.5, -3.5), h0, -0.7, 8);
  sled(b, ...at(-6.4, 14.2), h0, 0.9);
  woodpile(b, ...at(-24.5, 3), h0, PI / 2);
  woodpile(b, ...at(24.2, 13), h0, PI / 2);

  // ---- lantern posts along the lane and round the green
  for (const [u, v, rot] of [[-3, 30, 0], [2.2, 18, 0], [-12, -3, PI / 2], [12.5, 15, -PI / 2], [6, -12.5, PI]]) lanternPost(b, ...at(u, v), h0, rot);

  // ---- Matilde's market stall of sweetrolls and pies outside the bakery
  {
    const [x, z] = at(11.5, -5), rot = -PI / 2;
    const P = frame(x, z, rot);
    b.box(2.6, 0.9, 1.2, 'wood', x, h0 + 0.45, z, rot);
    for (const [lx, lz] of [[-1.2, -0.55], [1.2, -0.55], [-1.2, 0.55], [1.2, 0.55]]) { const [px, pz] = P(lx, lz); b.box(0.1, 2.4, 0.1, 'timber', px, h0 + 1.2, pz, rot, { collide: false }); }
    const awn = b.box(3.0, 0.06, 1.8, 'cloth@c84a4a', x, h0 + 2.45, z, rot, { collide: false, rx: 0.2 });
    awn.castShadow = true;
    b.box(3.0, 0.1, 1.8, 'snow', x, h0 + 2.53, z, rot, { collide: false, rx: 0.2, cast: false });
    const bun = new THREE.MeshStandardMaterial({ color: 0xd89a50, roughness: 0.7 });
    const icing = new THREE.MeshStandardMaterial({ color: 0xfaf4ea, roughness: 0.5 });
    for (let i = 0; i < 9; i++) {
      const [px, pz] = P(-1 + (i % 5) * 0.48, -0.2 + Math.floor(i / 5) * 0.4);
      const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.1, 10), bun);
      roll.position.set(px, h0 + 0.95, pz);
      b.add(roll);
      const top = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 4, 0, PI * 2, 0, PI / 2), icing);
      top.position.set(px, h0 + 1.0, pz);
      b.add(top);
    }
  }

  // ---- the frozen pond, with an ice-fishing hole and a stool beside it
  {
    const [px, pz] = at(25, -27);
    let top = -Infinity;
    for (let k = 0; k < 10; k++) top = Math.max(top, H(px + Math.cos(k) * 5, pz + Math.sin(k) * 5));
    const ice = new THREE.Mesh(new THREE.CircleGeometry(5.2, 28), M('ice'));
    ice.rotation.x = -PI / 2;
    ice.position.set(px, top + 0.04, pz);
    ice.receiveShadow = true;
    b.add(ice);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(5.3, 0.35, 6, 32), M('snow'));
    rim.rotation.x = PI / 2;
    rim.scale.z = 0.45;
    rim.position.set(px, top + 0.02, pz);
    b.add(rim);
    b.col.addCircle(px, pz, 5.2, top - 2, top + 0.05, { walkable: true });
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.4, 14), new THREE.MeshStandardMaterial({ color: 0x0a1a28, roughness: 0.05, metalness: 0.4 }));
    hole.rotation.x = -PI / 2;
    hole.position.set(px + 1.5, top + 0.06, pz + 0.8);
    b.add(hole);
    b.cyl(0.18, 0.2, 0.42, 'wood', px + 2.2, top + 0.25, pz + 1.3, { seg: 8 });
    b.cyl(0.015, 0.02, 1.4, 'timber', px + 1.75, top + 0.5, pz + 1.0, { seg: 4, collide: false });
    b.interact({ kind: 'icehole', name: 'The Ice Hole', text: 'A neat round hole in the ice, skinned over with new ice that cracks when you breathe on it. A fishing line runs down into the black water. Carved into the stool beside it: "ERLEND\'S. NO SITTING. THIS MEANS YOU, GUNNAR."', pos: new THREE.Vector3(px + 1.5, top + 0.4, pz + 0.8), radius: 1.2, verb: 'Examine' });
  }

  // ---- picket fences round the cottage gardens, capped with snow
  for (const [[u0, v0], [u1, v1]] of [[[-24, -15], [-24, -5]], [[24, -15], [24, -5]], [[-15, 28], [-5, 28.5]], [[6, 29], [16, 29]]]) {
    const [x0, z0] = at(u0, v0), [x1, z1] = at(u1, v1);
    picketFence(b, new THREE.Vector3(x0, 0, z0), new THREE.Vector3(x1, 0, z1), h0, 'plaster@f4f0ea');
  }

  // ---- signpost where the north road comes in
  {
    const [x, z] = at(-4.5, 32);
    b.cyl(0.08, 0.1, 2.8, 'timber', x, h0 + 1.4, z, { seg: 6 });
    const s1 = textPlank('Wintersmeet', 1.5, 0.34);
    s1.position.set(x, h0 + 2.45, z);
    b.add(s1);
    const s2 = textPlank('Chorrol  >', 1.2, 0.28);
    s2.position.set(x + 0.3, h0 + 2.0, z);
    s2.rotation.y = -0.6;
    b.add(s2);
    b.box(0.2, 0.06, 0.2, 'snow', x, h0 + 2.83, z, 0, { collide: false, cast: false });
  }

  // a few crates and barrels about the yards
  if (hasProp('wooden_barrels_01')) {
    placeProp(b, 'wooden_barrels_01', ...[at(-6.5, -14.8)].flatMap(([x, z]) => [x, h0, z]), { variant: 0, rot: 0.3 });
    placeProp(b, 'wooden_crate_02', ...[at(7.2, -14.6)].flatMap(([x, z]) => [x, h0, z]), { rot: 0.2, scale: 1.1 });
  }
  return state;
}

// ===================================================================================== The White Hare
/** Hare tracks: two long hind prints ahead of two small fore prints, every bound along the path. */
function hareTracks(b, H, pts) {
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)));
  const len = curve.getLength();
  const parts = [];
  const n = Math.floor(len / 1.7);
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const p = curve.getPointAt(t), tan = curve.getTangentAt(t);
    const rot = Math.atan2(tan.x, tan.z);
    const side = new THREE.Vector3(Math.cos(rot), 0, -Math.sin(rot));
    const print = (dx, dz, w, l) => {
      const g = new THREE.CircleGeometry(1, 10);
      g.rotateX(-PI / 2);
      g.scale(w, 1, l);
      g.rotateY(rot);
      const x = p.x + side.x * dx + tan.x * dz, z = p.z + side.z * dx + tan.z * dz;
      g.translate(x, H(x, z) + 0.035, z);
      parts.push(g);
    };
    for (const s of [-1, 1]) print(s * 0.13, 0.3, 0.075, 0.18);
    print(-0.03, -0.1, 0.055, 0.08);
    print(0.04, -0.28, 0.055, 0.08);
  }
  const mesh = new THREE.Mesh(mergeGeometriesSafe(parts), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.25, 0.6, 2.2), transparent: true, opacity: 0.95, depthWrite: false }));
  mesh.userData.dynamic = true;
  mesh.renderOrder = 3;
  b.add(mesh);
  return mesh;
}
function mergeGeometriesSafe(parts) {
  // a single BufferGeometry from many small ones (all non-indexed after CircleGeometry -> toNonIndexed)
  const geos = parts.map((g) => g.toNonIndexed());
  let count = 0;
  for (const g of geos) count += g.attributes.position.count;
  const pos = new Float32Array(count * 3);
  let o = 0;
  for (const g of geos) { pos.set(g.attributes.position.array, o); o += g.attributes.position.array.length; }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return out;
}

/** A low snowberry bush: dark leaves under a crust of snow, studded with pale blue berries. */
function snowberryBush(b, x, z, h0, seed) {
  const r = rng(seed);
  const g = new THREE.Group();
  const leaf = new THREE.MeshStandardMaterial({ color: 0x2a4a34, roughness: 0.9 });
  const berry = new THREE.MeshStandardMaterial({ color: 0x8ab8f0, roughness: 0.3, emissive: 0x3a6aa0, emissiveIntensity: 0.25 });
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.28 + r() * 0.12, 8, 6), leaf);
    m.position.set((r() - 0.5) * 0.5, 0.22 + r() * 0.1, (r() - 0.5) * 0.5);
    m.scale.y = 0.7;
    g.add(m);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 5, 0, PI * 2, 0, PI / 2.4), M('snow'));
    cap.position.copy(m.position).add(new THREE.Vector3(0, 0.1, 0));
    g.add(cap);
  }
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), berry);
    const a = r() * PI * 2;
    m.position.set(Math.cos(a) * (0.3 + r() * 0.2), 0.15 + r() * 0.25, Math.sin(a) * (0.3 + r() * 0.2));
    g.add(m);
  }
  g.position.set(x, h0, z);
  b.add(g);
  return g;
}

/** A swirling wall of wind: two counter-rotating cylinders of streaming snow. */
function windWall(radius, height) {
  const mat = (dir, speed) => new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform float uTime; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
      void main(){
        vec2 p = vec2(vUv.x * 7.0 + uTime * ${(dir * speed * 0.35).toFixed(2)}, vUv.y * 70.0 + vUv.x * 18.0);
        float s = n(p) * 0.6 + n(p * 2.3) * 0.4;
        float streak = smoothstep(0.55, 0.9, s);
        float fade = smoothstep(0.0, 0.12, vUv.y) * smoothstep(1.0, 0.55, vUv.y);
        gl_FragColor = vec4(vec3(0.85, 0.9, 1.0) * streak * fade * 0.55, 1.0);
      }`,
  });
  const g = new THREE.Group();
  const a = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 48, 1, true), mat(1, 1.6));
  const c = new THREE.Mesh(new THREE.CylinderGeometry(radius - 1.6, radius - 1.6, height * 0.9, 48, 1, true), mat(-1, 2.3));
  a.position.y = c.position.y = height / 2 - 1;
  g.add(a, c);
  g.userData.mats = [a.material, c.material];
  g.userData.dynamic = true;
  a.userData.dynamic = c.userData.dynamic = true;
  return g;
}

export function buildWhiteHareSites(b, terrain, game) {
  const H = (x, z) => terrain.heightAt(x, z);
  const state = {};
  const flags = game.flags || {};

  // ---- the Skyward Shrine: Kynareth's little shrine on the mountainside, prayer flags snapping in the wind
  {
    const S = LOCATIONS.skyward_shrine;
    const h0 = H(S.x, S.z);
    b.cyl(4.2, 4.6, 0.5, 'whitestone', S.x, h0 + 0.05, S.z, { seg: 24, walkable: true });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * PI * 2;
      const px = S.x + Math.cos(a) * 3.8, pz = S.z + Math.sin(a) * 3.8;
      b.cyl(0.18, 0.24, 3.4, 'whitestone', px, h0 + 1.9, pz, { seg: 8 });
      b.cyl(0.26, 0.26, 0.12, 'snow', px, h0 + 3.66, pz, { seg: 8, collide: false });
    }
    // prayer flags: cords strung from post to post, hung with faded cloth in the four wind colours
    const flagCols = ['cloth@d8d0e8', 'cloth@9ab0d8', 'cloth@e8d8a8', 'cloth@b8d8c8'];
    for (let i = 0; i < 6; i++) {
      const a0 = (i / 6) * PI * 2, a1 = ((i + 1) / 6) * PI * 2;
      for (let k = 1; k < 6; k++) {
        const t = k / 6;
        const x = S.x + Math.cos(a0) * 3.8 * (1 - t) + Math.cos(a1) * 3.8 * t;
        const z = S.z + Math.sin(a0) * 3.8 * (1 - t) + Math.sin(a1) * 3.8 * t;
        b.box(0.26, 0.34, 0.02, flagCols[(i + k) % 4], x, h0 + 3.0 - Math.sin(t * PI) * 0.4, z, Math.atan2(Math.cos(a1) - Math.cos(a0), Math.sin(a1) - Math.sin(a0)), { collide: false, cast: false });
      }
    }
    if (hasProp('gothic_statue')) placeProp(b, 'gothic_statue', S.x, h0 + 0.3, S.z - 1.6, { rot: 0, scale: 1.2 });
    b.box(1.6, 0.9, 0.8, 'whitestone', S.x, h0 + 0.75, S.z + 0.4, 0);
    b.box(1.7, 0.1, 0.9, 'snow', S.x, h0 + 1.24, S.z + 0.4, 0, { collide: false, cast: false });
    b.interact({ kind: 'shrine', id: 'shrine_kynareth', name: 'Skyward Shrine of Kynareth', deity: 'Kynareth', pos: new THREE.Vector3(S.x, h0 + 1.2, S.z + 1.0), radius: 1.4, verb: 'Pray' });
    // the sprung snare, and what was left behind
    const sx = S.x + 2.2, sz = S.z + 2.0;
    b.cyl(0.03, 0.03, 0.6, 'timber', sx, h0 + 0.55, sz, { seg: 4, collide: false });
    b.box(0.5, 0.02, 0.02, 'iron', sx + 0.2, h0 + 0.3, sz, 0.5, { collide: false, cast: false });
    b.interact({ kind: 'sign', name: 'A Sprung Snare', text: 'A snare of braided wire, staked beside the altar and sprung. The noose has been pulled tight around nothing. Whoever set it knew exactly what they were doing — it is hidden under a drift where a small animal would come to shelter, and the stake is driven deep.\n\nThere is no blood. Whatever it caught, it caught alive.', pos: new THREE.Vector3(sx, h0 + 0.5, sz), radius: 1.2, verb: 'Examine' });
    if (!game.taken.hare_fur_pickup) game.placeItem(b, 'hare_fur', sx - 0.4, h0 + 0.33, sz + 0.3, 'hare_fur_pickup', { rot: 0.5 });
    if (!game.taken.trap_tag_pickup) game.placeItem(b, 'trap_tag', sx + 0.5, h0 + 0.33, sz - 0.3, 'trap_tag_pickup', { rot: 1.2 });
    b.light(0xbcd8ff, 6, 9, S.x, h0 + 2, S.z, { night: true, flicker: false });
  }

  // ---- the hare's tracks, glowing where she was carried away
  const trackPts = [[-250, -598], [-262, -590], [-285, -575], [-300, -560], [-318, -548], [-326, -541]];
  state.tracks = hareTracks(b, H, trackPts);
  state.tracks.visible = false;
  // and a glitter of frost hangs over them, so they can be followed from a distance
  state.trackSparkles = trackPts.map(([x, z]) => b.emitter('sparkle', x, H(x, z) + 0.4, z, 0, { range: 140, spread: 4 }));

  // ---- Varn Ice-Eye's camp: lean-to, pelts, empty cages, a fire
  {
    const C = LOCATIONS.varns_camp;
    const h0 = H(C.x, C.z);
    const roof = b.box(4, 0.14, 2.8, 'hay', C.x - 2.5, h0 + 1.6, C.z - 2, 0.2, { collide: false, rx: 0.55 });
    roof.castShadow = true;
    b.box(4.1, 0.18, 2.9, 'snow', C.x - 2.5, h0 + 1.75, C.z - 2.05, 0.2, { collide: false, rx: 0.55, cast: false });
    for (const [dx, dz, hh] of [[-1.8, 1.0, 2.3], [1.8, 1.0, 2.3], [-1.8, -1.0, 0.7], [1.8, -1.0, 0.7]]) b.cyl(0.07, 0.08, hh, 'timber', C.x - 2.5 + dx, h0 + hh / 2, C.z - 2 + dz, { seg: 5, collide: false });
    b.col.addBox(C.x - 2.5, C.z - 2, 2, 1.4, 0.2, h0, h0 + 2.3);
    b.box(1, 0.12, 2, 'cloth@6a5040', C.x - 2.5, h0 + 0.06, C.z - 2.2, 0.2, { collide: false });
    // pelts stretched on a rack
    for (const s of [-1, 1]) b.cyl(0.05, 0.06, 2.0, 'timber', C.x + 3 + s * 1.3, h0 + 1.0, C.z - 1, { seg: 5, collide: false });
    b.box(2.8, 0.06, 0.06, 'timber', C.x + 3, h0 + 1.95, C.z - 1, 0, { collide: false });
    for (let i = 0; i < 3; i++) b.box(0.7, 1.0, 0.04, ['cloth@8a7a6a', 'cloth@5a4a3a', 'cloth@c8c0b0'][i], C.x + 2.1 + i * 0.9, h0 + 1.4, C.z - 1, 0, { collide: false });
    // small iron cages, all empty but one
    for (let i = 0; i < 3; i++) {
      const cx = C.x + 1.5 + i * 0.9, cz = C.z + 2.4;
      b.box(0.6, 0.05, 0.5, 'iron', cx, h0 + 0.03, cz, 0.1 * i, { collide: false });
      b.box(0.6, 0.05, 0.5, 'iron', cx, h0 + 0.5, cz, 0.1 * i, { collide: false });
      for (let k = 0; k < 6; k++) b.box(0.02, 0.48, 0.02, 'iron', cx - 0.27 + (k % 3) * 0.27, h0 + 0.27, cz + (k < 3 ? -0.22 : 0.22), 0, { collide: false, cast: false });
      b.col.addBox(cx, cz, 0.3, 0.25, 0, h0, h0 + 0.5);
    }
    b.interact({ kind: 'sign', name: 'Trapper\'s Cages', text: 'Three small cages of rusted iron. Two smell of fox. The third has been scrubbed out, recently and carefully, and the bars are still rimed with a frost that has nothing to do with the weather.', pos: new THREE.Vector3(C.x + 2.4, h0 + 0.5, C.z + 2.4), radius: 1.6, verb: 'Examine' });
    // fire
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * PI * 2;
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2, 0), M('rock'));
      m.position.set(C.x + Math.cos(a) * 0.6, h0 + 0.08, C.z + 1 + Math.sin(a) * 0.6);
      b.add(m);
    }
    for (let i = 0; i < 3; i++) b.box(0.12, 0.12, 0.9, 'timber', C.x, h0 + 0.12, C.z + 1, i * 1.1, { collide: false });
    b.emitter('flame', C.x, h0 + 0.12, C.z + 1, 18, { color: 0xff7020, size: 0.65 });
    b.emitter('smoke', C.x, h0 + 1.3, C.z + 1, 2);
    b.light(0xff8030, 24, 15, C.x, h0 + 1, C.z + 1, { flicker: true });
    b.col.addCircle(C.x, C.z + 1, 0.7, h0, h0 + 0.3, { walkable: true });
    woodpile(b, C.x - 4.6, C.z + 1.8, h0, 0.3);
  }

  // ---- the Grandfather Fir on the knoll east of the village, and its lightning-split branch
  {
    const fx = -108, fz = -580, h0 = H(fx, fz);
    const tree = buildTreeMesh('pine', 2.7, 77);
    tree.position.set(fx, h0 - 0.3, fz);
    b.add(tree);
    b.col.addCircle(fx, fz, 1.1, h0 - 1, h0 + 14, { walkable: false });
    const scorch = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 3, 7), M('burnt'));
    scorch.position.set(fx + 0.4, h0 + 4.5, fz + 0.5);
    scorch.rotation.z = 0.3;
    b.add(scorch);
    b.interact({ kind: 'sign', name: 'The Grandfather Fir', text: 'The oldest tree on the mountain: a fir so broad that three people could not join hands around it. Long ago lightning split it nearly in two, and it simply went on growing around the wound, which is now black and smooth as horn.\n\nSomeone has hung a little bundle of dried heather on a nail in the bark.', pos: new THREE.Vector3(fx, h0 + 1.4, fz + 1.4), radius: 1.6, verb: 'Examine' });
    const bx = fx + 3.2, bz = fz + 2.2;
    const branch = b.box(0.5, 0.45, 3.4, 'timber@6a3a28', bx, h0 + 0.25, bz, 0.6, { collide: false });
    b.box(0.55, 0.1, 3.2, 'snow', bx, h0 + 0.5, bz, 0.6, { collide: false, cast: false });
    state.heartwood = b.interact({ kind: 'heartwood', id: 'gf_heartwood', name: 'Lightning-Split Branch', pos: new THREE.Vector3(bx, h0 + 0.6, bz), radius: 1.6, verb: 'Take heartwood', mesh: branch, requireNoFlag: 'heartwoodTaken' });
  }

  // ---- snowberry bushes round the frozen pond
  {
    const px = -155, pz = -575;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * PI * 2 + 0.4, d = 7.2 + (i % 2) * 1.6;
      const x = px + Math.cos(a) * d, z = pz + Math.sin(a) * d;
      const g = snowberryBush(b, x, z, H(x, z), 40 + i);
      b.interact({ kind: 'harvest', id: `snowberry_${i}`, name: 'Snowberry Bush', item: 'snowberry', respawnDays: 1, pos: new THREE.Vector3(x, H(x, z) + 0.4, z), radius: 1.1, verb: 'Harvest', mesh: g });
    }
  }

  // ---- the Rime Spire on its ledge above the village, wrapped in a wall of wind
  {
    const R = LOCATIONS.rime_spire;
    const h0 = H(R.x, R.z);
    const toward = Math.atan2(-110 - R.x, -619 - R.z);
    const tw = 22;
    b.cyl(4.4, 5.0, tw, 'whitestone@d4e2f0', R.x, h0 + tw / 2 - 1, R.z, { seg: 16, tile: 4 });
    b.cyl(5.3, 5.3, 1.4, 'whitestone@c8d8e8', R.x, h0 + tw, R.z, { seg: 16, collide: false });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * PI * 2;
      b.box(1.0, 1.2, 0.8, 'whitestone@c8d8e8', R.x + Math.cos(a) * 5, h0 + tw + 1.2, R.z + Math.sin(a) * 5, -a, { collide: false, cast: false });
    }
    const cone = new THREE.Mesh(new THREE.ConeGeometry(4.8, 7, 16), M('roof@8aa0c0'));
    cone.position.set(R.x, h0 + tw + 4.4, R.z);
    cone.castShadow = true;
    b.add(cone);
    const capS = new THREE.Mesh(new THREE.ConeGeometry(3.4, 5.0, 16), M('snow'));
    capS.position.set(R.x, h0 + tw + 5.5, R.z);
    b.add(capS);
    // ice crystals growing out of the stone
    for (let i = 0; i < 9; i++) {
      const a = i * 2.39, y = 3 + (i * 2.3) % (tw - 4);
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.6 + (i % 3) * 0.3, 0), M('ice'));
      m.scale.set(0.5, 1.6, 0.5);
      m.position.set(R.x + Math.cos(a) * 4.7, h0 + y, R.z + Math.sin(a) * 4.7);
      m.rotation.set(Math.cos(a) * 0.6, 0, Math.sin(a) * 0.6);
      b.add(m);
    }
    for (let i = 0; i < 4; i++) {
      const a = toward + PI / 2 + i * PI / 2;
      b.box(0.5, 1.4, 0.2, 'window', R.x + Math.sin(a) * 4.75, h0 + 8 + i * 3.5, R.z + Math.cos(a) * 4.75, a, { collide: false, cast: false });
    }
    // the door
    const dx = R.x + Math.sin(toward) * 4.9, dz = R.z + Math.cos(toward) * 4.9;
    b.box(1.9, 2.8, 0.3, 'timber@5a6a7a', dx, h0 + 1.4, dz, toward, { collide: false });
    b.box(2.6, 0.5, 0.5, 'whitestone@c8d8e8', dx, h0 + 3.0, dz, toward, { collide: false });
    b.light(0xb8d8ff, 14, 14, R.x, h0 + tw + 2, R.z, { night: true, flicker: false });
    b.interact({ kind: 'door', cell: 'rime_spire', name: 'The Rime Spire', requireFlag: 'windCalmed', pos: new THREE.Vector3(dx + Math.sin(toward) * 0.6, h0 + 1.3, dz + Math.cos(toward) * 0.6), radius: 1.6, verb: 'Enter' });
    state.spireDoor = { x: dx, z: dz, yaw: toward };
    const wall = windWall(15, 34);
    wall.position.set(R.x, h0 - 2, R.z);
    b.add(wall);
    state.windWall = wall;
    state.spire = { x: R.x, z: R.z, h0 };
  }

  // ---- the white hare's place on the ridge of the Snow Hare's roof
  {
    const W = LOCATIONS.wintersmeet;
    const h0 = H(W.x, W.z);
    const hare = buildHareMesh({ glow: 0.7 });
    hare.scale.setScalar(1.9);
    hare.position.set(W.x + 3, h0 + 10.25, W.z - 18);
    hare.rotation.y = 0.2;
    hare.userData.dynamic = true;
    hare.traverse((o) => { o.userData.dynamic = true; });
    b.add(hare);
    state.roofHare = hare;
    state.roofLight = b.light(0xb0d0ff, 6, 8, W.x + 3, h0 + 10.8, W.z - 17.4, { night: true, flicker: false });
    hare.visible = !!flags.lightwatchDone;
    state.roofLight.on = !!flags.lightwatchDone;
  }
  return state;
}

// ===================================================================================== Ten White Rabbits
/** A goblin hide tent: a cone of stitched skins on poles. */
function hideTent(b, x, z, h0, r = 1.6, hgt = 2.4, tint = 'cloth@8a7a62') {
  const cone = new THREE.Mesh(new THREE.ConeGeometry(r, hgt, 7, 1, true), M(tint));
  cone.position.set(x, h0 + hgt / 2, z);
  cone.castShadow = true;
  b.add(cone);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.75, hgt * 0.55, 7, 1, true), M('snow'));
  cap.position.set(x, h0 + hgt * 0.74, z);
  b.add(cap);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * PI * 2;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, hgt * 1.25, 4), M('timber'));
    pole.position.set(x + Math.cos(a) * 0.15, h0 + hgt * 0.6, z + Math.sin(a) * 0.15);
    pole.rotation.set(Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12);
    b.add(pole);
  }
  b.box(0.7, 1.1, 0.05, 'dark', x, h0 + 0.55, z + r * 0.9, 0, { collide: false, cast: false });
  b.col.addCircle(x, z, r * 0.9, h0, h0 + hgt);
}

export function buildRabbitSites(b, terrain, game) {
  const H = (x, z) => terrain.heightAt(x, z);
  const state = {};
  // ---- Snikkit's den: a tent, a little fire, and the cage of ten white rabbits
  {
    const D = LOCATIONS.snikkits_den;
    const h0 = H(D.x, D.z);
    hideTent(b, D.x - 3.5, D.z - 2.5, h0, 1.3, 2.0, 'cloth@6a5a4a');
    for (let i = 0; i < 6; i++) { const a = (i / 6) * PI * 2; const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.15, 0), M('rock')); m.position.set(D.x - 1 + Math.cos(a) * 0.4, h0 + 0.06, D.z + 1.5 + Math.sin(a) * 0.4); b.add(m); }
    b.emitter('flame', D.x - 1, h0 + 0.08, D.z + 1.5, 10, { color: 0xff7020, size: 0.35 });
    b.light(0xff8a3a, 10, 10, D.x - 1, h0 + 0.8, D.z + 1.5, { flicker: true });
    // the cage: an iron box on a stone, and ten white rabbits inside it
    const cx = D.x + 2.2, cz = D.z - 0.5;
    const cage = new THREE.Group();
    cage.position.set(cx, h0, cz);
    const iron = M('iron');
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 1.5), M('timber'));
    base.position.y = 0.06;
    cage.add(base);
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.06, 1.5), iron);
    top.position.y = 1.0;
    cage.add(top);
    const capS = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.1, 1.4), M('snow'));
    capS.position.y = 1.08;
    cage.add(capS);
    for (let i = 0; i <= 10; i++) for (const s of [-1, 1]) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.95, 4), iron);
      bar.position.set(-1.28 + i * 0.256, 0.53, s * 0.73);
      cage.add(bar);
    }
    for (let i = 0; i <= 5; i++) for (const s of [-1, 1]) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.95, 4), iron);
      bar.position.set(s * 1.28, 0.53, -0.73 + i * 0.29);
      cage.add(bar);
    }
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.04), new THREE.MeshStandardMaterial({ color: 0x3a3a3e, metalness: 0.8, roughness: 0.5, wireframe: true }));
    door.position.set(0, 0.52, 0.75);
    cage.add(door);
    const bunnies = [];
    for (let i = 0; i < 10; i++) {
      const h = buildHareMesh({ glow: 0 });
      h.scale.setScalar(0.62);
      h.position.set(-1.0 + (i % 5) * 0.5 + (i >= 5 ? 0.22 : 0), 0.12, i < 5 ? -0.3 : 0.28);
      h.rotation.y = (i * 1.7) % 6.28;
      h.userData.phase = i * 0.7;
      cage.add(h);
      bunnies.push(h);
    }
    cage.rotation.y = 0.3;
    cage.userData.dynamic = true;
    cage.traverse((o) => { o.userData.dynamic = true; });
    b.add(cage);
    b.col.addBox(cx, cz, 1.3, 0.75, 0.3, h0, h0 + 1.1);
    state.cage = { group: cage, door, bunnies, x: cx, z: cz, h0, rot: 0.3 };
    state.cageIt = b.interact({ kind: 'rabbitcage', id: 'snikkit_cage', name: 'Rabbit Cage', lock: { level: 3, key: 'snikkit_key' }, pos: new THREE.Vector3(cx + Math.sin(0.3) * 0.9, h0 + 0.7, cz + Math.cos(0.3) * 0.9), radius: 1.5, verb: 'Open' });
    // a sign that fools no one
    b.cyl(0.05, 0.06, 1.3, 'timber', D.x - 5, h0 + 0.65, D.z + 4, { seg: 5 });
    const plank = textPlank('NO RABITS HEER', 1.0, 0.28, '#5a3e26', '#f0e0b0');
    plank.position.set(D.x - 5, h0 + 1.1, D.z + 4.04);
    b.add(plank);
    b.interact({ kind: 'sign', name: 'A Sign', text: 'Scratched into the plank in big, careful, wobbly letters:\n\nNO RABITS HEER\nGO AWAY\n— NOT SNIKKIT', pos: new THREE.Vector3(D.x - 5, h0 + 1.0, D.z + 4.3), radius: 1.0, verb: 'Read' });
  }
  // ---- Frostfang Hollow: the goblin war-camp, round a fire and a throne of crates under a bear skull
  {
    const F = LOCATIONS.frostfang_hollow;
    const h0 = H(F.x, F.z);
    for (const [dx, dz, r, h] of [[-8, -5, 1.8, 2.8], [7, -7, 1.6, 2.5], [9, 4, 1.7, 2.6], [-9, 5, 1.5, 2.3], [0, -10, 2.0, 3.0]]) hideTent(b, F.x + dx, F.z + dz, h0, r, h);
    // the bonfire
    for (let i = 0; i < 8; i++) { const a = (i / 8) * PI * 2; const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.25, 0), M('rock')); m.position.set(F.x + Math.cos(a) * 0.9, h0 + 0.1, F.z + Math.sin(a) * 0.9); b.add(m); }
    for (let i = 0; i < 4; i++) b.box(0.18, 0.18, 1.6, 'timber', F.x, h0 + 0.2, F.z, i * 0.8, { collide: false });
    b.emitter('flame', F.x, h0 + 0.2, F.z, 22, { color: 0xff7020, size: 0.9 });
    b.emitter('smoke', F.x, h0 + 2.2, F.z, 3);
    b.light(0xff8030, 30, 20, F.x, h0 + 1.5, F.z, { flicker: true });
    b.col.addCircle(F.x, F.z, 1.0, h0, h0 + 0.4, { walkable: true });
    // the stew pot, empty and waiting
    b.cyl(0.55, 0.42, 0.7, 'iron', F.x + 3.2, h0 + 0.42, F.z + 1.2, { seg: 12 });
    for (let k = 0; k < 3; k++) b.box(0.08, 0.5, 0.08, 'iron', F.x + 3.2 + Math.cos(k * 2.1) * 0.45, h0 + 0.1, F.z + 1.2 + Math.sin(k * 2.1) * 0.45, 0, { collide: false });
    b.interact({ kind: 'sign', name: 'The Moonfeast Pot', text: 'An enormous iron pot, scrubbed clean and waiting. Someone has scratched a tally on its side: ten little marks, every one of them crossed out and redrawn several times. Beside it lies a ladle the size of a shovel and a very small apron.', pos: new THREE.Vector3(F.x + 3.2, h0 + 0.8, F.z + 1.2), radius: 1.3, verb: 'Examine' });
    // the Chief's throne under a bear skull on a pole
    b.box(1.6, 0.8, 1.0, 'wood', F.x, h0 + 0.4, F.z - 6, 0);
    b.box(1.6, 1.4, 0.3, 'wood', F.x, h0 + 1.1, F.z - 6.45, 0);
    b.box(1.8, 0.1, 1.1, 'cloth@d8d0c0', F.x, h0 + 0.85, F.z - 6, 0, { collide: false });
    b.cyl(0.07, 0.09, 3.6, 'timber', F.x + 1.5, h0 + 1.8, F.z - 6.6, { seg: 5 });
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), M('bone'));
    skull.scale.set(1, 0.8, 1.4);
    skull.position.set(F.x + 1.5, h0 + 3.7, F.z - 6.5);
    b.add(skull);
    for (const s of [-1, 1]) { const horn = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.4, 5), M('bone')); horn.position.set(F.x + 1.5 + s * 0.2, h0 + 3.95, F.z - 6.6); horn.rotation.z = -s * 0.5; b.add(horn); }
    state.hollow = { x: F.x, z: F.z, h0, throne: { x: F.x, z: F.z - 5.2 } };
  }
  return state;
}
