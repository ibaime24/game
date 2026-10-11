// Character kit: assembles rigged CC0 characters from Quaternius' Universal Base Characters,
// Modular Character Outfits (Fantasy) and Universal Animation Library (public/characters).
// A character = outfit body (with skin arms/hands) + head split from the base body + eyes,
// eyebrows, hair, optional beard, all bound to one 65-joint skeleton and driven by an AnimationMixer.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const BASE = '/characters/';
const loader = new GLTFLoader();
const kit = { ready: false, gltf: {}, clips: {}, headGeo: {}, skinTex: new Map() };
let loading = null;

const FILES = {
  base_male: 'base_male.gltf', base_female: 'base_female.gltf',
  outfit_male_peasant: 'outfit_male_peasant.gltf', outfit_male_ranger: 'outfit_male_ranger.gltf',
  outfit_female_peasant: 'outfit_female_peasant.gltf', outfit_female_ranger: 'outfit_female_ranger.gltf',
  hair_long: 'hair_hair_long.gltf', hair_buns: 'hair_hair_buns.gltf', hair_buzzed: 'hair_hair_buzzed.gltf',
  hair_buzzedfemale: 'hair_hair_buzzedfemale.gltf', hair_parted: 'hair_hair_simpleparted.gltf', hair_beard: 'hair_hair_beard.gltf',
  brows_male: 'hair_eyebrows_regular.gltf', brows_female: 'hair_eyebrows_female.gltf',
};

export function isKitReady() { return kit.ready; }

export function loadCharacterKit() {
  if (loading) return loading;
  loading = (async () => {
    const entries = Object.entries(FILES);
    const results = await Promise.all(entries.map(([, f]) => loader.loadAsync(BASE + f)));
    entries.forEach(([k], i) => { kit.gltf[k] = results[i]; });
    const [a1, a2] = await Promise.all([loader.loadAsync(BASE + 'anims_1.glb'), loader.loadAsync(BASE + 'anims_2.glb')]);
    for (const clip of [...a1.animations, ...a2.animations]) kit.clips[clip.name] = cleanClip(clip);
    for (const sex of ['male', 'female']) kit.headGeo[sex] = extractHead(kit.gltf['base_' + sex].scene);
    kit.ready = true;
  })().catch((e) => { console.warn('Character kit failed to load; using procedural characters', e); loading = Promise.resolve(); });
  return loading;
}

/** Keep rotations (and the pelvis/root position) so each character keeps its own proportions. */
function cleanClip(clip) {
  const tracks = clip.tracks.filter((t) => {
    if (t.name.endsWith('.quaternion')) return true;
    if (t.name.endsWith('.position')) return t.name.startsWith('pelvis.');
    return false;
  });
  return new THREE.AnimationClip(clip.name, clip.duration, tracks);
}

/** Split the head + neck off the base full-body mesh using skin weights. */
function extractHead(scene) {
  let body = null;
  scene.traverse((o) => { if (o.isSkinnedMesh && o.geometry.attributes.position.count > 3000) body = o; });
  if (!body) return null;
  const bones = body.skeleton.bones.map((b) => b.name);
  const keep = new Set(['Head', 'neck_01'].map((n) => bones.indexOf(n)));
  const g = body.geometry;
  const si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
  const vertKeep = new Uint8Array(si.count);
  for (let i = 0; i < si.count; i++) {
    let w = 0;
    for (let k = 0; k < 4; k++) if (keep.has(si.getComponent(i, k))) w += sw.getComponent(i, k);
    vertKeep[i] = w > 0.5 ? 1 : 0;
  }
  const idx = g.index.array;
  const out = [];
  for (let t = 0; t < idx.length; t += 3) {
    if (vertKeep[idx[t]] && vertKeep[idx[t + 1]] && vertKeep[idx[t + 2]]) out.push(idx[t], idx[t + 1], idx[t + 2]);
  }
  const head = g.clone();
  head.setIndex(out);
  return { geometry: head, material: body.material, bindMatrix: body.bindMatrix.clone(), boneNames: bones, boneInverses: body.skeleton.boneInverses.map((m) => m.clone()) };
}

