// Trees, rocks, bushes and grass for the overworld. SpeedTree-style: textured trunks and
// branches carrying alpha-tested leaf-cluster cards with rounded normals. Instanced and chunked.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mulberry32, createNoise2D } from '../core/noise.js';
import { forestDensity, roadDistance, isInSettlement, KVATCH_BURN, BRIDGE, LOCATIONS, distToSegment, chorrolPaving, snowCover, SNOW_GLSL } from './layout.js';
import * as TG from './texgen.js';

export const windUniform = { value: 0 };
// per-instance LOD: full trees collapse beyond uLodNear, impostors collapse inside it
export const lodUniforms = { uLodCam: { value: new THREE.Vector3() }, uLodNear: { value: 190 }, uLodFar: { value: 900 } };
const LOD_GLSL = {
  near: 'transformed *= step(distance(ip.xz, uLodCam.xz), uLodNear);',
  bush: 'transformed *= step(distance(ip.xz, uLodCam.xz), uLodNear * 0.75);',
  far: '{ float ld = distance(ip.xz, uLodCam.xz); transformed *= step(uLodNear - 8.0, ld) * step(ld, uLodFar); }',
  shadow: 'transformed *= step(distance(ip.xz, uLodCam.xz), 85.0);',
  view: 'transformed *= step(distance(ip.xz, uLodCam.xz), uLodFar);',
};

// ----------------------------------------------------------------- geometry helpers
function setColor(geo, fn) {
  const p = geo.attributes.position;
  const arr = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const [r, g, b] = fn(p.getX(i), p.getY(i), p.getZ(i), i);
    arr[i * 3] = r; arr[i * 3 + 1] = g; arr[i * 3 + 2] = b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

function clean(geo) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color', 'uv'].includes(k)) g.deleteAttribute(k);
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  if (!g.attributes.color) setColor(g, () => [1, 1, 1]);
  return g;
}

/** A tapered limb from a to b (Vector3s) with bark UVs. */
function limb(a, b, r0, r1, radial = 7, rand = Math.random) {
  const len = a.distanceTo(b);
  const g = new THREE.CylinderGeometry(r1, r0, len, radial, Math.max(1, Math.round(len / 1.5)), true);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2, uv.getY(i) * len / 2.5);
  // wobble
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    const k = (y / len + 0.5);
    p.setX(i, p.getX(i) + Math.sin(k * 5 + r0 * 9) * r0 * 0.15);
  }
  g.translate(0, len / 2, 0);
  const dir = new THREE.Vector3().subVectors(b, a).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  g.applyQuaternion(q);
  g.translate(a.x, a.y, a.z);
  g.computeVertexNormals();
  setColor(g, (x, y) => { const ao = Math.min(1, 0.55 + y * 0.08); return [ao, ao, ao]; });
  return clean(g);
}

