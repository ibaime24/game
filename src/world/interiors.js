// Interior cells built from ASCII maps.
//  # wall   . floor   (space) void   D exit door   P arrival
//  T table  c chair   B bed (owned)  Q bed (free)  K counter  S shelf  F fireplace  r rug
//  b barrel x crate   C chest        u urn         p pillar   w welkynd light   l brazier
//  e enemy  E boss    H heirloom     s sigil stone + locked gate   1-9 NPC slots
import * as THREE from 'three';
import { M, boxGeo } from './builder.js';
import { chest } from './structures.js';
import { hasProp, makeProp, placeProp, propVariants } from './props.js';
import { itemMesh } from './itemMesh.js';
import { mat } from '../actors/models.js';
import { buildHareMesh } from './hare.js';
import { ART, WALL_PAINTINGS, paintingUrl } from '../data/art.js';

const artLoader = new THREE.TextureLoader();
const frameMat = new THREE.MeshStandardMaterial({ color: 0x8a6a2a, roughness: 0.45, metalness: 0.55 });

/** A framed canvas hung on a wall. rot: the direction the painting faces. */
function hangPainting(b, id, x, y, z, rot, maxH = 0.95) {
  const a = ART[id];
  const h = maxH, w = Math.min(1.7, h * a.aspect);
  const hh = w / a.aspect;
  const tex = artLoader.load(paintingUrl(id));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const g = new THREE.Group();
  const canvas = new THREE.Mesh(new THREE.PlaneGeometry(w, hh), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75 }));
  canvas.position.z = 0.035;
  g.add(canvas);
  const f = 0.07;
  for (const [fw, fh, fx, fy] of [[w + f * 2, f, 0, hh / 2 + f / 2], [w + f * 2, f, 0, -hh / 2 - f / 2], [f, hh, -w / 2 - f / 2, 0], [f, hh, w / 2 + f / 2, 0]]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, 0.07), frameMat);
    bar.position.set(fx, fy, 0.035);
    bar.castShadow = true;
    g.add(bar);
  }
  g.position.set(x, y, z);
  g.rotation.y = rot;
  b.add(g);
}

