// The Deadlands: a hellish plane beyond the Kvatch gate, with lava seas and a Sigil Tower.
import * as THREE from 'three';
import { createNoise2D, ridged, fbm, smoothstep, lerp } from '../core/noise.js';
import { Terrain } from './terrain.js';
import { M } from './builder.js';
import * as TX from './textures.js';
import * as TG from './texgen.js';
import { portalMaterial } from './structures.js';

const noise = createNoise2D(666);
export const OB = {
  start: { x: 0, z: 150 },
  tower: { x: 0, z: -125 },
  lava: 0,
};

/** Winding path centre-line x for a given z. */
export function pathX(z) {
  return Math.sin(z / 38) * 22 + Math.sin(z / 13) * 4;
}

export function obHeight(x, z) {
  let h = 2 + ridged(noise, x / 70, z / 70, 4) * 22 - 6;
  h += fbm(noise, x / 25 + 3, z / 25, 3) * 3;
  // path from start to tower stays above lava
  if (z < OB.start.z + 20 && z > OB.tower.z - 30) {
    const d = Math.abs(x - pathX(z));
    const t = smoothstep(14, 5, d);
    h = lerp(h, Math.max(h, 5 + Math.sin(z / 20) * 2), t);
  }
  // plateaus at start and tower
  const ds = Math.hypot(x - OB.start.x, z - OB.start.z);
  h = lerp(h, 6, smoothstep(26, 14, ds));
  const dt = Math.hypot(x - OB.tower.x, z - OB.tower.z);
  h = lerp(h, 8, smoothstep(40, 26, dt));
  // edge of the island falls into the lava sea
  const r = Math.hypot(x, z * 0.8);
  h = lerp(h, -12, smoothstep(150, 200, r));
  return h;
}

function obColor(x, z, h, ny, out) {
  const n = fbm(noise, x / 9, z / 9, 2);
  let r = 0.62 + n * 0.12, g = 0.4 + n * 0.06, b = 0.36;
  if (ny < 0.8) { r = 0.48; g = 0.32; b = 0.3; }
  if (h < 1.2) { const t = smoothstep(1.2, 0.2, h); r = lerp(r, 0.9, t); g = lerp(g, 0.35, t); b = lerp(b, 0.05, t); }
  const d = Math.abs(x - pathX(z));
  if (d < 3 && z < OB.start.z && z > OB.tower.z) { r *= 1.25; g *= 1.15; }
  out[0] = r; out[1] = g; out[2] = b;
}

