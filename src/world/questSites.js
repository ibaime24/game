// Overworld sites for "The Unfinished Map": the Hollow Stones, the Drowned Bell and Old Marrow's camp.
import * as THREE from 'three';
import { M } from './builder.js';
import { chest } from './structures.js';
import { buildTreeMesh } from './vegetation.js';
import { LOCATIONS } from './layout.js';
import { hasProp, placeProp, makeProp } from './props.js';
import * as TG from './texgen.js';

const PI = Math.PI;

function rng(seed) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** A rough standing stone: a tapered, slightly twisted block. */
function menhir(b, x, z, h0, h, w, rot, lean) {
  const geo = new THREE.CylinderGeometry(w * 0.55, w, h, 5, 3);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    p.setX(i, p.getX(i) * (1 + Math.sin(y * 3.1 + x) * 0.08));
    p.setZ(i, p.getZ(i) * 0.7 * (1 + Math.cos(y * 2.3 + z) * 0.1));
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, M('rock'));
  m.position.set(x, h0 + h / 2 - 0.4, z);
  m.rotation.set(lean, rot, lean * 0.5);
  m.castShadow = true;
  m.receiveShadow = true;
  b.add(m);
  b.col.addCircle(x, z, w * 0.75, h0 - 1, h0 + h, { walkable: false });
  return m;
}

/** A bronze bell built from a lathe profile. */
function bellMesh(scale = 1) {
  const pts = [];
  const prof = [[0.05, 1.25], [0.32, 1.2], [0.45, 1.08], [0.5, 0.85], [0.55, 0.55], [0.66, 0.25], [0.82, 0.06], [0.86, 0], [0.8, 0.0]];
  for (const [r, y] of prof) pts.push(new THREE.Vector2(r * scale, y * scale));
  const geo = new THREE.LatheGeometry(pts, 28);
  const mat = new THREE.MeshStandardMaterial({ color: 0x4f7a5a, roughness: 0.45, metalness: 0.85, side: THREE.DoubleSide });
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  return m;
}

