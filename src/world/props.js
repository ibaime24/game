// Photo-scanned props from Poly Haven (CC0), stored as meshopt/WebP GLBs in public/models.
// Each model is split into "variants" (sets such as shrub_01 ship several plants side by side),
// baked to plain float geometry sitting on y = 0 and centred on x/z, so props can be cloned
// cheaply or batched into chunked InstancedMeshes for scattering across the overworld.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

export const PROP_IDS = [
  'wine_barrel_01', 'wooden_barrels_01', 'wooden_crate_01', 'wooden_crate_02', 'treasure_chest', 'wooden_bucket_01',
  'wooden_bucket_02', 'wooden_lantern_01', 'Lantern_01', 'wooden_candlestick', 'brass_candleholders', 'brass_goblets', 'jug_01',
  'ceramic_vase_01', 'ceramic_vase_03', 'antique_ceramic_vase_01', 'wooden_bowl_01', 'wooden_bowl_02', 'carved_wooden_plate',
  'wine_bottles_01', 'wicker_basket_01', 'wicker_basket_02', 'food_apple_01', 'yellow_onion', 'lemon', 'sweet_potato',
  'food_pears_asian_01', 'GothicBed_01', 'GothicCabinet_01', 'GothicCommode_01', 'painted_wooden_bench', 'painted_wooden_table',
  'painted_wooden_chair_01', 'painted_wooden_stool', 'painted_wooden_shelves', 'wooden_stool_01', 'wooden_stool_02',
  'round_wooden_table_01', 'WoodenTable_01', 'wooden_bookshelf_worn', 'book_encyclopedia_set_01', 'vintage_oil_lamp',
  'spinning_wheel_01', 'Chandelier_01', 'lantern_chandelier_01', 'wooden_cutting_board', 'wooden_spoon', 'brass_pot_01', 'metal_jug',
  'wooden_broom', 'wooden_ladder', 'wooden_hammer_01', 'handsaw_wood', 'rusted_spade_01', 'wooden_axe', 'hatchet', 'marble_bust_01',
  'gothic_statue', 'horse_statue_01', 'lion_head', 'kite_shield', 'ornate_medieval_dagger', 'ornate_medieval_mace', 'ornate_war_hammer',
  'antique_estoc', 'seadogs_compass', 'magnifying_glass_01', 'ornate_mirror_01', 'stone_fire_pit', 'tree_stump_01', 'tree_stump_02',
  'dead_tree_trunk', 'dead_tree_trunk_02', 'fern_02', 'shrub_01', 'shrub_02', 'shrub_03', 'shrub_04', 'rock_moss_set_01',
  'rock_moss_set_02', 'boulder_01', 'dry_branches_medium_01', 'root_cluster_01', 'pine_roots', 'nettle_plant',
  'celandine_01', 'dandelion_01', 'dutch_ship_medium', 'large_castle_door', 'namaqualand_boulder_02',
  'rock_07', 'rock_09', 'stone_01',
];

const props = new Map(); // id -> { variants: [{ parts: [{geometry, material}], size: Vector3 }] }
let loading = null;

export function propsReady() { return props.size > 0; }
export function hasProp(id) { return props.has(id); }
export function propVariants(id) { return props.get(id)?.variants.length || 0; }
export function propSize(id, v = 0) { return props.get(id)?.variants[v % propVariants(id)]?.size; }

export function loadProps(onProgress) {
  if (loading) return loading;
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  let done = 0;
  loading = Promise.all(PROP_IDS.map(async (id) => {
    try {
      const gltf = await loader.loadAsync(`/models/${id}.glb`);
      props.set(id, prepare(gltf.scene, id));
    } catch (e) {
      console.warn('Prop failed to load:', id, e?.message || e);
    }
    onProgress?.(++done / PROP_IDS.length);
  }));
  return loading;
}

/** Copy any quantized/interleaved attribute into a plain Float32 attribute. */
function floatAttr(a) {
  const n = a.count, s = a.itemSize;
  const out = new Float32Array(n * s);
  for (let i = 0; i < n; i++) for (let k = 0; k < s; k++) out[i * s + k] = a.getComponent(i, k);
  return new THREE.BufferAttribute(out, s);
}

function bakeMesh(mesh, rootInv) {
  const g = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'uv', 'color']) {
    const a = mesh.geometry.attributes[name];
    if (a) g.setAttribute(name, floatAttr(a));
  }
  if (mesh.geometry.index) g.setIndex(Array.from(mesh.geometry.index.array));
  const m = new THREE.Matrix4().multiplyMatrices(rootInv, mesh.matrixWorld);
  g.applyMatrix4(m);
  if (!g.attributes.normal) g.computeVertexNormals();
  return g;
}