export function buildOblivion(b, state) {
  const terrain = new Terrain({
    size: 460, seg: 184, heightFn: obHeight, colorFn: obColor,
    material: (() => { const t = TG.obrockTex(); return new THREE.MeshStandardMaterial({ vertexColors: true, map: t.map, normalMap: t.normalMap, emissiveMap: t.emissiveMap, emissive: 0xff4010, emissiveIntensity: 1.4, roughness: 0.88 }); })(),
    detailRepeat: 8,
  });
  b.add(terrain.mesh);
  state.terrain = terrain;

  // lava sea
  const lavaTex = TX.lava().clone();
  lavaTex.needsUpdate = true;
  lavaTex.repeat.set(30, 30);
  const lava = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshBasicMaterial({ map: lavaTex, color: 0xffffff }));
  lava.rotation.x = -Math.PI / 2;
  lava.position.y = OB.lava;
  b.add(lava);
  state.lavaTex = lavaTex;

  const H = (x, z) => terrain.heightAt(x, z);
  const rock = M('obrock');

  // return portal
  {
    const { x, z } = OB.start;
    const h0 = H(x, z - 6);
    const g = new THREE.Group();
    g.position.set(x, h0, z + 6);
    b.add(g);
    for (const s of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.2, 9, 7), rock);
      p.position.set(s * 4, 4.5, 0);
      p.rotation.z = -s * 0.2;
      g.add(p);
    }
    const portal = new THREE.Mesh(new THREE.CircleGeometry(3.6, 40), portalMaterial(0xff7020, 0x500800));
    portal.position.y = 4.4;
    portal.scale.y = 1.25;
    portal.rotation.y = Math.PI;
    g.add(portal);
    state.portalMats = [portal.material];
    b.col.addBox(x, z + 6, 4.5, 0.8, 0, h0 - 1, h0 + 9);
    b.interact({ kind: 'returnportal', name: 'Oblivion Gate (return to Tamriel)', pos: new THREE.Vector3(x, h0 + 1.5, z + 4.5), radius: 2.4, verb: 'Enter' });
    b.light(0xff5010, 40, 25, x, h0 + 4, z + 4);
  }

  // jagged spires
  const rand = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  for (let i = 0; i < 70; i++) {
    const x = (rand() - 0.5) * 360, z = (rand() - 0.5) * 360;
    if (Math.abs(x - pathX(z)) < 12) continue;
    if (Math.hypot(x - OB.tower.x, z - OB.tower.z) < 35) continue;
    const h0 = H(x, z);
    if (h0 < -2) continue;
    const hh = 6 + rand() * 22;
    const sp = new THREE.Mesh(new THREE.ConeGeometry(1 + rand() * 2.5, hh, 5), rock);
    sp.position.set(x, h0 + hh / 2 - 0.5, z);
    sp.rotation.set((rand() - 0.5) * 0.3, rand() * 6, (rand() - 0.5) * 0.3);
    sp.castShadow = true;
    b.add(sp);
    b.col.addCircle(x, z, 1.2, h0 - 2, h0 + hh * 0.6, { walkable: false });
  }

  // braziers along the path
  for (let z = OB.start.z - 30; z > OB.tower.z + 30; z -= 45) {
    for (const s of [-1, 1]) {
      const x = pathX(z) + s * 6;
      const h0 = H(x, z);
      b.cyl(0.5, 0.3, 1.6, 'iron', x, h0 + 0.8, z, { seg: 8 });
      b.emitter('flame', x, h0 + 1.65, z, 14, { color: 0xff4010 });
      if (s > 0) b.light(0xff4010, 26, 18, x, h0 + 2.4, z);
    }
  }

  // the Sigil Tower
  {
    const { x, z } = OB.tower;
    const h0 = H(x, z);
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(8, 13, 80, 10), rock);
    tower.position.set(x, h0 + 40, z);
    tower.castShadow = true;
    b.add(tower);
    b.col.addCircle(x, z, 12.5, h0 - 2, h0 + 82, { walkable: false });
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2;
      const yy = 8 + (k % 5) * 14;
      const sp = new THREE.Mesh(new THREE.ConeGeometry(1.2, 9, 5), rock);
      const r = 13 - yy / 80 * 5;
      sp.position.set(x + Math.cos(a) * r, h0 + yy, z + Math.sin(a) * r);
      sp.rotation.z = -Math.cos(a) * 1.2;
      sp.rotation.x = Math.sin(a) * 1.2;
      b.add(sp);
    }
    // crown + fire beam
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(11, 8, 6, 10), rock);
    crown.position.set(x, h0 + 82, z);
    b.add(crown);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2.5, 400, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xff6020, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
    beam.position.set(x, h0 + 285, z);
    b.add(beam);
    state.beam = beam;
    // door (south face, toward the path)
    const dz = z + 12.2;
    b.box(4.5, 6, 1.2, 'dark', x, h0 + 3, dz, 0, { collide: false });
    const arch = new THREE.Mesh(new THREE.TorusGeometry(2.8, 0.5, 6, 12, Math.PI), rock);
    arch.position.set(x, h0 + 5.6, dz + 0.4);
    b.add(arch);
    b.light(0xff5010, 30, 20, x, h0 + 4, dz + 3);
    b.interact({ kind: 'door', cell: 'sigil', name: 'Sigil Keep', pos: new THREE.Vector3(x, h0 + 1.5, dz + 1.2), radius: 2.2, verb: 'Enter' });
    state.towerDoor = { x, z: dz + 3, yaw: 0 };
  }

  // ember emitters scattered
  for (let i = 0; i < 10; i++) {
    const x = (rand() - 0.5) * 300, z = (rand() - 0.5) * 300;
    b.emitter('ember', x, 0.5, z, 6, { range: 200 });
  }
  return terrain;
}

export const OB_SPAWNS = [
  { x: pathX(110), z: 110, count: 1 },
  { x: pathX(70), z: 70, count: 2 },
  { x: pathX(25), z: 25, count: 2 },
  { x: pathX(-20), z: -20, count: 2 },
  { x: pathX(-60), z: -60, count: 2 },
  { x: pathX(-95), z: -95, count: 2 },
];