export function buildQuestSites(b, terrain, game) {
  const H = (x, z) => terrain.heightAt(x, z);
  const state = {};

  // ===================================================== the Hollow Stones
  {
    const S = LOCATIONS.hollow_stones;
    const h0 = H(S.x, S.z);
    const r = rng(41);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * PI * 2 + 0.2;
      const broken = i === 3 || i === 7;
      const hh = broken ? 1.6 + r() : 3.6 + r() * 1.6;
      menhir(b, S.x + Math.cos(a) * 9.5, S.z + Math.sin(a) * 9.5, h0, hh, 0.85 + r() * 0.25, -a, (r() - 0.5) * 0.12);
      if (broken) {
        // the fallen top lies beside its stump
        const top = b.box(0.9, 0.7, 2.6, 'rock', S.x + Math.cos(a) * 11.6, h0 + 0.25, S.z + Math.sin(a) * 11.6, -a + 0.4, { rz: 0.15 });
        top.castShadow = true;
      }
    }
    // two trilithons on the north side frame where the door appears
    for (const s of [-1, 1]) menhir(b, S.x + s * 2.1, S.z - 13.5, h0, 4.6, 0.9, 0, 0);
    b.box(5.8, 0.9, 1.3, 'rock', S.x, h0 + 4.6, S.z - 13.5, 0, { collide: false });
    // altar with glyph ring
    b.box(2.2, 1.0, 1.3, 'rock', S.x, h0 + 0.5, S.z, 0);
    b.box(2.5, 0.12, 1.6, 'ayleid', S.x, h0 + 1.04, S.z, 0, { collide: false });
    const glyphMat = new THREE.MeshStandardMaterial({ color: 0x8ab8ff, emissive: 0x3070ff, emissiveIntensity: 0.6 });
    const moon = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.025, 6, 14, PI * 1.3), glyphMat);
    moon.position.set(S.x - 0.75, h0 + 1.11, S.z + 0.5); moon.rotation.x = -PI / 2;
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.1), glyphMat);
    star.position.set(S.x, h0 + 1.13, S.z + 0.55); star.scale.y = 0.3;
    const sun = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1), glyphMat);
    sun.position.set(S.x + 0.75, h0 + 1.13, S.z + 0.5); sun.scale.y = 0.3;
    b.add(moon); b.add(star); b.add(sun);
    if (hasProp('rock_moss_set_01')) {
      for (let i = 0; i < 6; i++) {
        const a = r() * PI * 2, d = 14 + r() * 8;
        placeProp(b, 'rock_moss_set_01', S.x + Math.cos(a) * d, H(S.x + Math.cos(a) * d, S.z + Math.sin(a) * d) - 0.2, S.z + Math.sin(a) * d, { variant: i, scale: 0.8 + r() * 0.6, rot: r() * 6, collide: false });
      }
    }
    b.interact({ kind: 'altar', id: 'hollow_altar', name: 'Altar of the Hollow Stones', pos: new THREE.Vector3(S.x, h0 + 0.9, S.z + 0.9), radius: 1.3, verb: 'Examine' });
    if (!game.taken.corvin_waymark_pickup) game.placeItem(b, 'corvin_waymark', S.x - 0.3, h0 + 1.1, S.z - 0.2, 'corvin_waymark_pickup', { rot: 0.3 });
    // the door of light (hidden until midnight and the fork)
    const door = new THREE.Group();
    const portal = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.9), new THREE.MeshBasicMaterial({ color: 0x9ad0ff, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true }));
    portal.position.set(0, 2.1, 0);
    door.add(portal);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.2), M('welkynd'));
    glow.position.set(0, 1.9, -0.05);
    door.add(glow);
    door.position.set(S.x, h0, S.z - 13.5);
    b.add(door);
    const light = b.light(0x6aa8ff, 30, 18, S.x, h0 + 2.5, S.z - 12.5, { flicker: false });
    b.interact({ kind: 'door', cell: 'nenalatha', name: 'Nenalatha', requireFlag: 'nenalathaOpen', pos: new THREE.Vector3(S.x, h0 + 1.4, S.z - 12.8), radius: 1.8, verb: 'Enter', mesh: door, light });
    b.light(0x5080ff, 6, 8, S.x, h0 + 1.6, S.z, { flicker: false, night: true });
    state.hollow = { x: S.x, z: S.z, h0 };
  }

  // ===================================================== the Drowned Bell
  {
    const B = LOCATIONS.drowned_bell;
    const h0 = H(B.x, B.z);
    const shore = { x: 72, z: 417.5 };
    const dir = new THREE.Vector2(shore.x - B.x, shore.z - B.z).normalize();
    const rot = Math.atan2(dir.x, dir.y);
    const P = (lx, lz) => [B.x + lx * Math.cos(rot) + lz * Math.sin(rot), B.z - lx * Math.sin(rot) + lz * Math.cos(rot)];
    // ruined chapel tower: three broken walls, open toward the shore
    const walls = [[0, -2.6, 5.4, 0.7, 6.5], [-2.6, -0.2, 0.7, 4.6, 4.2], [2.6, -0.6, 0.7, 4.0, 2.4], [-1.9, 2.4, 1.8, 0.7, 3.0]];
    for (const [lx, lz, w, d, hh] of walls) {
      const [wx, wz] = P(lx, lz);
      b.box(w, hh + 2, d, 'stone', wx, h0 + hh / 2 - 1, wz, rot);
    }
    // a gaping belfry window high in the back wall
    const [bx, bz] = P(0, -2.95);
    b.box(1.4, 1.8, 0.1, 'dark', bx, h0 + 4.6, bz, rot, { collide: false });
    // the fallen bell lies half in the water
    const bell = bellMesh(1.3);
    const [blx, blz] = P(3.6, 2.4);
    bell.position.set(blx, h0 - 0.55, blz);
    bell.rotation.set(1.25, rot + 0.6, 0.2);
    b.add(bell);
    b.col.addCircle(blx, blz, 1.0, h0 - 2, h0 + 0.9, { walkable: true });
    b.interact({ kind: 'sign', name: 'The Drowned Bell', text: 'A great bronze bell, green with age, lies on its side in the shallows. Someone has scratched words into its lip with the point of a knife:\n\n"RING ME AND HE COMES HOME"\n\nThe scratches are much newer than the bell.', pos: new THREE.Vector3(blx, h0 + 0.6, blz), radius: 1.8, verb: 'Examine' });
    // the chest inside the tower holds what Ysolde threw away
    const [cx, cz] = P(-0.8, -1.4);
    chest(b, cx, h0, cz, rot, { id: 'drowned_bell_chest', name: 'Waterlogged Strongbox', items: ['tuning_fork', 'ysolde_page'], loot: 'chest_common', lock: 2 });
    // rubble and a broken steeple in the water
    const spire = new THREE.Mesh(new THREE.ConeGeometry(1.8, 4.5, 6), M('roof'));
    const [sx, sz] = P(-4.8, 3.5);
    spire.position.set(sx, h0 - 0.8, sz);
    spire.rotation.set(1.3, rot, 0.4);
    spire.castShadow = true;
    b.add(spire);
    // stepping stones back to the shore
    for (let i = 0; i < 7; i++) {
      const t = 7 + i * 2.25;
      const x = B.x + dir.x * t + Math.sin(i * 1.7) * 0.6, z = B.z + dir.y * t + Math.cos(i * 1.3) * 0.6;
      const g = H(x, z);
      if (g > 0.3) break;
      const top = 0.35 + Math.max(0, 3 - i) * 0.24;
      b.cyl(0.85, 1.0, top - g + 0.5, 'rock', x, (top + g - 0.5) / 2, z, { seg: 7, walkable: true });
    }
    state.bell = { x: B.x, z: B.z, h0 };
  }

  // ===================================================== Old Marrow's camp
  {
    const C = LOCATIONS.old_marrow;
    const h0 = H(C.x, C.z);
    // lean-to of poles and thatch
    const roof = b.box(3.6, 0.12, 2.6, 'hay', C.x + 2.5, h0 + 1.5, C.z - 2.2, 0.3, { collide: false, rx: 0.55 });
    roof.castShadow = true;
    for (const [dx, dz, hh] of [[-1.6, 1.0, 2.2], [1.6, 1.0, 2.2], [-1.6, -1.0, 0.6], [1.6, -1.0, 0.6]]) {
      const x = C.x + 2.5 + dx * Math.cos(0.3) + dz * Math.sin(0.3), z = C.z - 2.2 - dx * Math.sin(0.3) + dz * Math.cos(0.3);
      b.cyl(0.07, 0.08, hh, 'timber', x, h0 + hh / 2, z, { seg: 5, collide: false });
    }
    b.col.addBox(C.x + 2.5, C.z - 2.2, 1.8, 1.3, 0.3, h0, h0 + 2.2);
    const bed = b.box(0.9, 0.12, 2, 'clothred', C.x + 2.5, h0 + 0.06, C.z - 2.4, 0.3 + PI / 2, { collide: false });
    b.interact({ kind: 'bed', id: 'marrow_bed', name: "Marrow's Bedroll", owner: 'Old Marrow', pos: new THREE.Vector3(C.x + 2.5, h0 + 0.3, C.z - 2.4), radius: 1.0, verb: 'Sleep', mesh: bed });
    // fire
    if (hasProp('stone_fire_pit')) placeProp(b, 'stone_fire_pit', C.x, h0 - 0.05, C.z + 1.5, { collide: false });
    for (let i = 0; i < 3; i++) b.box(0.12, 0.12, 0.9, 'timber', C.x, h0 + 0.12, C.z + 1.5, i * 1.1, { collide: false });
    b.light(0xff8030, 26, 16, C.x, h0 + 1, C.z + 1.5, { flicker: true });
    b.emitter('flame', C.x, h0 + 0.15, C.z + 1.5, 20, { color: 0xff7020, size: 0.7 });
    b.emitter('smoke', C.x, h0 + 1.2, C.z + 1.5, 2);
    b.col.addCircle(C.x, C.z + 1.5, 0.7, h0, h0 + 0.4, { walkable: true });
    // drying rack hung with ferns and herbs
    for (const s of [-1, 1]) b.cyl(0.05, 0.06, 1.9, 'timber', C.x - 3 + s * 1.2, h0 + 0.95, C.z - 0.5, { seg: 5, collide: false });
    b.box(2.6, 0.06, 0.06, 'timber', C.x - 3, h0 + 1.85, C.z - 0.5, 0, { collide: false });
    if (hasProp('fern_02')) {
      for (let i = 0; i < 5; i++) {
        const f = makeProp(i % 2 ? 'nettle_plant' : 'fern_02', { variant: i, height: 0.6 });
        f.position.set(C.x - 4 + i * 0.5, h0 + 1.85, C.z - 0.5);
        f.rotation.set(PI, i, 0);
        b.add(f);
      }
      placeProp(b, 'tree_stump_02', C.x + 1.6, h0 - 0.05, C.z + 2.8, { scale: 0.55 });
      placeProp(b, 'wooden_bucket_01', C.x - 1.8, h0, C.z + 2.6, {});
      placeProp(b, 'brass_pot_01', C.x + 0.7, h0, C.z + 1.0, { collide: false });
      placeProp(b, 'wine_bottles_01', C.x + 3.6, h0, C.z - 0.6, { variant: 3, collide: false });
      placeProp(b, 'wicker_basket_02', C.x - 2.2, h0, C.z - 1.6, { collide: false });
    }
    // the tree with an eye
    const tx = C.x - 5.5, tz = C.z + 4.5;
    const tree = buildTreeMesh('oak', 1.5, 91);
    tree.position.set(tx, h0 - 0.3, tz);
    b.add(tree);
    b.col.addCircle(tx, tz, 0.6, h0 - 1, h0 + 7, { walkable: false });
    const eye = new THREE.Group();
    const white = new THREE.Mesh(new THREE.CircleGeometry(0.22, 16), new THREE.MeshStandardMaterial({ color: 0xd8c8a0, roughness: 0.9 }));
    white.scale.set(1.6, 0.8, 1);
    const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.11, 12), new THREE.MeshStandardMaterial({ color: 0x1a1008, roughness: 1 }));
    pupil.position.z = 0.005;
    eye.add(white, pupil);
    const toCamp = Math.atan2(C.x - tx, C.z + 1.5 - tz);
    eye.position.set(tx + Math.sin(toCamp) * 0.55, h0 + 1.7, tz + Math.cos(toCamp) * 0.55);
    eye.rotation.y = toCamp;
    b.add(eye);
    b.interact({ kind: 'sign', name: 'The Tree with an Eye', text: 'An eye has been carved deep into the bark of the old oak, slowly and with great care, and rubbed with ochre so it never quite fades.\n\nIt is very hard not to feel watched.', pos: new THREE.Vector3(eye.position.x, h0 + 1.5, eye.position.z), radius: 1.5, verb: 'Examine' });
  }
  return state;
}


