// Helpers for constructing architecture with colliders and correctly scaled UVs.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as TX from './textures.js';
import * as TG from './texgen.js';

const matCache = new Map();
function std(t, o = {}) {
  return new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, normalScale: new THREE.Vector2(1, 1), ...o });
}
export function M(name) {
  if (matCache.has(name)) return matCache.get(name);
  // 'plaster@f2c4c0' — a base material tinted with a colour (painted plaster, stained timber, glazed tiles)
  if (name.includes('@')) {
    const [base, hex] = name.split('@');
    const m = M(base).clone();
    m.color = new THREE.Color('#' + hex);
    matCache.set(name, m);
    return m;
  }
  let m;
  switch (name) {
    case 'stone': m = std(TG.stoneWallTex(), { roughness: 0.92 }); break;
    case 'darkstone': m = std(TG.stoneWallTex(), { color: 0x8c8780, roughness: 0.95 }); break;
    case 'whitestone': m = std(TG.stoneWallTex('white'), { roughness: 0.82 }); break;
    case 'rock': m = std(TG.photoOr('rock', () => TG.stoneWallTex()), { color: 0x9a968e, roughness: 0.95 }); break;
    case 'burnt': m = std(TG.stoneWallTex(), { color: 0x4a403a, roughness: 1 }); break;
    case 'plaster': m = std(TG.plasterTex(), { roughness: 0.95 }); break;
    case 'timber': m = std(TG.woodTex('timber'), { roughness: 0.88 }); break;
    case 'wood': m = std(TG.photoOr('crate', () => TG.woodTex('planks')), { roughness: 0.82 }); break;
    case 'floor': { const t = TG.woodTex('planks'); m = std(t, { color: t.photo ? 0xffffff : 0xb09078, roughness: 0.75 }); break; }
    case 'roof': m = std(TG.roofTex(), { roughness: 0.9 }); break;
    case 'roofred': { const t = TG.photoOr('roofred', () => TG.roofTex()); m = std(t, { color: t.photo ? 0xffffff : 0xd88870, roughness: 0.9 }); break; }
    case 'ayleid': m = std(TG.ayleidTex(), { roughness: 0.65 }); break;
    case 'obrock': { const t = TG.obrockTex(); m = std(t, { roughness: 0.8, metalness: 0.1, emissive: 0xff5020, emissiveIntensity: 2.2, emissiveMap: t.emissiveMap }); break; }
    case 'lava': m = new THREE.MeshBasicMaterial({ map: TX.lava(), color: 0xffffff }); break;
    case 'iron': m = new THREE.MeshStandardMaterial({ color: 0x3a3a3e, roughness: 0.45, metalness: 0.85 }); break;
    case 'gold': m = new THREE.MeshStandardMaterial({ color: 0xc8a040, roughness: 0.3, metalness: 1 }); break;
    case 'cloth': m = new THREE.MeshStandardMaterial({ map: TX.fabric(0x9a8a6a), roughness: 1, side: THREE.DoubleSide }); break;
    case 'clothred': m = new THREE.MeshStandardMaterial({ map: TX.fabric(0x8a2a20), roughness: 1, side: THREE.DoubleSide }); break;
    case 'clothgreen': m = new THREE.MeshStandardMaterial({ map: TX.fabric(0x2a5a30), roughness: 1, side: THREE.DoubleSide }); break;
    case 'hay': m = new THREE.MeshStandardMaterial({ map: TX.fabric(0xc8a850), roughness: 1 }); break;
    case 'window': m = new THREE.MeshStandardMaterial({ color: 0x1c2228, emissive: 0xffb050, emissiveIntensity: 0.0, roughness: 0.08, metalness: 0.6 }); break;
    case 'lanternglow': m = new THREE.MeshStandardMaterial({ color: 0xe8cc98, emissive: 0xffa040, emissiveIntensity: 0.0, roughness: 0.3 }); break;
    case 'welkynd': m = new THREE.MeshStandardMaterial({ color: 0x80c0ff, emissive: 0x4090ff, emissiveIntensity: 2.5, roughness: 0.2, transparent: true, opacity: 0.9 }); break;
    case 'varla': m = new THREE.MeshStandardMaterial({ color: 0xffe0a0, emissive: 0xffa040, emissiveIntensity: 2.5, roughness: 0.2 }); break;
    case 'fire': m = new THREE.MeshBasicMaterial({ color: 0xff8030 }); break;
    case 'portal': m = new THREE.MeshBasicMaterial({ color: 0xff5020 }); break;
    case 'bone': m = new THREE.MeshStandardMaterial({ color: 0xd8d0b8, roughness: 0.8 }); break;
    case 'dark': m = new THREE.MeshStandardMaterial({ color: 0x141210, roughness: 1 }); break;
    case 'rug': m = new THREE.MeshStandardMaterial({ map: TX.fabric(0x6a1a18), roughness: 1 }); break;
    case 'snow': { const t = TG.snowTex(); m = std(t, { color: 0xf4f8ff, roughness: 0.85 }); break; }
    case 'ice': m = new THREE.MeshStandardMaterial({ color: 0xcfe6ff, roughness: 0.08, metalness: 0.15, transparent: true, opacity: 0.82, emissive: 0x6a90c0, emissiveIntensity: 0.12 }); break;
    default: throw new Error('Unknown material ' + name);
  }
  matCache.set(name, m);
  return m;
}