/** Recolour a skin texture so its average matches the target tone (keeps freckles, lips, shading). */
function skinTexture(src, toneHex, cacheKey) {
  const key = cacheKey + toneHex;
  if (kit.skinTex.has(key)) return kit.skinTex.get(key);
  const img = src.image;
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height);
  const d = data.data;
  let r = 0, gg = 0, b = 0, n = 0;
  for (let i = 0; i < d.length; i += 64) { if (d[i + 3] > 0) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; n++; } }
  r /= n; gg /= n; b /= n;
  const tone = new THREE.Color(toneHex);
  const tr = tone.r * 255 / r, tg = tone.g * 255 / gg, tb = tone.b * 255 / b;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = Math.min(255, d[i] * tr); d[i + 1] = Math.min(255, d[i + 1] * tg); d[i + 2] = Math.min(255, d[i + 2] * tb);
  }
  ctx.putImageData(data, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.flipY = src.flipY;
  t.anisotropy = 8;
  kit.skinTex.set(key, t);
  return t;
}

const matCache = new Map();
function cachedMat(key, make) {
  if (!matCache.has(key)) matCache.set(key, make());
  return matCache.get(key);
}

/** Re-bind a skinned mesh (from any kit file) to the target skeleton by bone name. */
function rebind(srcMesh, skeleton, boneMap, material) {
  const bones = srcMesh.skeleton.bones.map((b) => boneMap.get(b.name));
  if (bones.some((b) => !b)) return null;
  const m = new THREE.SkinnedMesh(srcMesh.geometry, material || srcMesh.material);
  m.bind(new THREE.Skeleton(bones, srcMesh.skeleton.boneInverses), srcMesh.bindMatrix);
  m.castShadow = true;
  m.receiveShadow = true;
  m.frustumCulled = false;
  return m;
}

/**
 * Build a character.
 * opts: sex ('male'|'female'), outfit ('peasant'|'ranger'|'none'), skin (hex), hair (hex), hairStyle,
 *       beard, outfitTint (hex), eyes (hex glow), scale, opacity, headless
 * Returns { root, skeleton, bones (name -> Bone), mixer, meshes, height }.
 */