/** A leaf card: quad centred at c, facing a random direction, normals bent away from crown centre. */
function card(c, size, crownCenter, rand, opts = {}) {
  const w = size * (opts.aspect || 1), h = size;
  const g = new THREE.PlaneGeometry(w, h);
  if (opts.droop) { g.translate(0, -h * 0.1, 0); }
  const yaw = rand() * Math.PI * 2;
  const tilt = opts.tilt ?? (rand() - 0.5) * 1.2;
  const roll = (rand() - 0.5) * 1.2;
  g.rotateZ(roll); g.rotateX(tilt); g.rotateY(yaw);
  g.translate(c.x, c.y, c.z);
  // rounded normals + fake AO (darker inside & underneath)
  const p = g.attributes.position, n = g.attributes.normal;
  const col = new Float32Array(p.count * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.set(p.getX(i), p.getY(i), p.getZ(i)).sub(crownCenter);
    const out = v.length();
    v.y *= 0.6;
    v.normalize();
    n.setXYZ(i, v.x * 0.8, v.y * 0.8 + 0.35, v.z * 0.8);
    const ao = THREE.MathUtils.clamp(0.42 + (out / (opts.crownR || 3)) * 0.45 + v.y * 0.18, 0.35, 1.05);
    col[i * 3] = ao; col[i * 3 + 1] = ao; col[i * 3 + 2] = ao;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return clean(g);
}

function finishTree(barkParts, leafParts) {
  const bark = mergeGeometries(barkParts);
  const leaves = leafParts.length ? mergeGeometries(leafParts) : null;
  const geo = leaves ? mergeGeometries([bark, leaves], true) : mergeGeometries([bark], true);
  geo.computeBoundingSphere();
  return geo;
}

// ----------------------------------------------------------------- tree species
export function broadleafGeometry(seed = 1, kind = 'oak') {
  const rand = mulberry32(seed);
  const bark = [], leaves = [];
  const H = kind === 'beech' ? 6.5 : 4.6;
  const top = new THREE.Vector3((rand() - 0.5) * 0.4, H, (rand() - 0.5) * 0.4);
  bark.push(limb(new THREE.Vector3(0, -0.5, 0), top, kind === 'beech' ? 0.36 : 0.5, 0.26, 9, rand));
  // root flare
  bark.push(limb(new THREE.Vector3(0, -0.4, 0), new THREE.Vector3(0, 0.9, 0), 0.85, 0.42, 9, rand));
  const crown = new THREE.Vector3(0, H + (kind === 'beech' ? 2.6 : 2.0), 0);
  const crownR = kind === 'beech' ? 2.9 : 3.6;
  const ends = [];
  const nb = kind === 'beech' ? 5 : 6;
  for (let i = 0; i < nb; i++) {
    const a = (i / nb) * Math.PI * 2 + rand() * 0.6;
    const start = new THREE.Vector3(top.x * 0.8, H * (0.62 + rand() * 0.38), top.z * 0.8);
    const reach = crownR * (0.7 + rand() * 0.35);
    const end = new THREE.Vector3(Math.cos(a) * reach, start.y + 1.4 + rand() * 1.8, Math.sin(a) * reach);
    bark.push(limb(start, end, 0.2, 0.06, 6, rand));
    ends.push(end);
  }
  // leaf clusters around branch ends and filling the crown
  const nCards = kind === 'beech' ? 46 : 56;
  for (let i = 0; i < nCards; i++) {
    let c;
    if (i < ends.length * 4) {
      const e = ends[i % ends.length];
      c = e.clone().add(new THREE.Vector3((rand() - 0.5) * 1.8, (rand() - 0.3) * 1.4, (rand() - 0.5) * 1.8));
    } else {
      const u = rand() * Math.PI * 2, v = Math.acos(rand() * 1.6 - 0.6), r = crownR * (0.55 + rand() * 0.45);
      c = new THREE.Vector3(Math.cos(u) * Math.sin(v) * r, Math.cos(v) * r * 0.75, Math.sin(u) * Math.sin(v) * r).add(crown);
    }
    leaves.push(card(c, 2.4 + rand() * 1.0, crown, rand, { crownR }));
  }
  return finishTree(bark, leaves);
}

export function pineGeometry(seed = 3) {
  const rand = mulberry32(seed);
  const bark = [], leaves = [], skirts = [];
  const H = 11;
  bark.push(limb(new THREE.Vector3(0, -0.5, 0), new THREE.Vector3(0, H, 0), 0.42, 0.08, 8, rand));
  const shade = (g, t, outwardScale) => {
    const p = g.attributes.position, nn = g.attributes.normal;
    const col = new Float32Array(p.count * 3);
    for (let k = 0; k < p.count; k++) {
      const x = p.getX(k), z = p.getZ(k);
      const r = Math.hypot(x, z) / outwardScale;
      const l = Math.hypot(x, z) || 1;
      nn.setXYZ(k, (x / l) * 0.7, 0.7, (z / l) * 0.7);
      const ao = THREE.MathUtils.clamp(0.5 + r * 0.45 + t * 0.25, 0.45, 1.1);
      col[k * 3] = ao; col[k * 3 + 1] = ao; col[k * 3 + 2] = ao;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return clean(g);
  };
  const whorls = 10;
  for (let w = 0; w < whorls; w++) {
    const t = w / whorls;
    const y = 2.2 + t * (H - 2.0);
    const len = 3.4 * (1 - t * 0.85) + 0.5;
    const n = 7 - Math.floor(t * 3);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + w * 0.7 + rand() * 0.4;
      // drooping branch card that faces sideways and up, so it reads from every angle
      const g = new THREE.PlaneGeometry(len, len * 0.75);
      g.translate(len / 2, 0, 0);
      g.rotateX(0.5 + rand() * 0.3);
      g.rotateZ(-0.38 - rand() * 0.2);
      g.rotateY(-a);
      g.translate(0, y, 0);
      leaves.push(shade(g, t, len));
    }
    // skirt: crossed vertical cards fill the silhouette between whorls
    for (let k = 0; k < 2; k++) {
      const g = new THREE.PlaneGeometry(len * 2.0, len * 1.0);
      g.rotateY(k * Math.PI / 2 + w * 0.4);
      g.translate(0, y - len * 0.3, 0);
      skirts.push(shade(g, t, len));
    }
  }
  for (let i = 0; i < 2; i++) {
    const g = new THREE.PlaneGeometry(1.6, 2.6);
    g.rotateY(i * Math.PI / 2);
    g.translate(0, H + 0.2, 0);
    skirts.push(shade(g, 1, 1));
  }
  const geo = mergeGeometries([mergeGeometries(bark), mergeGeometries(leaves), mergeGeometries(skirts)], true);
  geo.computeBoundingSphere();
  return geo;
}

export function deadTreeGeometry(seed = 5) {
  const rand = mulberry32(seed);
  const bark = [];
  const top = new THREE.Vector3(0.3, 5.5, -0.2);
  bark.push(limb(new THREE.Vector3(0, -0.4, 0), top, 0.38, 0.1, 7, rand));
  for (let i = 0; i < 5; i++) {
    const a = rand() * Math.PI * 2;
    const s = new THREE.Vector3(0.1, 2.2 + i * 0.7, 0);
    const e = s.clone().add(new THREE.Vector3(Math.cos(a) * 1.8, 1.0 + rand(), Math.sin(a) * 1.8));
    bark.push(limb(s, e, 0.1, 0.03, 5, rand));
  }
  const geo = mergeGeometries([mergeGeometries(bark)], true);
  return geo;
}

export function rockGeometry(seed = 1) {
  const g = new THREE.IcosahedronGeometry(1, 2);
  const rand = mulberry32(seed);
  const p = g.attributes.position;
  const nz = createNoise2D(seed);
  const map = new Map();
  for (let i = 0; i < p.count; i++) {
    const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
    if (!map.has(key)) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const d = 1 + nz(x * 1.7 + 3, z * 1.7 + y) * 0.22 + (rand() - 0.5) * 0.06;
      map.set(key, [x * d, Math.max(-0.4, y * d * 0.62), z * d]);
    }
    p.setXYZ(i, ...map.get(key));
  }
  g.computeVertexNormals();
  // planar uvs for the rock texture
  const uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) * 0.6 + p.getZ(i) * 0.3, p.getY(i) * 0.6);
  setColor(g, (x, y) => { const ao = 0.7 + y * 0.35; return [ao, ao, ao]; });
  return clean(g);
}