export const INTERIORS = {
  inn: {
    name: 'The Grey Mare', tile: 1.6, wallH: 4.2, wall: 'stone', floor: 'floor', ceil: 'timber', music: 'explore', lightLevel: 0.7,
    ambient: [0xffd8a0, 0x302010, 0.5], fog: [0x100a06, 10, 40],
    owner: 'Emfrid', exitTo: 'world',
    map: [
      '#############',
      '#b.K1....F..#',
      '#x.KKK...365#',
      '#.....T..T4.#',
      '#B....c..c..#',
      '#B..T.....T.#',
      '#...c..2..c.#',
      '#r.........r#',
      '######D######',
    ],
    npcs: { 1: 'emfrid', 2: 'inn_patron', 3: 'ysolde', 4: 'corvin_home', 5: 'tillmon_inn', 6: 'sheogorath' },
    tableItems: ['bread', 'cheese', 'apple', 'silver_cup', 'silver_plate', 'potion_fatigue', 'mead', 'wine_tamika', 'sweetroll'],
    tableStyle: 'round', chairStyle: 'stool',
    tableClutter: ['wooden_plate', 'wooden_bowl', 'clay_jug', 'candlestick', 'brass_goblet', 'mead', 'onion', 'pear'],
    counterGoods: ['mead', 'wine_tamika', 'wine_surilie', 'pewter_pitcher', 'oil_lamp', 'brass_goblet', 'sweetroll'],
    wallDecor: ['wine_barrel_01', 'wine_barrel_01', 'wooden_bucket_02', 'wicker_basket_02', 'GothicCommode_01', 'painted_wooden_bench', 'wooden_broom'],
    chandeliers: [[-2.4, 0, 'lantern_chandelier_01'], [4.2, 0, 'lantern_chandelier_01']],
    wallHangings: [[11, 5, 'e', 2.3, 'kite_shield', 0.9], [1, 3, 'w', 2.3, 'antique_estoc', 1]],
  },
  shop: {
    name: 'Northern Goods and Trade', tile: 1.6, wallH: 4, wall: 'plaster', floor: 'floor', ceil: 'timber', music: 'explore', lightLevel: 0.7,
    ambient: [0xffe0b0, 0x302010, 0.55], fog: [0x100a06, 10, 40],
    owner: 'Seed-Neeus', exitTo: 'world',
    map: [
      '###########',
      '#SSSS.SSSS#',
      '#....1....#',
      '#.KKKKKKK.#',
      '#.........#',
      '#xb.....bx#',
      '#.C...2.r.#',
      '#####D#####',
    ],
    npcs: { 1: 'seed_neeus', 2: 'bram' },
    chestLock: 3, chestLoot: 'chest_common',
    tableItems: ['potion_health_light', 'lockpick', 'silver_cup', 'apple'],
    shelfProp: 'painted_wooden_shelves',
    counterGoods: ['ships_compass', 'magnifying_lens', 'lantern', 'oil_lamp', 'painted_vase', 'brass_pot', 'candelabra', 'hammer'],
    wallDecor: ['wooden_crate_01', 'wine_barrel_01', 'wicker_basket_01', 'wooden_bucket_01', 'wooden_ladder', 'GothicCommode_01', 'painted_wooden_shelves'],
    topItems: ['lantern', 'saw', 'hammer', 'ceramic_vase', 'clay_jug', 'brass_pot'],
    chandeliers: [[0, 0, 'Lantern_01']],
    wallHangings: [[1, 4, 'w', 2.3, 'kite_shield', 0.9], [1, 3, 'w', 2.1, 'ornate_war_hammer', 1.3], [9, 4, 'e', 2.1, 'ornate_medieval_mace', 1.3], [9, 3, 'e', 2.0, 'antique_estoc', 1]],
  },
  priory: {
    name: 'Weynon House', tile: 1.6, wallH: 4, wall: 'stone', floor: 'floor', ceil: 'timber', music: 'explore', lightLevel: 0.6,
    ambient: [0xffd8a8, 0x302010, 0.5], fog: [0x100a06, 10, 40],
    owner: 'Jauffre', exitTo: 'world',
    map: [
      '###########',
      '#B..S.SS.F#',
      '#.........#',
      '#...T.1.2.#',
      '#...c.c...#',
      '#r........#',
      '#C.......Q#',
      '#####D#####',
    ],
    npcs: { 1: 'jauffre', 2: 'martin_priory' },
    chestLoot: 'chest_common',
    tableItems: ['book_gates', 'bread', 'potion_health_light'],
    tableClutter: ['wooden_plate', 'wooden_bowl', 'candlestick', 'clay_jug'],
    wallDecor: ['GothicCabinet_01', 'GothicCommode_01', 'spinning_wheel_01', 'wooden_bucket_01', 'wooden_broom', 'painted_wooden_bench'],
    topItems: ['candlestick', 'marble_bust', 'oil_lamp', 'ceramic_vase'],
    chandeliers: [[0, -0.8, 'Chandelier_01']],
  },
  vilverin: {
    name: 'Vilverin', tile: 3, wallH: 5.5, wall: 'ayleid', floor: 'ayleid', ceil: 'ayleid', music: 'dungeon', lightLevel: 0.35, dungeon: true,
    ambient: [0x6a88b8, 0x181c28, 0.5], fog: [0x02040a, 8, 46],
    exitTo: 'world', spawnList: 'ruin', chestItems: { 0: ['vilverin_key'] },
    map: [
      '###D########################',
      '#w...w############w.....w###',
      '#..P..##########.#....p..###',
      '#.....##########....e....###',
      '#w...w##########.#u....eC###',
      '###.############.#.p.....###',
      '###.############.#w.....w###',
      '###.############.###########',
      '#w..........w###e###########',
      '#.....e......###.####w....w#',
      '#...p....p....x..####......#',
      '#..e......e..###.####...E.C#',
      '#w..........w###....s....H.#',
      '################.####......#',
      '##########w...C..####w....w#',
      '##########..e....###########',
      '##########.u...w############',
      '############################',
    ],
    fixes: true,
  },
  quill_spire: {
    name: 'Quillwhistle\'s Spire', tile: 1.6, wallH: 5.5, wall: 'stone@e4d8f0', floor: 'floor', ceil: 'timber@6a4a7a', music: 'explore', lightLevel: 0.75,
    ambient: [0xe8c8ff, 0x302040, 0.6], fog: [0x100818, 10, 40],
    owner: 'Aldous Quillwhistle', exitTo: 'world',
    // q orrery, j bubbling cauldron
    map: [
      '###########',
      '###.SSS.###',
      '##.......##',
      '#w...q...w#',
      '#....T1..j#',
      '#.c.......#',
      '##...r...##',
      '###..P..###',
      '#####D#####',
    ],
    npcs: { 1: 'aldous' },
    tableItems: ['potion_magicka', 'book_ayleids', 'potion_magicka'],
    tableClutter: ['candlestick', 'brass_goblet', 'oil_lamp'],
    wallDecor: ['GothicCabinet_01', 'wooden_bookshelf_worn', 'GothicCommode_01', 'spinning_wheel_01'],
    topItems: ['candlestick', 'ships_compass', 'horse_figurine', 'ceramic_vase'],
    chandeliers: [[0, -1, 'lantern_chandelier_01']],
  },
  kvatch_chapel: {
    name: 'Chapel of Akatosh, Kvatch', tile: 2, wallH: 8, wall: 'stone', floor: 'stone', ceil: 'timber', music: 'dungeon', lightLevel: 0.5,
    ambient: [0xffb080, 0x301810, 0.45], fog: [0x140806, 8, 34],
    exitTo: 'world', spawnList: 'daedra',
    // h pew, L altar of Akatosh
    map: [
      '###########',
      '#l..L1...l#',
      '#..2...3..#',
      '#.h.h.h.h.#',
      '#.........#',
      '#.h.h.h.h.#',
      '#e.......e#',
      '#.h.h.h.h.#',
      '#...e.e...#',
      '#....P....#',
      '#####D#####',
    ],
    npcs: { 1: 'martin', 2: 'jakben', 3: 'tierra' },
  },
  fort_sutch: {
    name: 'Fort Sutch', tile: 3, wallH: 7, wall: 'stone', floor: 'stone', ceil: 'stone', music: 'dungeon', lightLevel: 0.4, dungeon: true,
    ambient: [0xc07050, 0x200c08, 0.5], fog: [0x0c0402, 8, 46],
    exitTo: 'world', boss: 'ruma_camoran', chestLoot: 'chest_common',
    // k zealot, a acolyte, M statue of Mehrunes Dagon, O the altar of the Mysterium Xarxes
    map: [
      '#D######################',
      '#P..l###################',
      '#....k##################',
      '#l...###l...Q.Q...l#####',
      '###.####.......k...#####',
      '###.........b..x...#####',
      '########....k......#####',
      '########l...C..Q.Q.#####',
      '##############.#########',
      '#######l.a.......a.l####',
      '#######...a.....a...####',
      '#######..a...M...a..####',
      '#######......E.O.....###',
      '#######l...........l####',
      '########################',
    ],
  },
  nenalatha: {
    name: 'Nenalatha', tile: 3, wallH: 6.5, wall: 'ayleid', floor: 'ayleid', ceil: 'ayleid', music: 'dungeon', lightLevel: 0.4, dungeon: true,
    ambient: [0x7aa0d8, 0x182030, 0.55], fog: [0x02060c, 8, 50],
    exitTo: 'world', spawnList: 'ruin', boss: 'archivist', chestLoot: 'chest_ayleid',
    // X sun, Y moon, Z star pedestals; G sealed gate; V Corvin's crystal; A the Atlas of Hours
    map: [
      '###D####################',
      '#w...w##################',
      '#..P..##################',
      '#.e...##w....e....w#####',
      '#w...w##...u...C...#####',
      '###.####.p.......p.#####',
      '###.....e.....e....#####',
      '########w....u....w#####',
      '############.###########',
      '########w...........w###',
      '########..X...Y...Z..###',
      '########w.....e.....w###',
      '##############G#########',
      '#########w.........w####',
      '#########...p...p...####',
      '#########V....E....A####',
      '#########w....u....w####',
      '########################',
    ],
  },
  gloam_barrow: {
    name: 'Gloamwood Barrow', tile: 3, wallH: 4.6, wall: 'stone@9aa294', floor: 'stone', ceil: 'stone@6a7068', music: 'dungeon', lightLevel: 0.3, dungeon: true,
    ambient: [0x8aa898, 0x1a2219, 0.95], fog: [0x050b07, 9, 44],
    exitTo: 'world', spawnList: 'ashen', boss: 'ilvaine', chestLoot: 'chest_common',
    // g a soul lantern (a trapped soul burning green), z an ash heap, R the Lamplighter's ritual circle
    map: [
      '##########D#############',
      '#########.P.############',
      '#########...############',
      '#####g...........g######',
      '#####l.z..e...z..l######',
      '#####g...........g######',
      '#########..e..##########',
      '##########...###########',
      '###g......e......g..C###',
      '###..z.#######.z....l###',
      '###le..#######..e..z.###',
      '###g...#######....g..###',
      '#####.##########.#######',
      '#####.##########.#######',
      '###g.....z..........g###',
      '###...e.....R....e...###',
      '###z...l...E....l...z###',
      '###g.......C........g###',
      '########################',
    ],
  },
  snow_hare: {
    name: 'The Snow Hare, Wintersmeet', tile: 1.6, wallH: 4, wall: 'plaster@efdcc0', floor: 'floor', ceil: 'timber', music: 'explore', lightLevel: 0.75,
    ambient: [0xffd2a0, 0x302014, 0.7], fog: [0x120a06, 10, 40],
    owner: 'Sigrun Warmhands', exitTo: 'world', rentable: true,
    map: [
      '#############',
      '#B..F...KK1.#',
      '#B.......K..#',
      '#.T.c...r...#',
      '#.c.....2.T.#',
      '#.....T...c.#',
      '#x...c.c..3.#',
      '#b..r.....Sx#',
      '######D######',
    ],
    npcs: { 1: 'sigrun', 2: 'erlend', 3: 'cassius_home' },
    tableItems: ['mulled_wine', 'sweetroll', 'bread', 'cheese', 'mulled_wine', 'venison'],
    tableStyle: 'round', chairStyle: 'stool',
    tableClutter: ['wooden_plate', 'wooden_bowl', 'clay_jug', 'candlestick', 'brass_goblet', 'mulled_wine'],
    counterGoods: ['mulled_wine', 'mead', 'pewter_pitcher', 'oil_lamp', 'sweetroll'],
    wallDecor: ['wine_barrel_01', 'wooden_bucket_02', 'wicker_basket_02', 'GothicCommode_01', 'painted_wooden_bench', 'spinning_wheel_01'],
    chandeliers: [[-2.4, 0, 'lantern_chandelier_01'], [3.2, 0.8, 'lantern_chandelier_01']],
    wallHangings: [[1, 4, 'w', 2.3, 'kite_shield', 0.9]],
  },
  rime_spire: {
    name: 'The Rime Spire', tile: 3, wallH: 6.5, wall: 'whitestone@c8d8ea', floor: 'stone@b8c8d8', ceil: 'whitestone@a8b8c8', music: 'dungeon', lightLevel: 0.4, dungeon: true,
    ambient: [0xa8c8f0, 0x182030, 0.75], fog: [0x0a1018, 8, 46],
    exitTo: 'world', spawnList: 'rime',
    // v a cold brazier (light it to melt the next ice wall), i a wall of ice, U the hare's frost cage
    map: [
      '#########D##########',
      '########.P.#########',
      '####v...........####',
      '####...e....e...####',
      '####w..........w####',
      '#########i##########',
      '######.......#######',
      '#####v..e...e.######',
      '#####w.......w######',
      '#########i##########',
      '#####.........######',
      '####w..e...e..w#####',
      '####.....1.....#####',
      '####....U......#####',
      '####w.........w#####',
      '####################',
    ],
    npcs: { 1: 'cassius' },
  },
  sigil: {
    name: 'Sigil Keep', tile: 3, wallH: 13, wall: 'obrock', floor: 'obrock', ceil: 'obrock', music: 'oblivion', lightLevel: 0.5, dungeon: true,
    ambient: [0xff6040, 0x200404, 0.55], fog: [0x200402, 8, 45],
    exitTo: 'oblivion', spawnList: 'daedra',
    map: [
      '###########',
      '#l...s...l#',
      '#.........#',
      '#..p...p..#',
      '#....E....#',
      '#..p...p..#',
      '#.e.....e.#',
      '#l...P...l#',
      '#####D#####',
    ],
  },
};