/** Main quest, act two: the Chapel of Akatosh door in burned Kvatch, and the ruin of Fort Sutch. */
export function buildMainQuestSites(b, terrain) {
  const H = (x, z) => terrain.heightAt(x, z);
  // ---- the chapel steeple (built by buildWorldStructures) gets a barred door on its south face
  {
    const K = LOCATIONS.kvatch;
    const x = K.x + 4, z = K.z - 2 + 3.05, h0 = H(x, z);
    b.box(1.8, 2.8, 0.25, 'timber', x, h0 + 1.4, z, 0, { collide: false });
    b.box(2.3, 0.35, 0.4, 'burnt', x, h0 + 2.95, z + 0.05, 0, { collide: false });
    for (const hy of [0.7, 2.0]) b.box(1.9, 0.08, 0.06, 'iron', x, h0 + hy, z + 0.15, 0, { collide: false, cast: false });
    b.light(0xffb070, 8, 8, x, h0 + 2.2, z + 1.5, { flicker: true });
    b.interact({ kind: 'door', cell: 'kvatch_chapel', name: 'Chapel of Akatosh', requireFlag: 'chapelOpen', pos: new THREE.Vector3(x, h0 + 1.2, z + 0.8), radius: 1.4, verb: 'Enter' });
    b.interact({ kind: 'sign', name: 'Chapel of Akatosh', text: 'The chapel doors are barred from the inside. Through the gap you hear someone praying, very quietly, and something heavy being dragged across the floor.', pos: new THREE.Vector3(x, h0 + 1.2, z + 0.8), radius: 1.4, verb: 'Examine', requireNoFlag: 'chapelOpen' });
  }
  // ---- Fort Sutch: a ruined Legion fort on the Gold Coast road
  {
    const F = LOCATIONS.fort_sutch;
    const h0 = H(F.x, F.z);
    const S = 15, wallH = 7;
    const seg = (x, z, len, rot, hh = wallH) => b.box(len, hh + 1.5, 2.2, 'stone', x, h0 + hh / 2 - 0.75, z, rot, { tile: 4 });
    // curtain walls with a breach and a gate on the south side
    seg(F.x - 9, F.z + S, 12, 0); seg(F.x + 10, F.z + S, 10, 0, 4.5);
    seg(F.x, F.z - S, S * 2, 0, 5.5);
    seg(F.x - S, F.z - 4, 22, Math.PI / 2); seg(F.x + S, F.z + 2, 26, Math.PI / 2, 6);
    // crenellations
    for (let i = -6; i <= 6; i += 2) b.box(0.9, 0.9, 2.3, 'stone', F.x + i * 2.2, h0 + 5.4, F.z - S, 0, { collide: false, cast: false });
    // towers: one standing, one collapsed into rubble
    b.cyl(3.2, 3.6, wallH + 5, 'stone', F.x - S, h0 + (wallH + 5) / 2 - 1, F.z - S, { seg: 12, tile: 4 });
    b.cyl(3.2, 3.6, 3.5, 'stone', F.x + S, h0 + 1.2, F.z + S, { seg: 12, tile: 4 });
    for (let i = 0; i < 7; i++) b.box(1.2 + (i % 3) * 0.4, 0.8, 1.6, 'stone', F.x + S + 3 + Math.cos(i) * 3, h0 + 0.25, F.z + S - 1 + Math.sin(i * 1.7) * 3, i, { rz: 0.15 * (i % 3), collide: false });
    // the keep, with the way down
    b.box(10, 6, 8, 'stone', F.x, h0 + 2.5, F.z - 5, 0, { tile: 4 });
    b.roof(10.8, 8.8, 2.4, 'roof', F.x, h0 + 5.5, F.z - 5, 0);
    b.box(2.0, 2.7, 0.2, 'dark', F.x, h0 + 1.35, F.z - 0.95, 0, { collide: false });
    b.box(1.9, 2.6, 0.12, 'timber', F.x + 0.5, h0 + 1.3, F.z - 0.7, 0.9, { collide: false });
    // crimson banners of the Dawn hang where the Legion's eagles once did
    for (const s of [-1, 1]) b.box(1.1, 2.8, 0.05, 'clothred', F.x + s * 2.6, h0 + 3.6, F.z - 0.88, 0, { collide: false });
    b.light(0xff5020, 14, 12, F.x, h0 + 2.6, F.z + 0.5, { flicker: true });
    b.emitter('flame', F.x - 2.6, h0 + 0.88, F.z + 1.2, 10, { color: 0xff5020, size: 0.6 });
    b.emitter('flame', F.x + 2.6, h0 + 0.88, F.z + 1.2, 10, { color: 0xff5020, size: 0.6 });
    for (const s of [-1, 1]) b.cyl(0.35, 0.25, 0.9, 'iron', F.x + s * 2.6, h0 + 0.45, F.z + 1.2, { seg: 8 });
    b.interact({ kind: 'door', cell: 'fort_sutch', name: 'Fort Sutch', pos: new THREE.Vector3(F.x, h0 + 1.2, F.z - 0.2), radius: 1.5, verb: 'Enter' });
    if (hasProp('wooden_crate_02')) {
      placeProp(b, 'wooden_crate_02', F.x + 7, h0, F.z + 6, { rot: 0.4 });
      placeProp(b, 'wine_barrel_01', F.x + 8.2, h0, F.z + 7.4, {});
      placeProp(b, 'kite_shield', F.x - 8, h0, F.z + 9, { rot: 2.5, collide: false });
    }
  }
}