function bushGeometry(seed = 9) {
  const rand = mulberry32(seed);
  const leaves = [];
  const c = new THREE.Vector3(0, 0.6, 0);
  for (let i = 0; i < 12; i++) {
    const p = new THREE.Vector3((rand() - 0.5) * 1.2, 0.4 + rand() * 0.6, (rand() - 0.5) * 1.2);
    leaves.push(card(p, 1.1 + rand() * 0.5, c, rand, { crownR: 1 }));
  }
  return mergeGeometries([mergeGeometries(leaves)], true);
}

function grassGeometry() {
  // three crossed quads, normals up so they shade like the ground they grow from
  const parts = [];
  for (let i = 0; i < 3; i++) {
    const g = new THREE.PlaneGeometry(0.95, 0.66);
    g.translate(0, 0.25, 0);
    g.rotateY((i / 3) * Math.PI + 0.3);
    const n = g.attributes.normal;
    for (let k = 0; k < n.count; k++) n.setXYZ(k, 0, 1, 0);
    setColor(g, (x, y) => { const v = 0.85 + y * 0.35; return [v, v, v]; });
    parts.push(clean(g));
  }
  return mergeGeometries(parts);
}

// ----------------------------------------------------------------- materials
/** Inject wind sway into an instanced material, and optionally keep back faces lit like front faces. */
export function addWind(mat, strength = 0.02, base = 1.5, opts = {}) {
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader, r) => {
    prev?.call(mat, shader, r);
    shader.uniforms.uWind = windUniform;
    Object.assign(shader.uniforms, lodUniforms);
    shader.vertexShader = 'uniform float uWind;\nuniform vec3 uLodCam;\nuniform float uLodNear;\nuniform float uLodFar;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
      #else
        vec3 ip = vec3(0.0);
      #endif
      float sway = max(position.y - ${base.toFixed(2)}, 0.0) * ${strength.toFixed(4)};
      float gust = 0.6 + 0.4 * sin(uWind * 0.37 + ip.x * 0.013);
      transformed.x += sin(uWind * 1.3 + ip.x * 0.11 + ip.z * 0.07) * sway * gust;
      transformed.z += cos(uWind * 1.05 + ip.z * 0.09) * sway * 0.7 * gust;
      ${opts.flutter ? 'transformed += normal * sin(uWind * 6.0 + position.x * 3.0 + position.z * 2.0 + ip.x) * 0.04 * step(1.0, position.y);' : ''}
      ${opts.lod ? LOD_GLSL[opts.lod] : ''}`,
    );
    if (opts.twoSidedLight) {
      shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_begin>',
        THREE.ShaderChunk.normal_fragment_begin.replace('normal *= faceDirection;', ''));
    }
    if (opts.translucent) {
      // light passing through leaves: lift the shadowed side a little
      shader.fragmentShader = shader.fragmentShader.replace('#include <lights_fragment_end>',
        `#include <lights_fragment_end>
        reflectedLight.indirectDiffuse += diffuseColor.rgb * ${opts.translucent.toFixed(2)};`);
    }
  };
  return mat;
}

/**
 * Snow settles on whatever grows north of the snowline: heaviest on upward-facing surfaces, a frost
 * over everything else. amount scales it (impostors, whose normals all point up, take less).
 */
export function addSnow(mat, amount = 1) {
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader, r) => {
    prev?.call(mat, shader, r);
    shader.vertexShader = 'varying float vSnow;\n' + SNOW_GLSL + '\n' + shader.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
      {
        #ifdef USE_INSTANCING
          mat4 sm = modelMatrix * instanceMatrix;
        #else
          mat4 sm = modelMatrix;
        #endif
        vec3 swp = (sm * vec4(transformed, 1.0)).xyz;
        float up = normalize(mat3(sm) * objectNormal).y;
        vSnow = snowCover(swp) * clamp(0.42 + max(up, 0.0) * 0.55 + (swp.y - (sm * vec4(0.0, 0.0, 0.0, 1.0)).y) * 0.025, 0.0, 1.0) * ${amount.toFixed(2)};
      }`);
    shader.fragmentShader = 'varying float vSnow;\n' + shader.fragmentShader.replace('#include <alphatest_fragment>',
      `diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.9, 0.93, 0.98), clamp(vSnow, 0.0, 0.92));
      #include <alphatest_fragment>`);
  };
  const key = mat.customProgramCacheKey?.bind(mat);
  mat.customProgramCacheKey = () => (key ? key() : '') + '+snow';
  return mat;
}