/** Normalise map rows to equal width; returns grid of chars. */
export function parseMap(rows) {
  const w = Math.max(...rows.map((r) => r.length));
  return rows.map((r) => r.padEnd(w, '#').split(''));
}

export function floodCheck(grid) {
  const h = grid.length, w = grid[0].length;
  let start = null;
  for (let z = 0; z < h; z++) for (let x = 0; x < w; x++) if (grid[z][x] === 'P') start = [x, z];
  if (!start) {
    for (let z = 0; z < h; z++) for (let x = 0; x < w; x++) if (grid[z][x] === 'D') start = [x, grid[z - 1]?.[x] && grid[z - 1][x] !== '#' ? z - 1 : z + 1];
  }
  if (!start) return { ok: false, reason: 'no P or D' };
  const seen = new Set([start.join()]);
  const q = [start];
  const walkable = (c) => c !== '#' && c !== ' ';
  while (q.length) {
    const [x, z] = q.pop();
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, nz = z + dz;
      if (nx < 0 || nz < 0 || nx >= w || nz >= h) continue;
      if (!walkable(grid[nz][nx]) || seen.has(nx + ',' + nz)) continue;
      seen.add(nx + ',' + nz);
      q.push([nx, nz]);
    }
  }
  const unreachable = [];
  for (let z = 0; z < h; z++) for (let x = 0; x < w; x++) {
    if (grid[z][x] !== '#' && grid[z][x] !== ' ' && !seen.has(x + ',' + z)) unreachable.push([x, z, grid[z][x]]);
  }
  return { ok: unreachable.length === 0, unreachable };
}

// ------------------------------------------------------------------ furniture
// Scanned Poly Haven furniture where loaded; simple boxes otherwise. Each returns the table-top height.
function table(b, x, z, style = 'long', rand = Math.random) {
  if (style === 'round' && hasProp('round_wooden_table_01')) {
    const g = placeProp(b, 'round_wooden_table_01', x, 0, z, { scale: 0.85, rot: rand() * 6.28, collide: false });
    b.col.addCircle(x, z, 0.6, 0, g.userData.propSize.y, { walkable: true });
    return g.userData.propSize.y;
  }
  if (hasProp('painted_wooden_table')) {
    const g = makeProp('painted_wooden_table');
    g.scale.set(0.7, 0.9, 0.78);
    g.position.set(x, 0, z);
    b.add(g);
    b.col.addBox(x, z, 0.85, 0.45, 0, 0, 0.86, { walkable: true });
    return 0.96 * 0.9;
  }
  b.box(1.6, 0.08, 1.0, 'wood', x, 0.82, z, 0, { walkable: true });
  for (const [dx, dz] of [[-0.7, -0.4], [0.7, -0.4], [-0.7, 0.4], [0.7, 0.4]]) b.box(0.08, 0.8, 0.08, 'timber', x + dx, 0.4, z + dz, 0, { collide: false });
  b.col.addBox(x, z, 0.8, 0.5, 0, 0, 0.86);
  return 0.86;
}
function chair(b, x, z, rot, style = 'chair') {
  const id = style === 'stool' ? 'wooden_stool_01' : 'painted_wooden_chair_01';
  if (hasProp(id)) {
    placeProp(b, id, x, 0, z, { rot, collide: false });
    b.col.addBox(x, z, 0.22, 0.22, rot, 0, 0.5);
    return;
  }
  b.box(0.5, 0.06, 0.5, 'wood', x, 0.48, z, rot, { collide: false });
  b.box(0.5, 0.6, 0.06, 'wood', x - Math.sin(rot) * 0.22, 0.8, z - Math.cos(rot) * 0.22, rot, { collide: false });
  for (const [dx, dz] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) b.box(0.05, 0.48, 0.05, 'timber', x + dx, 0.24, z + dz, 0, { collide: false, cast: false });
  b.col.addBox(x, z, 0.25, 0.25, rot, 0, 0.5);
}
function bed(b, x, z, rot, def) {
  if (hasProp('GothicBed_01')) {
    const g = placeProp(b, 'GothicBed_01', x, 0, z, { rot, collide: false, scale: 0.95 });
    b.col.addBox(x, z, 0.7, 1.0, rot, 0, 0.6, { walkable: true });
    b.interact({ kind: 'bed', ...def, pos: new THREE.Vector3(x, 0.8, z), radius: 1.2, verb: 'Sleep', mesh: g });
    return;
  }
  b.box(1.1, 0.4, 2.1, 'timber', x, 0.2, z, rot);
  const mattress = b.box(1.0, 0.18, 1.95, 'cloth', x, 0.49, z, rot, { collide: false });
  b.box(0.7, 0.12, 0.4, 'plaster', x - Math.sin(rot) * 0.75, 0.62, z - Math.cos(rot) * 0.75, rot, { collide: false });
  b.box(1.0, 0.04, 1.2, 'clothred', x + Math.sin(rot) * 0.3, 0.6, z + Math.cos(rot) * 0.3, rot, { collide: false });
  b.interact({ kind: 'bed', ...def, pos: new THREE.Vector3(x, 0.8, z), radius: 1.2, verb: 'Sleep', mesh: mattress });
}