/** "The Lantern in the Wood": the burned-out Corwyn cottage in its clearing, and the Gloamwood Barrow. */
export function buildCorwynSites(b, terrain, game) {
  const H = (x, z) => terrain.heightAt(x, z);
  const state = {};
  const r = rng(349);
  const rock = (x, y, z, s, rot = 0) => {
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), M('rock'));
    m.position.set(x, y, z);
    m.rotation.set(rot, rot * 1.7, rot * 0.6);
    m.scale.y = 0.7;
    m.castShadow = true;
    b.add(m);
    return m;
  };

  // ===================================================== Corwyn's Clearing
  {
    const C = LOCATIONS.corwyn_clearing;
    const h0 = H(C.x, C.z);
    // ---- the cottage: four broken stone walls, roofless, its chimney still standing
    const hx = C.x + 5, hz = C.z - 4, W = 6.4, D = 5;
    const wall = (x, z, w, d, hh) => {
      b.box(w, hh, d, 'stone', x, h0 + hh / 2 - 0.2, z, 0);
      b.box(w + 0.02, 0.3, d + 0.02, 'burnt', x, h0 + hh - 0.25, z, 0, { collide: false, cast: false });
    };
    wall(hx, hz - D / 2, W, 0.5, 2.6); // back
    wall(hx - W / 2, hz - 0.6, 0.5, D - 1.2, 1.7); // west, broken low
    wall(hx + W / 2, hz, 0.5, D, 2.2); // east
    wall(hx - 1.9, hz + D / 2, 2.6, 0.5, 1.4); // front, either side of the door gap
    wall(hx + 2.3, hz + D / 2, 1.8, 0.5, 0.9);
    // the chimney and hearth
    b.box(1.4, 5.2, 1.0, 'stone', hx + 1.6, h0 + 2.4, hz - D / 2 - 0.1, 0);
    b.box(1.2, 0.9, 0.8, 'darkstone', hx + 1.6, h0 + 0.45, hz - D / 2 + 0.55, 0);
    b.box(1.0, 0.6, 0.1, 'dark', hx + 1.6, h0 + 0.4, hz - D / 2 + 0.96, 0, { collide: false });
    // fallen roof beams, charred
    for (const [dx, dz, rot, rx, len] of [[-1, -0.5, 0.3, 0.35, 5.5], [0.8, 0.6, -0.2, -0.3, 4.6], [-2.2, 1.2, 1.3, 0.2, 3.8]]) {
      b.box(0.25, 0.25, len, 'burnt', hx + dx, h0 + 0.9, hz + dz, rot, { rx, collide: false });
    }
    // ash on the floor
    const ash = new THREE.Mesh(new THREE.CircleGeometry(3, 18), new THREE.MeshStandardMaterial({ color: 0x1e1a18, roughness: 1 }));
    ash.rotation.x = -Math.PI / 2;
    ash.scale.set(1, 0.75, 1);
    ash.position.set(hx, h0 + 0.03, hz);
    b.add(ash);
    // the little cot in the corner, burned to its frame
    const cx = hx - 2.2, cz = hz - 1.4;
    b.box(0.8, 0.3, 1.5, 'burnt', cx, h0 + 0.15, cz, 0.1, { collide: false });
    for (const s of [-1, 1]) b.box(0.08, 0.6, 0.08, 'burnt', cx + s * 0.36, h0 + 0.3, cz - 0.7, 0, { collide: false });
    b.interact({ kind: 'sign', name: 'A Burned Cot', text: 'A child\'s cot, burned down to its frame. The blankets are gone; the straw has turned to a black crust.\n\nThere is nothing in it. There are no small bones here, or anywhere in the cottage. Whoever slept in this bed was not in it when the fire came.', pos: new THREE.Vector3(cx, h0 + 0.5, cz), radius: 1.2, verb: 'Examine' });
    if (!game.taken.tams_slate_pickup) game.placeItem(b, 'tams_slate', cx + 0.2, h0 + 0.05, cz + 0.5, 'tams_slate_pickup', { rot: 0.8 });
    if (!game.taken.maela_book_pickup) game.placeItem(b, 'maela_household_book', hx + 1.25, h0 + 0.92, hz - D / 2 + 0.5, 'maela_book_pickup', { rot: 0.2 });
    // the cairns the woodcutters raised, with their weathered markers
    const cairn = (x, z, name, text) => {
      const g = H(x, z);
      for (let i = 0; i < 7; i++) rock(x + (r() - 0.5) * 1.2, g + 0.15 + (i > 4 ? 0.35 : 0), z + (r() - 0.5) * 1.6, 0.35 + r() * 0.2, r() * 3);
      b.col.addBox(x, z, 0.7, 0.9, 0, g - 0.5, g + 0.6, { walkable: true });
      b.cyl(0.06, 0.07, 1.4, 'timber', x, g + 0.7, z - 1.1, { seg: 5, collide: false });
      b.box(0.7, 0.28, 0.05, 'timber', x, g + 1.1, z - 1.06, 0, { collide: false });
      b.interact({ kind: 'sign', name, text, pos: new THREE.Vector3(x, g + 0.8, z - 0.9), radius: 1.3, verb: 'Read' });
    };
    cairn(C.x - 6.5, C.z + 3.5, 'A Cairn', 'A heap of stones, green with moss. The wooden marker has been re-carved more than once, by different hands:\n\nOSRIC CORWYN\nCHARCOAL-BURNER\n3E 349\n\nSomeone has left a sprig of dried heather on the stones. Not recently; but not eighty years ago, either.');
    cairn(C.x - 3.8, C.z + 5.6, 'A Cairn', 'A smaller heap of stones. The marker reads:\n\nMAELA CORWYN\nHIS WIFE\nAND THEIR BOY TAM\nWHOM THE WOOD KEPT\n3E 349');
    // ---- two old charcoal kilns: domes of turf and stone, long cold
    const kilnMat = M('rock@9a8c78');
    for (const [kx, kz] of [[C.x - 8, C.z - 7], [C.x - 2.5, C.z - 11]]) {
      const g = H(kx, kz);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(2.1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), kilnMat);
      dome.scale.y = 0.85;
      dome.position.set(kx, g - 0.1, kz);
      dome.castShadow = true; dome.receiveShadow = true;
      b.add(dome);
      b.box(0.8, 0.7, 0.3, 'dark', kx + 1.9, g + 0.3, kz, Math.PI / 2, { collide: false });
      b.col.addCircle(kx, kz, 2.0, g - 1, g + 1.8, { walkable: false });
      if (hasProp('dry_branches_medium_01')) placeProp(b, 'dry_branches_medium_01', kx + 2.6, g, kz + 1.4, { rot: r() * 6, collide: false, scale: 0.8 });
    }
    // charcoal sacks and a split woodpile by the kilns
    for (let i = 0; i < 4; i++) b.box(0.55, 0.7, 0.4, 'cloth@3a3632', C.x - 5.5 + i * 0.6, h0 + 0.35, C.z - 9.4 + (i % 2) * 0.2, i * 0.4, { collide: i === 0 });
    for (let row = 0; row < 3; row++) for (let i = 0; i < 4 - row; i++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.6, 7), M('timber'));
      log.rotation.z = Math.PI / 2;
      log.position.set(C.x + 9, h0 + 0.16 + row * 0.28, C.z + 1.2 + (i - (3 - row) / 2) * 0.34 + row * 0.17);
      log.castShadow = true;
      b.add(log);
    }
    b.col.addBox(C.x + 9, C.z + 1.6, 0.8, 0.8, 0, h0, h0 + 0.9);
    if (hasProp('tree_stump_02')) placeProp(b, 'tree_stump_02', C.x + 7.4, h0 - 0.05, C.z + 3.6, { scale: 0.6 });
    if (hasProp('hatchet')) placeProp(b, 'hatchet', C.x + 7.4, h0 + 0.42, C.z + 3.6, { rot: 0.8, collide: false });
    if (hasProp('wooden_bucket_01')) placeProp(b, 'wooden_bucket_01', hx + 3.6, h0, hz + 3.2, { rot: 1.2 });
    // trees that burned and never fell
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + r() * 0.4, d = 11 + r() * 4;
      const tx = C.x + Math.cos(a) * d, tz = C.z + Math.sin(a) * d, g = H(tx, tz);
      const hh = 5 + r() * 4;
      b.cyl(0.18, 0.34, hh, 'burnt', tx, g + hh / 2 - 0.2, tz, { seg: 6 });
      for (let k = 0; k < 3; k++) {
        // stubs of branches, snapped short, sticking out at odd angles
        const len = 0.6 + r() * 1.3, ang = r() * Math.PI * 2, tilt = 0.5 + r() * 0.7;
        const br = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.09, len, 5).translate(0, len / 2, 0), M('burnt'));
        br.position.set(tx, g + hh * (0.35 + r() * 0.55), tz);
        br.rotation.set(Math.cos(ang) * tilt, 0, Math.sin(ang) * tilt);
        br.castShadow = true;
        b.add(br);
      }
    }
    // Bram's crate, where he dropped it running for the road
    if (!game.taken.delivery_crate_pickup) game.placeItem(b, 'delivery_crate', C.x + 8.5, h0, C.z + 6.5, 'delivery_crate_pickup', { rot: 0.5, radius: 0.8 });
    // after the reunion her lantern lies in the grass where she stood, until you take it
    if (game.flags.maelaAtRest && !game.taken.maela_lantern_rest) game.placeItem(b, 'maela_lantern', C.x + 2, h0, C.z + 1, 'maela_lantern_rest');
    // at night, embers that are not there drift through the clearing
    state.embers = b.emitter('ember', C.x, h0 + 0.3, C.z, 2.5, { night: true, spread: 9 });
    b.emitter('firefly', C.x, h0 + 0.6, C.z, 1.2, { night: true, spread: 12 });
    state.clearing = { x: C.x, z: C.z, h0 };
  }

  // ===================================================== the Gloamwood Barrow
  {
    const B = LOCATIONS.gloamwood_barrow;
    const h0 = H(B.x, B.z);
    const toC = Math.atan2(LOCATIONS.corwyn_clearing.x - B.x, LOCATIONS.corwyn_clearing.z - B.z);
    const fx = Math.sin(toC), fz = Math.cos(toC);
    // a long grassy mound with stones breaking through the turf
    const grass = TG.grassTex();
    const turf = new THREE.MeshStandardMaterial({ map: grass.map, normalMap: grass.normalMap, color: 0x8a9670, roughness: 1 });
    const mound = new THREE.Mesh(new THREE.SphereGeometry(7.5, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2), turf);
    mound.scale.set(1, 0.42, 0.75);
    mound.rotation.y = toC;
    mound.position.set(B.x - fx * 2, h0 - 0.4, B.z - fz * 2);
    mound.receiveShadow = true; mound.castShadow = true;
    b.add(mound);
    b.col.addCircle(B.x - fx * 2, B.z - fz * 2, 6.2, h0 - 1, h0 + 3, { walkable: false });
    for (let i = 0; i < 6; i++) {
      const a = r() * Math.PI * 2, d = 2 + r() * 4;
      rock(B.x - fx * 2 + Math.cos(a) * d, h0 + 1.6 - d * 0.22, B.z - fz * 2 + Math.sin(a) * d * 0.75, 0.4 + r() * 0.4, r() * 3);
    }
    // the doorway: two stones and a lintel, a black throat beneath
    const dx = B.x + fx * 4.3, dz = B.z + fz * 4.3;
    const sx = Math.cos(toC), sz = -Math.sin(toC);
    for (const s of [-1, 1]) menhir(b, dx + sx * s * 1.3, dz + sz * s * 1.3, h0, 2.8, 0.55, toC, 0);
    b.box(3.4, 0.6, 0.9, 'rock', dx, h0 + 2.6, dz, toC, { collide: false });
    b.box(2.0, 2.3, 0.1, 'dark', dx - fx * 0.3, h0 + 1.1, dz - fz * 0.3, toC, { collide: false });
    for (let i = 0; i < 5; i++) b.box(2.4 - i * 0.15, 0.18, 0.5, 'rock', dx + fx * (0.5 + i * 0.45), h0 + 0.05 - i * 0.04, dz + fz * (0.5 + i * 0.45), toC, { collide: false });
    // the Lamplighter's green lantern on a post by the door
    const px = dx + sx * 2.2 + fx * 0.6, pz = dz + sz * 2.2 + fz * 0.6;
    b.cyl(0.06, 0.08, 2.2, 'iron', px, h0 + 1.1, pz, { seg: 6 });
    b.box(0.5, 0.06, 0.06, 'iron', px - sx * 0.2, h0 + 2.2, pz - sz * 0.2, toC + Math.PI / 2, { collide: false });
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 2.2, 1.1) }));
    glow.position.set(px - sx * 0.38, h0 + 1.92, pz - sz * 0.38);
    glow.userData.dynamic = true;
    b.add(glow);
    const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.32, 6, 1, true), new THREE.MeshStandardMaterial({ color: 0x2a2a2c, metalness: 0.8, roughness: 0.5, wireframe: true }));
    cage.position.copy(glow.position);
    b.add(cage);
    state.greenLamp = { mesh: glow, light: b.light(0x58ff98, 9, 10, glow.position.x, glow.position.y, glow.position.z, { flicker: true }) };
    if (hasProp('root_cluster_01')) placeProp(b, 'root_cluster_01', dx - sx * 3, h0, dz - sz * 3, { rot: toC, collide: false, scale: 1.2 });
    b.interact({ kind: 'door', cell: 'gloam_barrow', name: 'Gloamwood Barrow', pos: new THREE.Vector3(dx + fx * 0.4, h0 + 1.2, dz + fz * 0.4), radius: 1.5, verb: 'Enter' });
    b.interact({ kind: 'sign', name: 'A Green Lantern', text: 'An iron lantern on a post, burning with a flame the colour of pond-weed. It gives no warmth at all. Inside the glass, if you look too long, something seems to press its face against the pane.', pos: new THREE.Vector3(px, h0 + 1.4, pz), radius: 1.1, verb: 'Examine', requireNoFlag: 'lamplighterDead' });
  }
  return state;
}