function foliageMaterial(map, opts = {}) {
  const m = new THREE.MeshStandardMaterial({ map, alphaTest: opts.alphaTest ?? 0.45, side: THREE.DoubleSide, vertexColors: true, roughness: 0.85, metalness: 0 });
  addWind(m, opts.wind ?? 0.025, opts.base ?? 2.5, { twoSidedLight: true, translucent: opts.translucent ?? 0.12, flutter: opts.flutter, lod: opts.lod ?? 'near' });
  m.customProgramCacheKey = () => 'foliage' + (opts.key || '') + (opts.lod || 'near');
  return m;
}

function depthFor(map, alphaTest = 0.45) {
  const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map, alphaTest, side: THREE.DoubleSide });
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, lodUniforms);
    shader.vertexShader = 'uniform vec3 uLodCam;\n' + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
        ${LOD_GLSL.shadow}
      #endif`);
  };
  m.customProgramCacheKey = () => 'vegdepth' + alphaTest;
  return m;
}

let shared = null;
export function vegetationMaterials() {
  if (shared) return shared;
  const bark = TG.barkTex();
  const barkMat = addWind(new THREE.MeshStandardMaterial({ map: bark.map, normalMap: bark.normalMap, vertexColors: true, roughness: 0.95 }), 0.012, 3, { lod: 'near' });
  barkMat.customProgramCacheKey = () => 'bark';
  const darkBark = addWind(new THREE.MeshStandardMaterial({ map: bark.map, normalMap: bark.normalMap, color: 0x3a3430, vertexColors: true, roughness: 1 }), 0.0, 3, { lod: 'near' });
  darkBark.customProgramCacheKey = () => 'darkbark';
  const barkDepth = depthFor(null, 0);
  const oakLeaves = foliageMaterial(TG.leafTex('oak'), { key: 'oak', flutter: true });
  const beechLeaves = foliageMaterial(TG.leafTex('beech'), { key: 'beech', flutter: true });
  const needles = foliageMaterial(TG.needleTex(), { key: 'pine', alphaTest: 0.4, translucent: 0.06 });
  const skirt = foliageMaterial(TG.firSkirtTex(), { key: 'skirt', alphaTest: 0.4, translucent: 0.06 });
  const bushLeaves = foliageMaterial(TG.leafTex('bush'), { key: 'bush', wind: 0.06, base: 0.3, flutter: true, lod: 'bush' });
  const rock = TG.rockTex();
  const rockMat = addWind(new THREE.MeshStandardMaterial({ map: rock.map, normalMap: rock.normalMap, vertexColors: true, roughness: 0.95 }), 0, 100, { lod: 'view' });
  rockMat.customProgramCacheKey = () => 'rock';
  for (const m of [needles, skirt, oakLeaves, beechLeaves, bushLeaves]) addSnow(m, 0.9);
  addSnow(barkMat, 0.55);
  addSnow(darkBark, 0.55);
  addSnow(rockMat, 1);
  shared = {
    pine: [barkMat, needles, skirt], oak: [barkMat, oakLeaves], beech: [barkMat, beechLeaves], dead: [darkBark], bush: [bushLeaves], rock: rockMat,
    depth: { pine: depthFor(TG.needleTex(), 0.4), oak: depthFor(TG.leafTex('oak')), beech: depthFor(TG.leafTex('beech')), dead: barkDepth, rock: barkDepth },
  };
  return shared;
}