export function buildKitCharacter(opts = {}) {
  if (!kit.ready) return null;
  const sex = opts.sex === 'female' ? 'female' : 'male';
  const outfit = opts.outfit ?? 'peasant';
  // skeleton from the outfit file (regular proportions); fall back to the base body
  const src = outfit === 'none' ? kit.gltf['base_' + sex] : kit.gltf[`outfit_${sex}_${outfit}`];
  const clone = SkeletonUtils.clone(src.scene);
  const root = new THREE.Group();
  root.add(clone);
  let skeleton = null;
  const meshes = [];
  const transparent = !!opts.opacity;
  const tone = opts.skin ?? 0xc89a7a;

  clone.traverse((o) => {
    if (!o.isSkinnedMesh) return;
    skeleton = skeleton || o.skeleton;
    o.castShadow = !transparent;
    o.receiveShadow = true;
    o.frustumCulled = false;
    const name = o.material.name || '';
    if (/Regular|Superhero/.test(name)) {
      // exposed skin on the outfit (arms, hands)
      o.material = cachedMat(`skin_${name}_${tone}_${opts.opacity || 1}`, () => {
        const m = o.material.clone();
        if (m.map) m.map = skinTexture(m.map, tone, name);
        m.transparent = transparent; m.opacity = opts.opacity || 1; m.depthWrite = !transparent;
        if (transparent) m.emissive = new THREE.Color(tone).multiplyScalar(0.45);
        return m;
      });
    } else if (opts.outfitTint || transparent) {
      o.material = cachedMat(`cloth_${name}_${opts.outfitTint}_${opts.opacity || 1}`, () => {
        const m = o.material.clone();
        if (opts.outfitTint) m.color.setHex(opts.outfitTint);
        m.transparent = transparent; m.opacity = opts.opacity || 1; m.depthWrite = !transparent;
        if (transparent) { m.emissive = new THREE.Color(opts.outfitTint ?? tone).multiplyScalar(0.45); }
        return m;
      });
    }
    if (opts.hideParts && opts.hideParts.some((p) => o.name.includes(p))) o.visible = false;
    meshes.push(o);
  });
  const boneMap = new Map(skeleton.bones.map((b) => [b.name, b]));

  // head split from the base body, recoloured to the skin tone
  const head = kit.headGeo[sex];
  if (head && outfit !== 'none' && !opts.headless) {
    const mat = cachedMat(`head_${sex}_${tone}_${opts.opacity || 1}`, () => {
      const m = head.material.clone();
      if (m.map) m.map = skinTexture(m.map, tone, 'head_' + sex);
      m.transparent = transparent; m.opacity = opts.opacity || 1; m.depthWrite = !transparent;
      if (transparent) m.emissive = new THREE.Color(tone).multiplyScalar(0.45);
      return m;
    });
    const hm = new THREE.SkinnedMesh(head.geometry, mat);
    hm.bind(new THREE.Skeleton(head.boneNames.map((n) => boneMap.get(n)), head.boneInverses), head.bindMatrix);
    hm.castShadow = !transparent; hm.frustumCulled = false;
    clone.add(hm);
    meshes.push(hm);
  }
  // eyes: the small meshes in the base file
  if (!opts.headless) {
    kit.gltf['base_' + sex].scene.traverse((o) => {
      if (!o.isSkinnedMesh || o.geometry.attributes.position.count > 3000) return;
      const isEye = /Eye/i.test(o.material.name);
      if (!isEye) return;
      const mat = opts.eyes ? cachedMat('eyeglow' + opts.eyes, () => new THREE.MeshStandardMaterial({ color: opts.eyes, emissive: opts.eyes, emissiveIntensity: 3 })) : o.material;
      const m = rebind(o, skeleton, boneMap, mat);
      if (m) { clone.add(m); meshes.push(m); }
    });
  }
  // hair, eyebrows, beard
  const hairParts = [];
  if (!opts.headless) {
    hairParts.push(sex === 'female' ? 'brows_female' : 'brows_male');
    const style = opts.hairStyle || (sex === 'female' ? 'long' : 'parted');
    if (style !== 'bald') hairParts.push('hair_' + style);
    if (opts.beard) hairParts.push('hair_beard');
  }
  for (const part of hairParts) {
    kit.gltf[part]?.scene.traverse((o) => {
      if (!o.isSkinnedMesh) return;
      const mat = cachedMat(`hair_${part}_${opts.hair}_${opts.opacity || 1}`, () => {
        const m = o.material.clone();
        if (opts.hair != null) m.color.setHex(opts.hair);
        m.side = THREE.DoubleSide;
        m.forceSinglePass = true;
        if (transparent) { m.transparent = true; m.opacity = opts.opacity; m.depthWrite = false; }
        return m;
      });
      const m = rebind(o, skeleton, boneMap, mat);
      if (m) { clone.add(m); meshes.push(m); }
    });
  }
  shareSkeletons(meshes);
  for (const m of meshes) if (/Eye|Brow|eyebrow/i.test(m.material.name || '') || m.geometry.attributes.position.count < 400) m.castShadow = false;
  if (opts.scale) root.scale.setScalar(opts.scale);
  const mixer = new THREE.AnimationMixer(clone);
  return { root, model: clone, skeleton, bones: boneMap, mixer, meshes, height: 1.8 * (opts.scale || 1) };
}

/**
 * Meshes cloned from one glTF skin, or rebound to the same bones, each carry their own Skeleton and
 * bone texture, all updated and uploaded every frame. Merge identical ones into one shared Skeleton.
 */
function shareSkeletons(meshes) {
  const shared = [];
  const same = (a, b) => {
    if (a.bones.length !== b.bones.length) return false;
    for (let i = 0; i < a.bones.length; i++) {
      if (a.bones[i] !== b.bones[i]) return false;
      const x = a.boneInverses[i].elements, y = b.boneInverses[i].elements;
      for (let k = 0; k < 16; k++) if (Math.abs(x[k] - y[k]) > 1e-5) return false;
    }
    return true;
  };
  for (const m of meshes) {
    if (!m.isSkinnedMesh) continue;
    const hit = shared.find((sk) => same(sk, m.skeleton));
    if (hit) m.skeleton = hit;
    else shared.push(m.skeleton);
  }
}

export function getClip(name) { return kit.clips[name]; }
export function clipNames() { return Object.keys(kit.clips); }