function boxesDisjoint(boxes) {
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    const ix = Math.min(a.max.x, b.max.x) - Math.max(a.min.x, b.min.x);
    const iz = Math.min(a.max.z, b.max.z) - Math.max(a.min.z, b.min.z);
    if (ix <= 0 || iz <= 0) continue;
    const sa = (a.max.x - a.min.x) * (a.max.z - a.min.z), sb = (b.max.x - b.min.x) * (b.max.z - b.min.z);
    if (ix * iz > 0.25 * Math.min(sa, sb)) return false;
  }
  return true;
}

function fixMaterial(mat) {
  mat.side = THREE.FrontSide;
  // physically based transmission re-renders the whole scene every frame it is on screen; fake the glass instead
  if (mat.transmission > 0) {
    mat.transmission = 0;
    mat.transparent = true;
    mat.opacity = Math.min(mat.opacity, 0.42);
    mat.roughness = Math.min(mat.roughness ?? 0.1, 0.1);
    mat.metalness = 0;
    mat.depthWrite = false;
    if (mat.thickness !== undefined) mat.thickness = 0;
  }
  // blended foliage (leaves, bristles) renders far cheaper and sorts correctly as an alpha cut-out
  if (mat.transparent && mat.map && !/glass|lense|flame|wine|clear/i.test(mat.name)) {
    mat.transparent = false;
    mat.alphaTest = 0.45;
    mat.depthWrite = true;
  }
  if (mat.alphaTest > 0 || mat.transparent) mat.side = THREE.DoubleSide;
  if (mat.transparent) mat.depthWrite = false;
  // a transparent double-sided material otherwise renders in two passes and recompiles its program each draw
  mat.forceSinglePass = true;
  if (mat.map) mat.map.anisotropy = 8;
  return mat;
}

// sets whose variants were merged into one mesh: split them by spatial clusters of connected geometry
const CLUSTER_SPLIT = new Set(['dandelion_01', 'celandine_01', 'nettle_plant', 'shrub_01', 'shrub_02', 'shrub_03', 'shrub_04', 'moss_01',
  'rock_07', 'rock_09', 'stone_01', 'wine_bottles_01', 'rock_moss_set_01', 'rock_moss_set_02', 'dead_tree_trunk', 'brass_candleholders', 'fern_02']);

/** Split baked parts into clusters of triangles whose connected pieces overlap on the ground plane. */
function clusterSplit(parts) {
  // connected components per part (welding by position), then merge components with overlapping x/z boxes
  const comps = []; // { part, tris: [], box }
  parts.forEach((part, pi) => {
    const pos = part.geometry.attributes.position;
    const idx = part.geometry.index ? part.geometry.index.array : Array.from({ length: pos.count }, (_, i) => i);
    const weld = new Map();
    const canon = new Int32Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      const k = Math.round(pos.getX(i) * 500) + ',' + Math.round(pos.getY(i) * 500) + ',' + Math.round(pos.getZ(i) * 500);
      if (!weld.has(k)) weld.set(k, i);
      canon[i] = weld.get(k);
    }
    const parent = new Int32Array(pos.count).map((_, i) => i);
    const find = (a) => { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; };
    for (let t = 0; t < idx.length; t += 3) {
      const a = find(canon[idx[t]]), b = find(canon[idx[t + 1]]), c = find(canon[idx[t + 2]]);
      parent[b] = a; parent[find(c)] = a;
    }
    const byRoot = new Map();
    for (let t = 0; t < idx.length; t += 3) {
      const r = find(canon[idx[t]]);
      let c = byRoot.get(r);
      if (!c) { c = { parts: new Map(), box: new THREE.Box3() }; byRoot.set(r, c); comps.push(c); }
      if (!c.parts.has(pi)) c.parts.set(pi, []);
      c.parts.get(pi).push(idx[t], idx[t + 1], idx[t + 2]);
      for (let k = 0; k < 3; k++) c.box.expandByPoint(new THREE.Vector3().fromBufferAttribute(pos, idx[t + k]));
    }
  });
  // merge overlapping components (x/z only, small margin)
  const overlap = (a, b, m) => a.min.x - m < b.max.x && b.min.x - m < a.max.x && a.min.z - m < b.max.z && b.min.z - m < a.max.z;
  let clusters = comps.map((c) => ({ box: c.box.clone(), members: [c] }));
  let changed = true;
  while (changed) {
    changed = false;
    outer: for (let i = 0; i < clusters.length; i++) for (let j = i + 1; j < clusters.length; j++) {
      if (overlap(clusters[i].box, clusters[j].box, 0.01)) {
        clusters[i].box.union(clusters[j].box);
        clusters[i].members.push(...clusters[j].members);
        clusters.splice(j, 1);
        changed = true;
        break outer;
      }
    }
  }
  // tiny fragments join their nearest big cluster
  const vol = (b) => { const s = b.getSize(new THREE.Vector3()); return Math.max(1e-6, s.x * s.z * Math.max(s.y, 0.01)); };
  const maxV = Math.max(...clusters.map((c) => vol(c.box)));
  const big = clusters.filter((c) => vol(c.box) > maxV * 0.04);
  for (const c of clusters) {
    if (big.includes(c)) continue;
    const cc = c.box.getCenter(new THREE.Vector3());
    let best = big[0], bd = Infinity;
    for (const b of big) { const d = b.box.getCenter(new THREE.Vector3()).distanceTo(cc); if (d < bd) { bd = d; best = b; } }
    best.members.push(...c.members);
  }
  if (big.length < 2) return null;
  big.sort((a, b) => a.box.min.x - b.box.min.x || a.box.min.z - b.box.min.z);
  return big.map((cl) => {
    const out = [];
    parts.forEach((part, pi) => {
      const tris = [];
      for (const m of cl.members) if (m.parts.has(pi)) tris.push(...m.parts.get(pi));
      if (!tris.length) return;
      out.push({ geometry: compact(part.geometry, tris), material: part.material });
    });
    return out;
  });
}