/** "A Crown of Starflowers": Hob Furrowfield's painted wagon, and the starflower meadow round it. */
export function buildHobsWagon(b, terrain, game) {
  const H = (x, z) => terrain.heightAt(x, z);
  const W = LOCATIONS.hobs_wagon;
  const h0 = H(W.x, W.z);
  const r = rng(907);
  const rot = 0.5;
  const P = (lx, lz) => [W.x + lx * Math.cos(rot) + lz * Math.sin(rot), W.z - lx * Math.sin(rot) + lz * Math.cos(rot)];
  // the wagon: a painted body on four wheels, a hooped canvas roof, shafts resting on the grass
  const [wx, wz] = P(0, 0);
  b.box(1.8, 0.9, 3.2, 'wood@3a6a8a', wx, h0 + 1.05, wz, rot);
  b.box(1.9, 0.12, 3.3, 'wood@d8a838', wx, h0 + 1.55, wz, rot, { collide: false });
  const hood = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 3.1, 14, 1, true, 0, Math.PI), M('cloth@f0e6cc'));
  const hoodG = new THREE.Group();
  hoodG.position.set(wx, h0 + 1.55, wz);
  hoodG.rotation.y = rot;
  // a half-cylinder lying along the wagon, arched over the top
  hood.rotation.set(Math.PI / 2, 0, Math.PI / 2, 'ZYX');
  hoodG.add(hood);
  hood.castShadow = true;
  b.add(hoodG);
  for (const [lx, lz] of [[-1.0, 1.1], [1.0, 1.1], [-1.0, -1.1], [1.0, -1.1]]) {
    const [cx, cz] = P(lx, lz);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.12, 14), M('wood@8a4a2a'));
    wheel.rotation.set(0, rot, Math.PI / 2);
    wheel.position.set(cx, h0 + 0.55, cz);
    wheel.castShadow = true;
    b.add(wheel);
  }
  for (const s of [-1, 1]) { const [sx, sz] = P(s * 0.5, 2.6); b.box(0.08, 0.08, 2.2, 'timber', sx, h0 + 0.3, sz, rot, { collide: false, rx: 0.2 }); }
  b.interact({ kind: 'sign', name: "Hob's Wagon", text: 'A tinker\'s wagon painted sky-blue and buttercup-yellow, its sides hung with pots, ladles and a great many little bells. Along the side, in careful hand-painted letters:\n\nH. FURROWFIELD — POTS MENDED, KNIVES GROUND\nDOGS ADMIRED FREE OF CHARGE', pos: new THREE.Vector3(...[P(1.0, 0)].flatMap(([x, z]) => [x, h0 + 1.2, z])), radius: 1.6, verb: 'Read' });
  // a little cook-fire and a blanket for the dogs
  const [fx, fz] = P(-3.2, 1.2);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.17, 0), M('rock')); m.position.set(fx + Math.cos(a) * 0.5, h0 + 0.07, fz + Math.sin(a) * 0.5); b.add(m); }
  b.emitter('flame', fx, h0 + 0.1, fz, 14, { color: 0xff7020, size: 0.5 });
  b.light(0xff8a3a, 16, 13, fx, h0 + 1, fz, { flicker: true });
  const [kx, kz] = P(-2.2, -1.4);
  b.box(1.6, 0.04, 1.2, 'cloth@c84a4a', kx, h0 + 0.03, kz, rot + 0.3, { collide: false, cast: false });
  // the starflower meadow
  const petal = new THREE.MeshStandardMaterial({ color: 0xbcd4ff, emissive: 0x6a8ad8, emissiveIntensity: 0.55, roughness: 0.6, side: THREE.DoubleSide });
  const heart = new THREE.MeshStandardMaterial({ color: 0xf0c040, emissive: 0xa07010, emissiveIntensity: 0.4, roughness: 0.6 });
  const stem = new THREE.MeshStandardMaterial({ color: 0x4a7a3a, roughness: 0.9 });
  const flower = () => {
    const g = new THREE.Group();
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.32, 4), stem);
    st.position.y = 0.16;
    g.add(st);
    for (let k = 0; k < 5; k++) {
      const p = new THREE.Mesh(new THREE.CircleGeometry(0.05, 8), petal);
      const a = (k / 5) * Math.PI * 2;
      p.scale.set(0.7, 1.2, 1);
      p.position.set(Math.cos(a) * 0.045, 0.33, Math.sin(a) * 0.045);
      p.rotation.set(-Math.PI / 2 + 0.35 * Math.sin(a), 0, -a + Math.PI / 2);
      p.lookAt(p.position.x * 4, 0.36, p.position.z * 4);
      p.rotateX(-1.1);
      g.add(p);
    }
    const c = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 5), heart);
    c.position.y = 0.34;
    g.add(c);
    g.scale.setScalar(1.6);
    return g;
  };
  let n = 0;
  for (let i = 0; i < 40 && n < 16; i++) {
    const a = r() * Math.PI * 2, d = 7 + r() * 30;
    const x = W.x + Math.cos(a) * d, z = W.z + Math.sin(a) * d;
    const h = H(x, z);
    if (terrain.normalAt(x, z).y < 0.9) continue;
    const g = flower();
    g.position.set(x, h - 0.02, z);
    g.rotation.y = r() * 6;
    b.add(g);
    b.interact({ kind: 'harvest', id: `starflower_${n}`, name: 'Starflower', item: 'starflower', respawnDays: 2, pos: new THREE.Vector3(x, h + 0.4, z), radius: 1.0, verb: 'Pick', mesh: g });
    n++;
  }
  b.emitter('firefly', W.x, h0 + 0.6, W.z, 1.2, { night: true, spread: 26 });
  return { wagon: { x: wx, z: wz, h0 }, bed: { x: kx, z: kz } };
}