export function setWindowGlow(v) {
  M('window').emissiveIntensity = v;
  // street lanterns burn brighter than windows, and only at night
  M('lanternglow').emissiveIntensity = Math.min(4, Math.max(0, v - 0.3) * 4.5);
}

/** Box geometry with UVs scaled to world units (1 texture tile per `tile` metres). */
export function boxGeo(w, h, d, tile = 3) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    const [su, sv] = dims[f];
    for (let i = 0; i < 4; i++) {
      const k = f * 4 + i;
      uv.setXY(k, uv.getX(k) * su / tile, uv.getY(k) * sv / tile);
    }
  }
  return g;
}

export class Builder {
  constructor(group, collision) {
    this.group = group;
    this.col = collision;
    this.interactables = [];
    this.lights = [];
    this.emitters = [];
  }

  /** A box at centre (x,y,z) rotated about Y by ry. parent: optional {x,z,rot} frame. */
  box(w, h, d, mat, x, y, z, ry = 0, o = {}) {
    const mesh = new THREE.Mesh(boxGeo(w, h, d, o.tile ?? 3), typeof mat === 'string' ? M(mat) : mat);
    mesh.position.set(x, y, z);
    mesh.rotation.y = ry;
    if (o.rx) mesh.rotation.x = o.rx;
    if (o.rz) mesh.rotation.z = o.rz;
    mesh.castShadow = o.cast !== false;
    mesh.receiveShadow = true;
    (o.parent || this.group).add(mesh);
    if (o.collide !== false && !o.rx && !o.rz) {
      this.col.addBox(x, z, w / 2, d / 2, ry, y - h / 2, y + h / 2, { walkable: o.walkable !== false });
    }
    return mesh;
  }

  cyl(rt, rb, h, mat, x, y, z, o = {}) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, o.seg ?? 12, 1, !!o.open), typeof mat === 'string' ? M(mat) : mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = o.cast !== false;
    mesh.receiveShadow = true;
    if (o.tile) {
      const uv = mesh.geometry.attributes.uv;
      const circ = Math.PI * 2 * Math.max(rt, rb);
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * circ / o.tile, uv.getY(i) * h / o.tile);
    }
    (o.parent || this.group).add(mesh);
    if (o.collide !== false) this.col.addCircle(x, z, Math.max(rt, rb), y - h / 2, y + h / 2, { walkable: o.walkable !== false });
    return mesh;
  }

  /** Gabled roof: ridge along local X. */
  roof(w, d, h, mat, x, y, z, ry = 0, o = {}) {
    const shape = new THREE.Shape();
    shape.moveTo(-d / 2, 0);
    shape.lineTo(0, h);
    shape.lineTo(d / 2, 0);
    shape.lineTo(-d / 2, 0);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false });
    geo.translate(0, 0, -w / 2);
    geo.rotateY(Math.PI / 2);
    // scale uvs
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 3, uv.getY(i) / 3);
    const mesh = new THREE.Mesh(geo, typeof mat === 'string' ? M(mat) : mat);
    mesh.position.set(x, y, z);
    mesh.rotation.y = ry;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    (o.parent || this.group).add(mesh);
    return mesh;
  }

  add(obj) { this.group.add(obj); return obj; }

  interact(def) {
    this.interactables.push(def);
    return def;
  }

  /** Virtual light; the game assigns the nearest ones to a fixed pool of real PointLights. */
  light(color, intensity, distance, x, y, z, o = {}) {
    const l = { color: new THREE.Color(color), intensity, distance, pos: new THREE.Vector3(x, y, z), flicker: o.flicker ?? true, night: !!o.night, on: true };
    this.lights.push(l);
    return l;
  }

  emitter(kind, x, y, z, rate = 10, o = {}) {
    const e = { kind, pos: new THREE.Vector3(x, y, z), rate, acc: 0, color: o.color, range: o.range ?? 120, size: o.size, day: !!o.day, night: !!o.night, spread: o.spread ?? 0 };
    this.emitters.push(e);
    return e;
  }
}