/** A geometry holding only the vertices the given triangles use. */
function compact(src, tris) {
  const remap = new Map();
  const index = tris.map((i) => { if (!remap.has(i)) remap.set(i, remap.size); return remap.get(i); });
  const g = new THREE.BufferGeometry();
  for (const [name, a] of Object.entries(src.attributes)) {
    const out = new Float32Array(remap.size * a.itemSize);
    for (const [o, n] of remap) for (let k = 0; k < a.itemSize; k++) out[n * a.itemSize + k] = a.getComponent(o, k);
    g.setAttribute(name, new THREE.BufferAttribute(out, a.itemSize));
  }
  g.setIndex(index);
  return g;
}

function finishVariant(parts) {
  const box = new THREE.Box3();
  for (const p of parts) { p.geometry.computeBoundingBox(); box.union(p.geometry.boundingBox); }
  const c = box.getCenter(new THREE.Vector3());
  for (const p of parts) {
    p.geometry.translate(-c.x, -box.min.y, -c.z);
    p.geometry.computeBoundingSphere();
    p.geometry.computeBoundingBox();
  }
  return { parts, size: box.getSize(new THREE.Vector3()) };
}

function prepare(scene, id) {
  scene.updateMatrixWorld(true);
  // descend through single-child wrappers to the node whose children may be variants
  let root = scene;
  while (root.children.length === 1 && !root.children[0].isMesh) root = root.children[0];
  const groups = root.children.filter((c) => { let has = false; c.traverse((o) => { if (o.isMesh) has = true; }); return has; });
  const boxes = groups.map((c) => new THREE.Box3().setFromObject(c));
  const splitNodes = groups.length > 1 && boxesDisjoint(boxes);
  const sets = splitNodes ? groups : [root];
  const rootInv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const variants = [];
  for (const node of sets) {
    const parts = [];
    node.traverse((o) => { if (o.isMesh) parts.push({ geometry: bakeMesh(o, rootInv), material: fixMaterial(o.material) }); });
    const split = !splitNodes && CLUSTER_SPLIT.has(id) ? clusterSplit(parts) : null;
    if (split) for (const sp of split) variants.push(finishVariant(sp));
    else variants.push(finishVariant(parts));
  }
  return { variants };
}

/**
 * A new Group holding the prop (shares geometry and materials).
 * opts: variant, scale, height (scale so the prop is this tall), fit (scale so the longest side is this long),
 *       shadow (default: true for props larger than 25 cm), tint (multiplies a cloned material colour)
 */
export function makeProp(id, opts = {}) {
  const p = props.get(id);
  if (!p) return null;
  const v = p.variants[(opts.variant ?? 0) % p.variants.length];
  const g = new THREE.Group();
  let s = opts.scale ?? 1;
  if (opts.height) s = opts.height / v.size.y;
  if (opts.fit) s = opts.fit / Math.max(v.size.x, v.size.y, v.size.z);
  const shadow = opts.shadow ?? Math.max(v.size.x, v.size.y, v.size.z) * s > 0.25;
  for (const part of v.parts) {
    let material = part.material;
    if (opts.tint) { material = material.clone(); material.color.multiply(new THREE.Color(opts.tint)); }
    const m = new THREE.Mesh(part.geometry, material);
    m.castShadow = shadow && !material.transparent;
    m.receiveShadow = true;
    g.add(m);
  }
  g.scale.setScalar(s);
  g.userData.propSize = v.size.clone().multiplyScalar(s);
  g.userData.prop = id;
  return g;
}