/** A takeable item resting on a surface at height y. */
function placeTableItem(b, x, z, id, owner, cid, y = 0.86) {
  const m = itemMesh(id);
  m.position.set(x, y, z);
  m.rotation.y = Math.random() * Math.PI * 2;
  b.add(m);
  b.interact({ kind: 'item', id: cid, item: { id, count: 1 }, owner, pos: new THREE.Vector3(x, y + 0.1, z), radius: 0.4, verb: 'Take', mesh: m });
}

/** Purely decorative prop (no collider unless large). */
function decor(b, id, x, y, z, o = {}) {
  if (!hasProp(id)) return null;
  return placeProp(b, id, x, y, z, o);
}

/**
 * Build an interior into builder `b`. Returns metadata: arrival point, exit door, enemy slots, npc slots.
 */
export function buildInterior(b, id, rand = Math.random) {
  const def = INTERIORS[id];
  const grid = parseMap(def.map);
  const T = def.tile, H = def.wallH;
  const rows = grid.length, cols = grid[0].length;
  const ox = -(cols * T) / 2, oz = -(rows * T) / 2;
  const at = (cx, cz) => [ox + (cx + 0.5) * T, oz + (cz + 0.5) * T];
  const meta = { arrival: null, exit: null, enemies: [], boss: null, npcs: {}, bounds: [ox, oz, ox + cols * T, oz + rows * T], used: new Set() };
  meta.grid = grid; meta.at = at; meta.T = T;

  // floor & ceiling
  const floor = new THREE.Mesh(boxGeo(cols * T, 0.2, rows * T, def.dungeon ? 3 : 2), M(def.floor));
  floor.position.set(0, -0.1, 0);
  floor.receiveShadow = true;
  b.add(floor);
  const ceil = new THREE.Mesh(boxGeo(cols * T, 0.3, rows * T, 3), M(def.ceil));
  ceil.position.set(0, H + 0.15, 0);
  b.add(ceil);
  b.col.ceiling = H;
  if (!def.dungeon) {
    // ceiling beams
    for (let z = 1; z < rows - 1; z += 2) {
      const [, wz] = at(0, z);
      b.box(cols * T, 0.25, 0.25, 'timber', 0, H - 0.12, wz, 0, { collide: false, cast: false });
    }
  }

  // walls: instanced blocks for rendering, merged runs for collision
  const wallCells = [];
  for (let z = 0; z < rows; z++) for (let x = 0; x < cols; x++) if (grid[z][x] === '#' || grid[z][x] === 'D') {
    // only blocks next to open space
    let near = false;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const c = grid[z + dz]?.[x + dx];
      if (c && c !== '#' && c !== ' ' && c !== 'D') near = true;
    }
    if (near) wallCells.push([x, z]);
  }
  const wallGeo = boxGeo(T, H, T, def.dungeon ? 3 : 2);
  const walls = new THREE.InstancedMesh(wallGeo, M(def.wall), wallCells.length);
  const m4 = new THREE.Matrix4();
  wallCells.forEach(([x, z], i) => {
    const [wx, wz] = at(x, z);
    m4.makeTranslation(wx, H / 2, wz);
    walls.setMatrixAt(i, m4);
  });
  walls.castShadow = true;
  walls.receiveShadow = true;
  b.add(walls);
  for (let z = 0; z < rows; z++) {
    let start = -1;
    for (let x = 0; x <= cols; x++) {
      const solid = x < cols && (grid[z][x] === '#' || grid[z][x] === 'D');
      if (solid && start < 0) start = x;
      if (!solid && start >= 0) {
        const [x0, wz] = at(start, z);
        const [x1] = at(x - 1, z);
        b.col.addBox((x0 + x1) / 2, wz, ((x - start) * T) / 2, T / 2, 0, -1, H + 1, { walkable: false });
        start = -1;
      }
    }
  }

  // contents
  let chestN = 0, itemN = 0;
  const tableItems = [...(def.tableItems || [])];
  for (let z = 0; z < rows; z++) for (let x = 0; x < cols; x++) {
    const c = grid[z][x];
    const [wx, wz] = at(x, z);
    switch (c) {
      case 'P': meta.arrival = { x: wx, z: wz }; break;
      case 'D': {
        // the door sits in the wall; interaction point one tile inside
        const inward = grid[z - 1]?.[x] === '.' || grid[z - 1]?.[x] === 'P' ? -1 : 1;
        const door = new THREE.Mesh(new THREE.BoxGeometry(T * 0.8, Math.min(2.6, H - 0.3), 0.2), M(def.dungeon && id === 'vilverin' ? 'ayleid' : 'timber'));
        door.position.set(wx, Math.min(2.6, H - 0.3) / 2, wz + inward * (T / 2 - 0.05));
        b.add(door);
        const ip = new THREE.Vector3(wx, 1.3, wz + inward * (T / 2 + 0.4));
        meta.exit = b.interact({ kind: 'door', cell: def.exitTo, exit: true, name: def.exitTo === 'world' ? 'Cyrodiil' : 'Deadlands', pos: ip, radius: 1.3, verb: 'Exit' });
        if (!meta.arrival) meta.arrival = { x: wx, z: wz + inward * T };
        meta.doorArrival = { x: wx, z: wz + inward * T * 1.2, yaw: inward > 0 ? Math.PI : 0 };
        break;
      }
      case 'T': {
        const top = table(b, wx, wz, def.tableStyle, rand);
        if (tableItems.length && rand() < 0.85) placeTableItem(b, wx + (rand() - 0.5) * 0.7, wz + (rand() - 0.5) * 0.3, tableItems.splice(Math.floor(rand() * tableItems.length), 1)[0], def.owner, `${id}_item_${itemN++}`, top);
        // everyday clutter: plates, bowls, jugs, a candle
        const clutter = def.tableClutter || ['wooden_plate', 'wooden_bowl', 'clay_jug', 'candlestick', 'brass_goblet'];
        for (let k = 0; k < 2; k++) {
          if (rand() < 0.6) placeTableItem(b, wx + (k ? 0.35 : -0.4) + (rand() - 0.5) * 0.15, wz + (rand() - 0.5) * 0.35, clutter[Math.floor(rand() * clutter.length)], def.owner, `${id}_clutter_${itemN++}`, top);
        }
        break;
      }
      case 'c': chair(b, wx, wz, rand() * Math.PI * 2, def.chairStyle); break;
      case 'B': bed(b, wx, wz, 0, { id: `${id}_bed_${x}_${z}`, name: 'Bed', owner: def.owner, rentable: id === 'inn' || !!def.rentable }); break;
      case 'Q': bed(b, wx, wz, 0, { id: `${id}_freebed`, name: 'Bed', owner: null }); break;
      case 'K': {
        b.box(T, 1.1, T * 0.7, 'wood', wx, 0.55, wz, 0);
        b.box(T + 0.02, 0.08, T * 0.8, 'timber', wx, 1.12, wz, 0, { collide: false });
        const top = 1.16;
        if (tableItems.length && rand() < 0.4) placeTableItem(b, wx, wz, tableItems.splice(Math.floor(rand() * tableItems.length), 1)[0], def.owner, `${id}_item_${itemN++}`, top);
        const goods = def.counterGoods || ['pewter_pitcher', 'oil_lamp', 'brass_goblet', 'clay_jug', 'wicker_basket'];
        if (rand() < 0.75) placeTableItem(b, wx + (rand() - 0.5) * 0.9, wz + (rand() - 0.5) * 0.3, goods[Math.floor(rand() * goods.length)], def.owner, `${id}_goods_${itemN++}`, top);
        break;
      }
      case 'S': {
        if (def.shelfProp === 'painted_wooden_shelves' && hasProp('painted_wooden_shelves')) {
          // merchant shelving with wares on every level
          for (const off of [-0.4, 0.4]) {
            const sh = placeProp(b, 'painted_wooden_shelves', wx + off, 0, wz - T / 2 + 0.22, { scale: 1.25 });
            const top = sh.userData.propSize.y;
            const wares = ['jug_01', 'ceramic_vase_03', 'metal_jug', 'brass_pot_01', 'wooden_bowl_01', 'wicker_basket_02', 'wooden_lantern_01'];
            decor(b, wares[Math.floor(rand() * wares.length)], wx + off, top, wz - T / 2 + 0.22, { rot: rand() * 6.28, collide: false, scale: 0.9 });
          }
          break;
        }
        if (hasProp('wooden_bookshelf_worn')) {
          const sh = placeProp(b, 'wooden_bookshelf_worn', wx, 0, wz - T / 2 + 0.32, { scale: 1.05 });
          const top = sh.userData.propSize.y;
          if (rand() < 0.7) decor(b, rand() < 0.5 ? 'ceramic_vase_01' : 'antique_ceramic_vase_01', wx + (rand() - 0.5) * 0.8, top, wz - T / 2 + 0.32);
          // books on the shelves
          for (const [sy, n] of [[0.98, 1], [1.43, 1]]) {
            if (hasProp('book_encyclopedia_set_01') && rand() < 0.85) decor(b, 'book_encyclopedia_set_01', wx + (rand() - 0.5) * 0.5, sy * 1.05, wz - T / 2 + 0.36, { scale: 0.95 + n * 0.0 });
          }
          if (def.shelfItems?.length) placeTableItem(b, wx + 0.35, wz - T / 2 + 0.36, def.shelfItems.shift(), def.owner, `${id}_shelf_${itemN++}`, 0.53 * 1.05);
          break;
        }
        const shelf = b.box(T * 0.9, 2.4, 0.5, 'wood', wx, 1.2, wz - T / 2 + 0.3, 0);
        shelf.castShadow = false;
        for (let k = 0; k < 4; k++) {
          const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.25, 8), mat([0x6a8a5a, 0x8a5a3a, 0x5a5a8a, 0xc8b070][k], { rough: 0.3 }));
          jar.position.set(wx - 0.5 + k * 0.33, 1.2 + (k % 2) * 0.7, wz - T / 2 + 0.35);
          b.add(jar);
        }
        break;
      }
      case 'F':
        decor(b, 'brass_pot_01', wx + 0.75, 0, wz - T / 2 + 1.05, { rot: rand() * 6 });
        decor(b, 'dry_branches_medium_01', wx - 0.8, 0, wz - T / 2 + 1.1, { rot: rand() * 6, scale: 0.7, collide: false });
        decor(b, 'wooden_bucket_02', wx - 1.35, 0, wz - T / 2 + 0.6, { scale: 0.8 });
        b.box(T, 2.2, 0.8, 'stone', wx, 1.1, wz - T / 2 + 0.4, 0);
        b.box(T * 0.6, 0.9, 0.5, 'dark', wx, 0.45, wz - T / 2 + 0.6, 0, { collide: false });
        b.emitter('flame', wx, 0.12, wz - T / 2 + 0.75, 18, { color: 0xff7020, size: 0.55 });
        b.light(0xff8830, 22, 14, wx, 1.2, wz, { flicker: true });
        break;
      case 'r': b.box(T * 1.6, 0.02, T * 1.1, 'rug', wx, 0.01, wz, 0, { collide: false, cast: false }); break;
      case 'b': {
        const bm = hasProp('wine_barrel_01') ? placeProp(b, 'wine_barrel_01', wx, 0, wz, { scale: 1.1, rot: rand() * 6.28 }) : b.cyl(0.38, 0.34, 1.0, 'wood', wx, 0.5, wz, { seg: 10 });
        b.interact({ kind: 'container', id: `${id}_barrel_${x}_${z}`, name: 'Barrel', loot: 'barrel', owner: def.owner || null, pos: new THREE.Vector3(wx, 0.9, wz), radius: 0.7, verb: 'Open', mesh: bm });
        break;
      }
      case 'x': {
        if (hasProp('wooden_crate_02')) {
          const cm = placeProp(b, rand() < 0.5 ? 'wooden_crate_02' : 'wooden_crate_01', wx, 0, wz, { rot: rand() * 0.6 - 0.3 + (rand() < 0.5 ? Math.PI / 2 : 0), scale: 1.2 });
          if (!def.dungeon || rand() < 0.5) b.interact({ kind: 'container', id: `${id}_crate_${x}_${z}`, name: 'Crate', loot: 'crate', owner: def.dungeon ? null : def.owner || null, pos: new THREE.Vector3(wx, 0.6, wz), radius: 0.8, verb: 'Open', mesh: cm });
          if (rand() < 0.5) decor(b, 'wooden_crate_01', wx + (rand() - 0.5) * 0.2, cm.userData.propSize.y, wz + (rand() - 0.5) * 0.2, { rot: rand() * 6.28, collide: false });
        } else b.box(1, 1, 1, 'wood', wx, 0.5, wz, rand(), { tile: 1 });
        break;
      }
      case 'C': {
        const lock = def.chestItems?.[chestN] ? 0 : def.chestLock ?? (def.dungeon ? 1 + Math.floor(rand() * 3) : 0);
        chest(b, wx, 0, wz - T / 2 + 0.6, 0, { items: def.chestItems?.[chestN], id: `${id}_chest_${chestN++}`, loot: def.chestLoot || (id === 'vilverin' ? 'chest_ayleid' : 'chest_common'), lock, owner: def.dungeon ? null : def.owner });
        break;
      }
      case 'u': {
        const urn = b.cyl(0.35, 0.25, 0.9, 'ayleid', wx, 0.45, wz, { seg: 10 });
        b.interact({ kind: 'container', id: `${id}_urn_${x}_${z}`, name: 'Ayleid Urn', loot: 'chest_common', pos: new THREE.Vector3(wx, 0.9, wz), radius: 0.7, verb: 'Search', mesh: urn });
        break;
      }
      case 'p':
        b.cyl(0.55, 0.65, H, def.wall, wx, H / 2, wz, { seg: 10, tile: 2 });
        break;
      case 'w': {
        b.cyl(0.25, 0.35, 1.2, def.wall, wx, 0.6, wz, { seg: 8 });
        const g = new THREE.Mesh(new THREE.OctahedronGeometry(0.25), M('welkynd'));
        g.position.set(wx, 1.5, wz);
        g.userData.spin = true;
        b.add(g);
        b.light(0x4a88ff, 26, 16, wx, 1.8, wz, { flicker: false });
        break;
      }
      case 'l':
        b.cyl(0.5, 0.3, 1.4, 'iron', wx, 0.7, wz, { seg: 8 });
        b.emitter('flame', wx, 1.42, wz, 20, { color: 0xff5010, size: 0.85 });
        b.light(0xff5020, 30, 18, wx, 2.2, wz, { flicker: true });
        break;
      case 'q': {
        // a brass orrery: the sun and Tamriel's moons and wandering stars on spinning rings
        b.cyl(0.5, 0.65, 0.9, 'wood@8a5a3a', wx, 0.45, wz, { seg: 10 });
        const orr = new THREE.Group();
        orr.position.set(wx, 1.9, wz);
        const brass = M('gold');
        const sun = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffd060, emissive: 0xffa020, emissiveIntensity: 2 }));
        orr.add(sun);
        const cols = [0xc0c8ff, 0xf0a0a0, 0x90e0b0, 0xe0d0a0];
        for (let k = 0; k < 4; k++) {
          const ring = new THREE.Group();
          ring.rotation.set(0.3 + k * 0.35, k * 0.8, 0.2 * k);
          const tor = new THREE.Mesh(new THREE.TorusGeometry(0.35 + k * 0.18, 0.012, 6, 40), brass);
          tor.rotation.x = Math.PI / 2;
          ring.add(tor);
          const pl = new THREE.Mesh(new THREE.SphereGeometry(0.05 + (k % 2) * 0.03, 10, 8), new THREE.MeshStandardMaterial({ color: cols[k], roughness: 0.4, emissive: cols[k], emissiveIntensity: 0.3 }));
          pl.position.set(0.35 + k * 0.18, 0, 0);
          ring.add(pl);
          ring.userData.spin = true;
          orr.add(ring);
        }
        orr.userData.spin = true;
        b.add(orr);
        b.light(0xffc070, 10, 8, wx, 2.2, wz, { flicker: false });
        meta.orrery = { x: wx, z: wz };
        break;
      }
      case 'j': {
        // a bubbling cauldron of something lilac
        b.cyl(0.55, 0.42, 0.7, 'iron', wx, 0.45, wz, { seg: 14 });
        const brew = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.04, 16), new THREE.MeshStandardMaterial({ color: 0xb080ff, emissive: 0x8040ff, emissiveIntensity: 1.2, roughness: 0.2 }));
        brew.position.set(wx, 0.78, wz);
        b.add(brew);
        b.emitter('bubble', wx, 0.8, wz, 6, { color: 0xc8a0ff });
        b.light(0xa060ff, 8, 7, wx, 1.4, wz, { flicker: true });
        for (let k = 0; k < 3; k++) b.box(0.08, 0.5, 0.08, 'iron', wx + Math.cos(k * 2.1) * 0.45, 0.1, wz + Math.sin(k * 2.1) * 0.45, 0, { collide: false });
        break;
      }
      case 'X': case 'Y': case 'Z': {
        // Ayleid pedestal topped with a glyph: X sun, Y moon, Z star
        const sym = { X: 'sun', Y: 'moon', Z: 'star' }[c];
        b.cyl(0.45, 0.6, 1.2, 'ayleid', wx, 0.6, wz, { seg: 8 });
        b.cyl(0.62, 0.62, 0.12, 'ayleid', wx, 1.26, wz, { seg: 8, collide: false });
        const gm = new THREE.MeshStandardMaterial({ color: 0x6a8ab8, emissive: 0x3070ff, emissiveIntensity: 0.15, roughness: 0.3, metalness: 0.4 });
        let glyph;
        if (sym === 'moon') glyph = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.07, 8, 20, Math.PI * 1.35), gm);
        else if (sym === 'star') glyph = new THREE.Mesh(new THREE.OctahedronGeometry(0.3), gm);
        else glyph = new THREE.Mesh(new THREE.IcosahedronGeometry(0.26, 0), gm);
        glyph.position.set(wx, 1.75, wz);
        if (sym === 'moon') glyph.rotation.z = 0.6;
        glyph.userData.dynamic = true;
        b.add(glyph);
        b.interact({ kind: 'pedestal', sym, id: `nen_pedestal_${sym}`, name: `Pedestal of the ${sym[0].toUpperCase() + sym.slice(1)}`, pos: new THREE.Vector3(wx, 1.4, wz), radius: 1.2, verb: 'Touch', mesh: glyph, glyphMat: gm });
        break;
      }
      case 'G': {
        // a gate of fused light across the doorway
        const gate = new THREE.Group();
        for (let k = -3; k <= 3; k++) {
          const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, H - 0.4, 6), M('welkynd'));
          bar.position.set(k * 0.4, (H - 0.4) / 2, 0);
          gate.add(bar);
        }
        gate.position.set(wx, 0, wz);
        b.add(gate);
        const colBox = b.col.addBox(wx, wz, T / 2, 0.3, 0, -1, H + 1);
        b.interact({ kind: 'sealgate', id: 'nen_gate', name: 'Sealed Gate', openFlag: 'nenGate', pos: new THREE.Vector3(wx, 1.4, wz - 0.8), radius: 1.6, verb: 'Examine', mesh: gate, collider: colBox });
        meta.puzzle = { x: wx, z: wz - T * 2 };
        break;
      }
      case 'V': meta.crystal = { x: wx + T * 0.6, z: wz }; break;
      case 'A': meta.atlas = { x: wx - T * 0.6, z: wz }; break;
      case 'h': {
        // a pew facing the altar
        if (hasProp('painted_wooden_bench')) placeProp(b, 'painted_wooden_bench', wx, 0, wz, { rot: Math.PI, scale: 1.25 });
        else b.box(1.4, 0.5, 0.5, 'wood', wx, 0.25, wz, 0);
        break;
      }
      case 'L': {
        // the altar of Akatosh with the Dragon's hourglass sigil
        b.box(T * 1.4, 1.0, T * 0.6, 'stone', wx, 0.5, wz, 0);
        b.box(T * 1.5, 0.08, T * 0.7, 'clothred', wx, 1.04, wz, 0, { collide: false });
        const sig = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.06, 8, 24), M('gold'));
        sig.position.set(wx, 2.6, wz - T / 2 + 0.1);
        b.add(sig);
        for (const s of [-1, 1]) {
          const tri = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.45, 3), M('gold'));
          tri.position.set(wx, 2.6 + s * 0.2, wz - T / 2 + 0.12);
          tri.rotation.z = s > 0 ? Math.PI : 0;
          b.add(tri);
        }
        if (hasProp('brass_candleholders')) for (const s of [-1, 1]) decor(b, 'brass_candleholders', wx + s * 0.9, 1.08, wz, { variant: 1, collide: false });
        b.light(0xffc070, 18, 12, wx, 2.2, wz + 1, { flicker: true });
        break;
      }
      case 'k': case 'a': (meta.cultists ||= []).push({ x: wx, z: wz, tpl: c === 'k' ? 'dawn_cultist' : 'dawn_acolyte' }); break;
      case 'M': meta.statue = { x: wx, z: wz }; b.cyl(1.6, 1.9, 0.8, 'obrock', wx, 0.4, wz, { seg: 8 }); break;
      case 'O': {
        b.box(1.6, 1.0, 0.9, 'darkstone', wx, 0.5, wz, 0);
        b.box(1.7, 0.06, 1.0, 'clothred', wx, 1.03, wz, 0, { collide: false });
        meta.xarxes = { x: wx, z: wz };
        b.light(0xff3010, 22, 14, wx, 2.2, wz, { flicker: true });
        break;
      }
      case 'g': {
        // a soul lantern: an iron post and cage, and inside it a green light that is somebody
        b.cyl(0.05, 0.07, 1.7, 'iron', wx, 0.85, wz, { seg: 6 });
        b.cyl(0.3, 0.38, 0.12, 'iron', wx, 0.06, wz, { seg: 8, collide: false });
        const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.36, 6, 1, true), new THREE.MeshStandardMaterial({ color: 0x2a2a2c, metalness: 0.8, roughness: 0.5, wireframe: true }));
        cage.position.set(wx, 1.9, wz);
        b.add(cage);
        const soul = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.45, 2.0, 1.0) }));
        soul.position.set(wx, 1.9, wz);
        soul.userData.dynamic = true;
        b.add(soul);
        const light = b.light(0x50ff90, 24, 15, wx, 2.0, wz, { flicker: true });
        (meta.souls ||= []).push({ mesh: soul, light, x: wx, z: wz });
        break;
      }
      case 'z': {
        // a heap of ash, and what the ash was made from
        const heap = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x2a2624, roughness: 1 }));
        heap.scale.y = 0.35;
        heap.position.set(wx, 0, wz);
        b.add(heap);
        for (let k = 0; k < 3; k++) b.box(0.06, 0.06, 0.5 + rand() * 0.3, 'bone', wx + (rand() - 0.5) * 1.2, 0.2, wz + (rand() - 0.5) * 1.2, rand() * 6, { collide: false, rx: 0.2 });
        const skull = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), M('bone'));
        skull.scale.set(1, 1.1, 1.2);
        skull.position.set(wx + 0.3, 0.32, wz - 0.2);
        b.add(skull);
        break;
      }
      case 'R': {
        // the Lamplighter's circle: a ring of green fire laid into the floor, a slab, and candles of black wax
        const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 1.6, 0.8), transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
        const ring = new THREE.Mesh(new THREE.RingGeometry(2.3, 2.5, 48), ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(wx, 0.03, wz);
        ring.userData.dynamic = true;
        b.add(ring);
        const glyphs = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.28, 6), ringMat);
        glyphs.rotation.x = -Math.PI / 2;
        glyphs.position.set(wx, 0.03, wz);
        glyphs.userData.dynamic = true;
        b.add(glyphs);
        b.box(1.6, 0.6, 0.9, 'darkstone', wx, 0.3, wz, 0.3);
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2;
          b.cyl(0.04, 0.05, 0.3, 'dark', wx + Math.cos(a) * 2.0, 0.15, wz + Math.sin(a) * 2.0, { seg: 6, collide: false });
        }
        meta.ritual = { x: wx, z: wz, ring, glyphs, light: b.light(0x50ff90, 26, 16, wx, 1.5, wz, { flicker: true }) };
        break;
      }
      case 'v': {
        // a cold iron brazier on a stone foot; fire here melts the next wall of ice
        const n = (meta.braziers ||= []).length + 1;
        b.cyl(0.42, 0.52, 0.9, 'whitestone@a8b8c8', wx, 0.45, wz, { seg: 8 });
        b.cyl(0.62, 0.36, 0.38, 'iron', wx, 1.08, wz, { seg: 10 });
        const coals = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.05, 10), new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 1 }));
        coals.position.set(wx, 1.25, wz);
        b.add(coals);
        const it = b.interact({ kind: 'coldbrazier', id: `rime_brazier_${n}`, n, name: 'Cold Brazier', pos: new THREE.Vector3(wx, 1.2, wz), radius: 1.3, verb: 'Light' });
        meta.braziers.push({ x: wx, z: wz, n, it });
        break;
      }
      case 'i': {
        // a wall of blue ice filling the doorway
        const n = (meta.iceGates ||= []).length + 1;
        const ice = new THREE.Mesh(new THREE.BoxGeometry(T, H, 0.9), M('ice'));
        ice.position.set(wx, H / 2, wz);
        b.add(ice);
        const colBox = b.col.addBox(wx, wz, T / 2, 0.45, 0, -1, H + 1);
        b.interact({ kind: 'icegate', id: `rime_ice_${n}`, name: 'A Wall of Ice', openFlag: `rimeIce${n}`, pos: new THREE.Vector3(wx, 1.4, wz - 0.9), radius: 1.8, verb: 'Examine', mesh: ice, collider: colBox });
        meta.iceGates.push({ x: wx, z: wz, n });
        break;
      }
      case 'U': {
        // the white hare, curled in a sphere of frost inside an iron cage
        const g = new THREE.Group();
        g.position.set(wx, 0, wz);
        b.cyl(1.0, 1.15, 0.4, 'whitestone@a8b8c8', wx, 0.2, wz, { seg: 12 });
        const bars = [];
        for (let k = 0; k < 10; k++) {
          const a = (k / 10) * Math.PI * 2;
          const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 5), M('iron'));
          bar.position.set(Math.cos(a) * 0.82, 1.15, Math.sin(a) * 0.82);
          g.add(bar);
          bars.push(bar);
        }
        const lid = new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.5, 10), M('iron'));
        lid.position.y = 2.1;
        g.add(lid);
        const frost = new THREE.Mesh(new THREE.SphereGeometry(0.62, 20, 14), new THREE.MeshStandardMaterial({ color: 0xcfe8ff, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.55, emissive: 0x4a80c0, emissiveIntensity: 0.5, depthWrite: false }));
        frost.position.y = 1.0;
        g.add(frost);
        const hare = buildHareMesh({ glow: 0.4 });
        hare.position.y = 0.62;
        hare.rotation.y = Math.PI * 0.85;
        g.add(hare);
        g.userData.dynamic = true;
        g.traverse((o) => { o.userData.dynamic = true; });
        b.add(g);
        b.col.addCircle(wx, wz, 0.95, 0, 2.3);
        const light = b.light(0x9ac8ff, 14, 10, wx, 1.6, wz, { flicker: false });
        meta.cage = { x: wx, z: wz, group: g, frost, hare, bars, lid, light, it: b.interact({ kind: 'harecage', id: 'rime_cage', name: 'The Frost Cage', pos: new THREE.Vector3(wx, 1.2, wz + 1.1), radius: 1.6, verb: 'Open' }) };
        break;
      }
      case 'e': meta.enemies.push({ x: wx, z: wz }); break;
      case 'E': meta.boss = { x: wx, z: wz }; break;
      case 'H': {
        b.cyl(0.4, 0.5, 1.0, def.wall, wx, 0.5, wz, { seg: 8 });
        meta.heirloom = { x: wx, z: wz };
        break;
      }
      case 's': {
        meta.sigil = { x: wx, z: wz };
        if (id === 'vilverin') {
          // locked iron gate across a doorway
          const gate = new THREE.Group();
          for (let k = -3; k <= 3; k++) {
            const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4, 5), M('iron'));
            bar.position.set(0, 2, k * 0.4);
            gate.add(bar);
          }
          gate.position.set(wx, 0, wz);
          b.add(gate);
          const colBox = b.col.addBox(wx, wz, 0.3, T / 2, 0, -1, H + 1);
          meta.gate = b.interact({ kind: 'gatebars', id: `${id}_gate`, name: 'Iron Gate', lock: { level: 4, key: 'vilverin_key' }, pos: new THREE.Vector3(wx, 1.4, wz), radius: 1.6, verb: 'Open', mesh: gate, collider: colBox });
          meta.sigil = null;
        }
        break;
      }
      default:
        if (/[1-9]/.test(c)) meta.npcs[c] = { x: wx, z: wz };
    }
  }

  // paintings on clear stretches of wall, spread around the room
  const paintings = WALL_PAINTINGS[id] || [];
  if (paintings.length) {
    const blocked = new Set(['S', 'F', 'K', 'x', 'b', 'D', 'C', 'p', 'w', 'l']);
    const cands = [];
    for (let z = 1; z < rows - 1; z++) for (let x = 1; x < cols - 1; x++) {
      const c = grid[z][x];
      if (c === '#' || c === ' ' || blocked.has(c)) continue;
      const [wx, wz] = at(x, z);
      // wall to the north / south / west / east -> painting faces into the room
      if (grid[z - 1][x] === '#') cands.push([wx, wz - T / 2 + 0.01, 0, x, z]);
      if (grid[z + 1][x] === '#' && grid[z + 1][x] !== 'D') cands.push([wx, wz + T / 2 - 0.01, Math.PI, x, z]);
      if (grid[z][x - 1] === '#') cands.push([wx - T / 2 + 0.01, wz, Math.PI / 2, x, z]);
      if (grid[z][x + 1] === '#') cands.push([wx + T / 2 - 0.01, wz, -Math.PI / 2, x, z]);
    }
    // keep paintings off the door wall and away from each other
    const chosen = [];
    for (let i = 0; i < cands.length && chosen.length < paintings.length; i++) {
      const c = cands[Math.floor((i * 7919) % cands.length)];
      if (chosen.some((o) => Math.hypot(o[0] - c[0], o[1] - c[1]) < T * 2.5)) continue;
      chosen.push(c);
    }
    chosen.forEach(([px, pz, rot], i) => hangPainting(b, paintings[i], px, Math.min(2.1, H * 0.55), pz, rot));
    for (const c of chosen) meta.used.add(c[3] + ',' + c[4]);
  }

  // furnishing along the walls: cabinets, barrels, baskets, tools; rubble and roots in ruins
  const near = (x, z, chars, r = 1) => {
    for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) if (chars.includes(grid[z + dz]?.[x + dx])) return true;
    return false;
  };
  const wallDecor = def.wallDecor || [];
  let placed = 0;
  for (let z = 1; z < rows - 1; z++) for (let x = 1; x < cols - 1; x++) {
    if (grid[z][x] !== '.' || meta.used.has(x + ',' + z)) continue;
    if (near(x, z, ['D', 'P', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'e', 'E', 's', 'G', 'X', 'Y', 'Z', 'V', 'A', 'k', 'a', 'M', 'O', 'q', 'j', 'g', 'R', 'v', 'i', 'U'], 1)) continue;
    const walls = [];
    if (grid[z - 1][x] === '#') walls.push([0, -1, 0]);
    if (grid[z + 1][x] === '#') walls.push([0, 1, Math.PI]);
    if (grid[z][x - 1] === '#') walls.push([-1, 0, Math.PI / 2]);
    if (grid[z][x + 1] === '#') walls.push([1, 0, -Math.PI / 2]);
    if (!walls.length) continue;
    const [wx, wz] = at(x, z);
    const [dx, dz, rot] = walls[Math.floor(rand() * walls.length)];
    if (def.dungeon) {
      // rubble heaps, fallen roots and old bones of the ruin
      if (rand() < 0.35) {
        const n = 2 + Math.floor(rand() * 4);
        for (let k = 0; k < n; k++) {
          const rid = ['rock_07', 'rock_09', 'stone_01'][Math.floor(rand() * 3)];
          decor(b, rid, wx + dx * (T / 2 - 0.5) + (rand() - 0.5) * 1.4, 0, wz + dz * (T / 2 - 0.5) + (rand() - 0.5) * 1.4, { variant: Math.floor(rand() * 6), scale: 2 + rand() * 4, rot: rand() * 6.28, collide: false });
        }
      } else if (rand() < 0.12) {
        decor(b, rand() < 0.5 ? 'root_cluster_01' : 'dry_branches_medium_01', wx + dx * (T / 2 - 1), 0, wz + dz * (T / 2 - 1), { rot: rot + (rand() - 0.5), scale: 0.9, collide: false });
      } else if (rand() < 0.1) {
        decor(b, 'antique_ceramic_vase_01', wx + dx * (T / 2 - 0.4), 0, wz + dz * (T / 2 - 0.4), { scale: 1.6, rot: rand() * 6.28 });
      }
      continue;
    }
    if (!wallDecor.length || rand() > (def.decorChance ?? 0.4) || placed >= (def.maxDecor ?? 8)) continue;
    const pid = wallDecor[Math.floor(rand() * wallDecor.length)];
    if (!hasProp(pid)) continue;
    const g = makeProp(pid);
    const depth = g.userData.propSize.z;
    const px = wx + dx * (T / 2 - depth / 2 - 0.06), pz = wz + dz * (T / 2 - depth / 2 - 0.06);
    placeProp(b, pid, px, 0, pz, { rot });
    meta.used.add(x + ',' + z);
    placed++;
    // something on top of low furniture
    const top = g.userData.propSize.y;
    if (top > 0.7 && top < 1.3 && /Commode|bench|shelves/.test(pid) && rand() < 0.8) {
      const pick = def.topItems || ['candlestick', 'ceramic_vase', 'clay_jug', 'horse_figurine', 'oil_lamp'];
      placeTableItem(b, px, pz, pick[Math.floor(rand() * pick.length)], def.owner, `${id}_top_${itemN++}`, top);
    }
  }
  // chandeliers / hanging lanterns
  for (const [cx, cz, cid] of def.chandeliers || []) {
    const ch = hasProp(cid) && makeProp(cid);
    if (!ch) continue;
    ch.position.set(cx, H - ch.userData.propSize.y, cz);
    ch.traverse((o) => { o.castShadow = false; });
    b.add(ch);
  }
  // weapons and shields hung on the walls
  const SIDE = { n: [0, -1, 0], s: [0, 1, Math.PI], w: [-1, 0, Math.PI / 2], e: [1, 0, -Math.PI / 2] };
  for (const [gx, gz, side, cy, wid, sc] of def.wallHangings || []) {
    const w = hasProp(wid) && makeProp(wid, { scale: sc || 1 });
    if (!w) continue;
    const [wx, wz] = at(gx, gz);
    const [dx, dz, rot] = SIDE[side];
    const d = w.userData.propSize.z / 2 + 0.04;
    w.position.set(wx + dx * (T / 2 - d), cy - w.userData.propSize.y / 2, wz + dz * (T / 2 - d));
    w.rotation.y = rot;
    meta.used.add(gx + ',' + gz);
    w.traverse((o) => { o.castShadow = false; });
    b.add(w);
  }

  // lighting: interiors need a gentle fill even far from lamps
  if (!def.dungeon) {
    b.light(0xffd0a0, 10, 22, 0, H - 0.6, 0, { flicker: false });
  }
  return meta;
}