/** A single standalone tree mesh (used for landmark trees like Chorrol's Great Oak). */
const soloCache = new Map();
const soloGeo = new Map();
export function buildTreeMesh(kind = 'oak', scale = 1, seed = 42) {
  const mats = vegetationMaterials();
  const gk = kind + seed;
  if (!soloGeo.has(gk)) soloGeo.set(gk, kind === 'pine' ? pineGeometry(seed) : broadleafGeometry(seed, kind));
  const geo = soloGeo.get(gk);
  // landmark trees are not instanced, so they get LOD-free copies of the materials (shared per species)
  if (!soloCache.has(kind)) soloCache.set(kind, makeSolo(mats, kind));
  const { solo, depth } = soloCache.get(kind);
  const mesh = new THREE.Mesh(geo, solo);
  mesh.scale.setScalar(scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.customDepthMaterial = depth;
  return mesh;
}

function makeSolo(mats, kind) {
  const solo = mats[kind].map((m, i) => {
    const c = new THREE.MeshStandardMaterial({ map: m.map, normalMap: m.normalMap, alphaTest: m.alphaTest, side: m.side, vertexColors: true, roughness: m.roughness });
    addWind(c, i === 0 ? 0.004 : 0.01, 3, { twoSidedLight: i > 0, translucent: i > 0 ? 0.12 : 0 });
    c.customProgramCacheKey = () => 'solo' + i;
    return c;
  });
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: mats[kind][1].map, alphaTest: 0.45, side: THREE.DoubleSide });
  return { solo, depth };
}