/**
 * Place a prop through a Builder: adds the mesh and (optionally) a box collider from its footprint.
 * opts: as makeProp plus rot, collide (default: footprint > 0.35 m), walkable
 */
export function placeProp(b, id, x, y, z, opts = {}) {
  const g = makeProp(id, opts);
  if (!g) return null;
  g.position.set(x, y, z);
  g.rotation.y = opts.rot || 0;
  b.add(g);
  const s = g.userData.propSize;
  const collide = opts.collide ?? Math.max(s.x, s.z) > 0.35;
  if (collide) b.col.addBox(x, z, s.x / 2, s.z / 2, opts.rot || 0, y, y + s.y, { walkable: opts.walkable ?? s.y < 1.1 });
  return g;
}

// ------------------------------------------------------------------ batched scatter
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _e = new THREE.Euler();

/** Collects transforms and builds chunked InstancedMeshes with distance culling. */
export class PropScatter {
  constructor(chunk = 80) {
    this.chunk = chunk;
    this.lists = new Map(); // "id|variant" -> [{x, z, matrix}]
    this.opts = new Map();
  }

  /** o: variant, scale, rotY, tiltX, tiltZ, maxDist, shadow */
  add(id, x, y, z, o = {}) {
    const p = props.get(id);
    if (!p) return null;
    const v = (o.variant ?? 0) % p.variants.length;
    const key = id + '|' + v;
    if (!this.lists.has(key)) { this.lists.set(key, []); this.opts.set(key, { maxDist: o.maxDist ?? 150, shadow: o.shadow }); }
    _e.set(o.tiltX || 0, o.rotY || 0, o.tiltZ || 0);
    _q.setFromEuler(_e);
    const sc = o.height ? o.height / Math.max(0.01, p.variants[v].size.y) : o.scale ?? 1;
    _s.set(sc * (o.sx ?? 1), sc * (o.sy ?? 1), sc * (o.sx ?? 1));
    _p.set(x, y, z);
    this.lists.get(key).push({ x, z, matrix: _m.compose(_p, _q, _s).clone() });
    return p.variants[v].size.clone().multiplyScalar(sc);
  }

  build(parent) {
    const group = new THREE.Group();
    group.name = 'props';
    const chunks = [];
    for (const [key, list] of this.lists) {
      const [id, v] = key.split('|');
      const variant = props.get(id).variants[+v];
      const { maxDist, shadow } = this.opts.get(key);
      const big = Math.max(variant.size.x, variant.size.y, variant.size.z);
      const byChunk = new Map();
      for (const it of list) {
        const ck = Math.floor(it.x / this.chunk) + ',' + Math.floor(it.z / this.chunk);
        if (!byChunk.has(ck)) byChunk.set(ck, []);
        byChunk.get(ck).push(it);
      }
      for (const items of byChunk.values()) {
        let cx = 0, cz = 0;
        for (const it of items) { cx += it.x; cz += it.z; }
        cx /= items.length; cz /= items.length;
        const meshes = [];
        for (const part of variant.parts) {
          const im = new THREE.InstancedMesh(part.geometry, part.material, items.length);
          items.forEach((it, i) => im.setMatrixAt(i, it.matrix));
          im.instanceMatrix.needsUpdate = true;
          im.computeBoundingSphere();
          im.castShadow = (shadow ?? big > 0.6) && !part.material.transparent;
          im.receiveShadow = true;
          im.matrixAutoUpdate = false;
          im.updateMatrix();
          group.add(im);
          meshes.push(im);
        }
        chunks.push({ x: cx, z: cz, r: this.chunk * 0.75, maxDist, meshes, visible: true });
      }
    }
    group.matrixAutoUpdate = false;
    parent.add(group);
    group.userData.chunks = chunks;
    return group;
  }
}

/** Hide scatter chunks beyond their draw distance (cheap: one test per chunk). */
export function updateScatter(group, cam, distScale = 1) {
  const chunks = group?.userData.chunks;
  if (!chunks) return;
  for (const c of chunks) {
    const d = Math.hypot(c.x - cam.x, c.z - cam.z) - c.r;
    const vis = d < c.maxDist * distScale;
    if (vis !== c.visible) {
      c.visible = vis;
      for (const m of c.meshes) m.visible = vis;
    }
  }
}