/** Text on a plank (signposts, shop signs). */
export function textPlank(text, w = 1.4, h = 0.32, bg = '#5a3e26', fg = '#f0e0b0') {
  const c = document.createElement('canvas');
  c.width = 512; c.height = Math.round(512 * h / w);
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.12})`;
    ctx.fillRect(0, Math.random() * c.height, c.width, 1 + Math.random() * 2);
  }
  ctx.fillStyle = fg;
  ctx.font = `bold ${Math.round(c.height * 0.5)}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, c.width / 2, c.height / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 });
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.05), m);
}

/**
 * Merge static meshes that share a material into single meshes (huge draw-call savings).
 * Meshes in `keep`, spinning props, multi-material meshes and nested groups are left alone.
 */
export function mergeStatic(group, keep = new Set()) {
  // flatten static prop groups (flowers, furniture, clutter) into world-space meshes so they batch too
  group.updateMatrixWorld(true);
  for (const child of [...group.children]) {
    if (child.isMesh || keep.has(child) || child.userData.dynamic || !child.userData.prop) continue;
    let ok = true;
    child.traverse((o) => { if (o !== child && (!o.isMesh || o.isSkinnedMesh || keep.has(o) || o.children.length)) ok = false; });
    if (!ok) continue;
    for (const m of [...child.children]) {
      const flat = new THREE.Mesh(m.geometry.clone().applyMatrix4(m.matrixWorld), m.material);
      flat.castShadow = m.castShadow;
      flat.receiveShadow = m.receiveShadow;
      group.add(flat);
    }
    group.remove(child);
  }
  const buckets = new Map();
  for (const child of [...group.children]) {
    if (!child.isMesh || child.isInstancedMesh || keep.has(child) || child.userData.spin || child.userData.dynamic) continue;
    if (Array.isArray(child.material) || child.material.transparent || child.renderOrder) continue;
    const key = child.material.uuid + (child.castShadow ? ':s' : ':n') + (child.material.vertexColors ? ':vc' : '');
    let b = buckets.get(key);
    if (!b) { b = { mat: child.material, cast: child.castShadow, list: [] }; buckets.set(key, b); }
    b.list.push(child);
  }
  let merged = 0;
  for (const b of buckets.values()) {
    if (b.list.length < 2) continue;
    const geos = [];
    for (const m of b.list) {
      m.updateMatrix();
      let g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
      const keepAttrs = b.mat.vertexColors ? ['position', 'normal', 'uv', 'color'] : ['position', 'normal', 'uv'];
      for (const k of Object.keys(g.attributes)) if (!keepAttrs.includes(k)) g.deleteAttribute(k);
      if (b.mat.vertexColors && !g.attributes.color) g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(1), 3));
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      g.applyMatrix4(m.matrix);
      geos.push(g);
    }
    const geo = mergeGeometries(geos);
    if (!geo) continue;
    const mesh = new THREE.Mesh(geo, b.mat);
    mesh.castShadow = b.cast;
    mesh.receiveShadow = true;
    group.add(mesh);
    for (const m of b.list) group.remove(m);
    merged += b.list.length;
  }
  return merged;
}