/** Render a tree geometry from the side into a texture (albedo + baked AO) for distant billboards. */
function makeImpostor(renderer, geo, mats) {
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  const w = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z), hgt = bb.max.y - bb.min.y;
  const scene = new THREE.Scene();
  const list = Array.isArray(mats) ? mats : [mats];
  const basic = list.map((m) => new THREE.MeshBasicMaterial({ map: m.map, vertexColors: true, alphaTest: m.alphaTest || 0, side: THREE.DoubleSide, color: m.color }));
  const mesh = new THREE.Mesh(geo, Array.isArray(mats) ? basic : basic[0]);
  scene.add(mesh);
  const cam = new THREE.OrthographicCamera(-w / 2, w / 2, bb.max.y, bb.min.y, -50, 50);
  cam.position.set(0, 0, 20);
  cam.lookAt(0, 0, 0);
  const rt = new THREE.WebGLRenderTarget(256, Math.round(256 * hgt / w), { samples: 0, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
  const prevTarget = renderer.getRenderTarget();
  const prevClear = renderer.getClearColor(new THREE.Color()), prevAlpha = renderer.getClearAlpha();
  renderer.setRenderTarget(rt);
  renderer.setClearColor(0x3a4a2a, 0);
  renderer.clear();
  renderer.render(scene, cam);
  renderer.setRenderTarget(prevTarget);
  renderer.setClearColor(prevClear, prevAlpha);
  basic.forEach((b) => b.dispose());
  // crossed quads sized like the tree
  const parts = [];
  for (let i = 0; i < 2; i++) {
    const g = new THREE.PlaneGeometry(w, hgt);
    g.translate(0, (bb.min.y + bb.max.y) / 2, 0);
    g.rotateY(i * Math.PI / 2);
    const n = g.attributes.normal;
    for (let k = 0; k < n.count; k++) n.setXYZ(k, 0, 1, 0);
    parts.push(g);
  }
  const quad = mergeGeometries(parts);
  const mat = new THREE.MeshStandardMaterial({ map: rt.texture, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 1 });
  return { geo: quad, mat, texture: rt.texture };
}

export function buildVegetation(terrain, collision, parent, renderer = null) {
  const group = new THREE.Group();
  group.name = 'vegetation';
  parent.add(group);
  const rand = mulberry32(777);
  const mats = vegetationMaterials();

  // a few variants per species so forests don't look cloned
  const variants = {
    pine: [pineGeometry(3), pineGeometry(4), pineGeometry(5)],
    oak: [broadleafGeometry(1, 'oak'), broadleafGeometry(2, 'oak'), broadleafGeometry(7, 'oak')],
    beech: [broadleafGeometry(11, 'beech'), broadleafGeometry(12, 'beech')],
    dead: [deadTreeGeometry(5), deadTreeGeometry(6)],
    rock: [rockGeometry(5), rockGeometry(8), rockGeometry(13)],
    bush: [bushGeometry(9), bushGeometry(10)],
  };

  const buckets = new Map(); // "type:variant" -> [[matrix, color]]
  const push = (type, x, z, m, color) => {
    const v = Math.floor(rand() * variants[type].length);
    const key = type + ':' + v;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push([m, color]);
  };

  const keepClear = [
    ...Object.values(LOCATIONS).map((l) => [l.x, l.z, 18]),
    [LOCATIONS.chorrol.x, LOCATIONS.chorrol.z, 95],
    [LOCATIONS.wintersmeet.x, LOCATIONS.wintersmeet.z, 46],
  ];
  const clear = (x, z) => keepClear.some(([cx, cz, r]) => Math.hypot(x - cx, z - cz) < r)
    || distToSegment(x, z, BRIDGE.x0, BRIDGE.z0, BRIDGE.x1, BRIDGE.z1) < 8;

  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const col = new THREE.Color();
  const up = new THREE.Vector3(0, 1, 0);
  const step = 8;
  let treeCount = 0;
  for (let gx = -700; gx < 700; gx += step) {
    for (let gz = -700; gz < 700; gz += step) {
      const x = gx + rand() * step, z = gz + rand() * step;
      const r = rand();
      const h = terrain.heightAt(x, z);
      if (h < 1.2) continue;
      const ny = terrain.normalAt(x, z).y;
      const dens = forestDensity(x, z);
      const burnD = Math.hypot(x - KVATCH_BURN.x, z - KVATCH_BURN.z);
      const nearRoad = roadDistance(x, z);
      if (nearRoad < 6 || isInSettlement(x, z, 6) || clear(x, z)) continue;

      const cover = snowCover(x, z, h);
      if (r < dens * 0.5 + 0.04 + cover * 0.1 && ny > 0.8 && h < 150) {
        let type = h > 55 || rand() < 0.4 + cover * 0.55 ? 'pine' : rand() < 0.6 ? 'oak' : 'beech';
        if (burnD < KVATCH_BURN.r) type = rand() < 0.7 ? 'dead' : 'pine';
        const sc = 0.75 + rand() * 0.55;
        q.setFromAxisAngle(up, rand() * Math.PI * 2);
        s.set(sc, sc * (0.9 + rand() * 0.25), sc);
        p.set(x, h - 0.15, z);
        m.compose(p, q, s);
        // per-tree hue/brightness variation, autumn tints on a few broadleaves
        col.setHSL(0.24 + (rand() - 0.5) * 0.05, 0.15 + rand() * 0.15, 0.82 + rand() * 0.18);
        if ((type === 'oak' || type === 'beech') && rand() < 0.08) col.setRGB(1.15, 0.9, 0.6);
        if (type === 'dead') col.setRGB(1, 1, 1);
        push(type, x, z, m.clone(), col.clone());
        collision.addCircle(x, z, (type === 'pine' ? 0.32 : 0.45) * sc, h - 1, h + 6, { walkable: false });
        treeCount++;
      } else if (r > 0.95 || (ny < 0.8 && r > 0.78)) {
        const sc = 0.5 + rand() * (ny < 0.8 ? 2.6 : 1.3);
        q.setFromEuler(new THREE.Euler(rand() * 0.4, rand() * 6.28, rand() * 0.4));
        s.set(sc * (0.8 + rand() * 0.6), sc, sc * (0.8 + rand() * 0.6));
        p.set(x, h - sc * 0.15, z);
        m.compose(p, q, s);
        const t = 0.85 + rand() * 0.25;
        col.setRGB(t, t * 0.98, t * 0.94);
        if (burnD < KVATCH_BURN.r) col.multiplyScalar(0.55);
        push('rock', x, z, m.clone(), col.clone());
        if (sc > 0.7) collision.addCircle(x, z, sc * 0.95, h - 2, h + sc * 0.55, { walkable: true });
      } else if (r > 0.85 && dens > 0.15 && burnD > KVATCH_BURN.r) {
        const sc = 0.8 + rand() * 0.9;
        q.setFromAxisAngle(up, rand() * 6.28);
        s.set(sc, sc * (0.8 + rand() * 0.4), sc);
        p.set(x, h - 0.1, z);
        m.compose(p, q, s);
        col.setHSL(0.23 + rand() * 0.05, 0.2, 0.8 + rand() * 0.2);
        push('bush', x, z, m.clone(), col.clone());
      }
    }
  }

  // impostors for each tree variant
  const impostors = {};
  if (renderer) {
    for (const type of ['pine', 'oak', 'beech', 'dead']) {
      impostors[type] = variants[type].map((g) => makeImpostor(renderer, g, mats[type]));
    }
  }
  for (const typeImps of Object.values(impostors)) for (const imp of typeImps) {
    addWind(imp.mat, 0.0, 100, { lod: 'far' });
    imp.mat.customProgramCacheKey = () => 'impostor';
    addSnow(imp.mat, 0.6);
  }
  const meshes = [];
  const instanced = (geo, mat, list) => {
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach(([mm, cc], i) => { im.setMatrixAt(i, mm); im.setColorAt(i, cc); });
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.frustumCulled = false; // spans the whole map; per-instance LOD happens in the shader
    im.receiveShadow = true;
    group.add(im);
    meshes.push(im);
    return im;
  };
  // full-detail trees: a dynamic subset near the camera, refreshed as the player travels
  const nearSets = [];
  for (const [key, list] of buckets) {
    const [type, v] = key.split(':');
    const im = instanced(variants[type][+v], mats[type], list);
    im.castShadow = type !== 'bush';
    if (mats.depth[type]) im.customDepthMaterial = mats.depth[type];
    const imp = impostors[type]?.[+v];
    if (imp) instanced(imp.geo, imp.mat, list).castShadow = false;
    if (type !== 'rock') {
      const pos = new Float32Array(list.length * 2);
      list.forEach(([mm], i) => { pos[i * 2] = mm.elements[12]; pos[i * 2 + 1] = mm.elements[14]; });
      nearSets.push({ im, list, pos, radius: type === 'bush' ? 160 : 215 });
      im.count = 0;
    }
  }
  let nearCenter = null;
  function rebuildNear(cx, cz) {
    for (const ns of nearSets) {
      let n = 0;
      const r2 = ns.radius * ns.radius;
      for (let i = 0; i < ns.list.length; i++) {
        const dx = ns.pos[i * 2] - cx, dz = ns.pos[i * 2 + 1] - cz;
        if (dx * dx + dz * dz > r2) continue;
        ns.im.setMatrixAt(n, ns.list[i][0]);
        ns.im.setColorAt(n, ns.list[i][1]);
        n++;
      }
      ns.im.count = n;
      ns.im.instanceMatrix.needsUpdate = true;
      if (ns.im.instanceColor) ns.im.instanceColor.needsUpdate = true;
    }
  }

  // ---- grass & flowers that follow the camera ----
  const grassGeo = grassGeometry();
  const grassMat = new THREE.MeshStandardMaterial({ map: TG.grassBladeTex(), alphaTest: 0.38, side: THREE.DoubleSide, vertexColors: true, roughness: 1 });
  const flowerMat = new THREE.MeshStandardMaterial({ map: TG.flowerTex(), alphaTest: 0.4, side: THREE.DoubleSide, vertexColors: true, roughness: 1 });
  for (const gm of [grassMat, flowerMat]) {
    addWind(gm, 0.25, 0.05, { twoSidedLight: true, translucent: 0.1 });
    const prev = gm.onBeforeCompile;
    gm.onBeforeCompile = (shader, r) => {
      prev(shader, r);
      shader.uniforms.uCam = grassCam;
      shader.vertexShader = 'uniform vec3 uCam;\n' + shader.vertexShader.replace(
        '#include <project_vertex>',
        `{
          vec3 ipos = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
          float fade = smoothstep(58.0, 40.0, distance(ipos.xz, uCam.xz));
          transformed.y *= fade;
          transformed.xz *= mix(0.6, 1.0, fade);
        }
        #include <project_vertex>`,
      );
    };
    gm.customProgramCacheKey = () => 'grass' + (gm === flowerMat ? 'f' : 'g');
  }
  const GRASS_MAX = 22000, FLOWER_MAX = 2500;
  const grass = new THREE.InstancedMesh(grassGeo, grassMat, GRASS_MAX);
  const flowers = new THREE.InstancedMesh(grassGeo, flowerMat, FLOWER_MAX);
  for (const g of [grass, flowers]) { g.frustumCulled = false; g.receiveShadow = true; g.count = 0; group.add(g); }
  const grassNoise = createNoise2D(99);
  let grassCenter = null;

  function rebuildGrass(cx, cz) {
    let i = 0, f = 0;
    const spacing = 0.85;
    const R = 58;
    const x0 = Math.floor((cx - R) / spacing), x1 = Math.floor((cx + R) / spacing);
    const z0 = Math.floor((cz - R) / spacing), z1 = Math.floor((cz + R) / spacing);
    for (let ix = x0; ix <= x1 && i < GRASS_MAX; ix++) {
      for (let iz = z0; iz <= z1 && i < GRASS_MAX; iz++) {
        let hsh = (ix * 374761393 + iz * 668265263) >>> 0;
        hsh = ((hsh ^ (hsh >>> 13)) * 1274126177) >>> 0;
        const r1 = (hsh & 0xffff) / 65536, r2 = ((hsh >>> 16) & 0xffff) / 65536;
        const x = (ix + r1) * spacing, z = (iz + r2) * spacing;
        if ((x - cx) ** 2 + (z - cz) ** 2 > R * R) continue;
        const patch = grassNoise(x / 16, z / 16);
        if (patch < -0.3 + r1 * 0.35) continue;
        if (r2 > (globalThis.__game?.grassDensity ?? 1)) continue;
        const h = terrain.heightAt(x, z);
        if (h < 1.0 || h > 75) continue;
        if (roadDistance(x, z) < 3.4) continue;
        if (Math.hypot(x - KVATCH_BURN.x, z - KVATCH_BURN.z) < KVATCH_BURN.r * 0.8 && r2 > 0.15) continue;
        if (isInSettlement(x, z, -14) && r2 > 0.25) continue;
        if (chorrolPaving(x, z) > 0.3) continue;
        // under the snow only a few dry stalks poke through
        const sn = snowCover(x, z, h);
        if (sn > 0.25 && (r1 > (1 - sn) * 0.6 + 0.02 || isInSettlement(x, z, 8))) continue;
        const sc = 0.7 + r2 * 0.75 + Math.max(0, patch) * 0.4;
        q.setFromAxisAngle(up, r1 * 6.28);
        s.set(sc, sc * (0.75 + patch * 0.35), sc);
        p.set(x, h - 0.06, z);
        m.compose(p, q, s);
        const isFlower = r1 > 0.93 && patch > 0.1 && f < FLOWER_MAX && sn < 0.2;
        col.setHSL(0.18 + patch * 0.03 + r2 * 0.02, 0.25, 0.62 + r1 * 0.12);
        // the few stalks that poke through the snow are dry and straw-pale
        if (sn > 0.2) col.lerp(_straw.setRGB(1.35, 1.12, 0.62), Math.min(1, sn * 1.4));
        if (isFlower) { flowers.setMatrixAt(f, m); flowers.setColorAt(f, col.setRGB(1, 1, 1)); f++; }
        else { grass.setMatrixAt(i, m); grass.setColorAt(i, col); i++; }
      }
    }
    grass.count = i; flowers.count = f;
    for (const g of [grass, flowers]) {
      g.instanceMatrix.needsUpdate = true;
      if (g.instanceColor) g.instanceColor.needsUpdate = true;
    }
  }

  return {
    group,
    treeCount,
    grassMeshes: [grass, flowers],
    /** objects worth skipping in the lake reflection */
    reflectionHide() { return [grass, flowers]; },
    update(camPos, t, viewDist = 650) {
      windUniform.value = t;
      grassCam.value.copy(camPos);
      if (!grassCenter || Math.hypot(camPos.x - grassCenter.x, camPos.z - grassCenter.z) > 10) {
        grassCenter = { x: camPos.x, z: camPos.z };
        rebuildGrass(camPos.x, camPos.z);
      }
      lodUniforms.uLodCam.value.copy(camPos);
      lodUniforms.uLodFar.value = viewDist + 120;
      if (!nearCenter || Math.hypot(camPos.x - nearCenter.x, camPos.z - nearCenter.z) > 15) {
        nearCenter = { x: camPos.x, z: camPos.z };
        rebuildNear(camPos.x, camPos.z);
      }
    },
  };
}

const grassCam = { value: new THREE.Vector3() };
const _straw = new THREE.Color();
