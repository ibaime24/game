// Living weapons: the conjured Flame Blade burns with real flames along its length and spits embers;
// the Storm Blade crawls with lightning and twinkles with star-glints. Effects ride the weapon mesh, so
// they work in the first-person hands and on the third-person model alike.
import * as THREE from 'three';
import { buildCarriedFlame } from './flames.js';
import { magicTextures, setLinePoints } from './magic.js';

const active = new Set();
const r = Math.random;
const _v = new THREE.Vector3(), _c = new THREE.Color();

function attached(o) {
  while (o.parent) o = o.parent;
  return o.isScene;
}

/** Dress a weapon mesh in its element. world: emit particles into the world (third person). */
export function attachBladeFx(mesh, look, { world = false } = {}) {
  if (!look?.fx || !mesh) return null;
  const len = look.len || 1;
  const fx = { mesh, kind: look.fx, len, world, t: 0, acc: 0, flames: [], parts: [] };
  if (fx.kind === 'fire') {
    // tongues of flame climbing the blade, biggest near the guard
    for (let k = 0; k < 5; k++) {
      const y = 0.2 + (k / 4) * (len * 0.92 - 0.2);
      const f = buildCarriedFlame(0.085 - k * 0.009, { halo: 2.4 });
      f.position.set(0, y - 0.03, 0);
      mesh.add(f);
      fx.flames.push(f);
    }
  } else if (fx.kind === 'shock') {
    const T = magicTextures();
    const mk = (color, opacity) => new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    fx.arcs = mk(0xf0f6ff, 1);
    fx.glow = mk(0x8ab8ff, 0.9);
    fx.arcs.frustumCulled = fx.glow.frustumCulled = false;
    mesh.add(fx.arcs, fx.glow);
    fx.stars = [];
    for (let k = 0; k < 4; k++) {
      const st = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.star, color: new THREE.Color(0.75, 0.88, 1.0), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      st.scale.setScalar(0.22);
      mesh.add(st);
      fx.stars.push(st);
    }
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow, color: new THREE.Color(0.35, 0.5, 1.0), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    halo.scale.set(0.35, len * 1.1, 1);
    halo.position.y = len * 0.55;
    mesh.add(halo);
    fx.halo = halo;
  }
  else if (UNIQUE[fx.kind]) {
    // legendary blades: a soft aura along the blade, and their own sprites
    const U = UNIQUE[fx.kind];
    const T = magicTextures();
    const aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow, color: new THREE.Color(...U.aura), transparent: true, opacity: U.auraOpacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    aura.scale.set(0.28, len * 1.15, 1);
    aura.position.y = 0.1 + len * 0.5;
    mesh.add(aura);
    fx.halo = aura;
    fx.stars = [];
    for (let k = 0; k < U.stars; k++) {
      const st = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.star, color: new THREE.Color(...U.star), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      const t = (k + 0.5) / U.stars;
      // starfang's stars sit along its curve; the others wander
      st.position.set(fx.kind === 'star' ? Math.pow(t, 2) * 0.07 : 0, 0.15 + t * len * 0.85, 0.01);
      st.scale.setScalar(0.12);
      st.userData.ph = k * 1.7;
      mesh.add(st);
      fx.stars.push(st);
    }
  }
  active.add(fx);
  return fx;
}

// the legendary swords: aura colour, star-glints and what drifts off the blade
const UNIQUE = {
  sun: { aura: [1.0, 0.75, 0.3], auraOpacity: 0.45, star: [1.0, 0.92, 0.7], stars: 2, light: 0xffc060, rate: 14,
    emit: (p, v, c) => p.emit({ x: v.x, y: v.y, z: v.z, vx: (r() - 0.5) * 0.4, vy: 0.6 + r() * 0.8, vz: (r() - 0.5) * 0.4, drag: 0.5, life: 0.9 + r() * 0.6, size: r() < 0.2 ? 0.32 : 0.08, color: c.setRGB(1, 0.8 + r() * 0.2, 0.4), shape: r() < 0.2 ? 'star' : 'pixel' }) },
  star: { aura: [0.35, 0.5, 1.0], auraOpacity: 0.35, star: [0.8, 0.9, 1.0], stars: 5, light: 0x8ab0ff, rate: 6,
    emit: (p, v, c) => p.emit({ x: v.x, y: v.y, z: v.z, vx: (r() - 0.5) * 0.3, vy: 0.2 + r() * 0.3, vz: (r() - 0.5) * 0.3, drag: 0.4, life: 1.2 + r(), size: 0.18 + r() * 0.12, color: c.setRGB(0.75, 0.85, 1), shape: 'star' }) },
  frost: { aura: [0.55, 0.85, 1.0], auraOpacity: 0.35, star: [0.85, 0.95, 1.0], stars: 1, light: 0x9ad8ff, rate: 12,
    emit: (p, v, c) => r() < 0.4
      ? p.emit({ x: v.x, y: v.y, z: v.z, vx: (r() - 0.5) * 0.2, vy: -0.4 - r() * 0.3, vz: (r() - 0.5) * 0.2, drag: 0.8, life: 1.4, size: 0.16, color: c.setRGB(0.85, 0.95, 1), shape: 'flake' })
      : p.emit({ x: v.x, y: v.y, z: v.z, vx: (r() - 0.5) * 0.2, vy: -0.3, vz: (r() - 0.5) * 0.2, drag: 1, life: 1.2, size: 0.35, grow: 1.4, color: c.setRGB(0.7, 0.85, 1), alpha: 0.2 }, false) },
  thorn: { aura: [0.5, 1.0, 0.45], auraOpacity: 0.28, star: [1.0, 0.75, 0.9], stars: 1, light: 0x8aff8a, rate: 5,
    emit: (p, v, c) => p.emit({ x: v.x, y: v.y, z: v.z, vx: (r() - 0.5) * 0.6, vy: -0.15 - r() * 0.2, vz: (r() - 0.5) * 0.6, drag: 0.6, life: 2.2, size: 0.1, color: r() < 0.5 ? c.setRGB(1, 0.6, 0.85) : c.setRGB(0.45, 0.85, 0.35), shape: 'pixel', spin: (r() - 0.5) * 6 }) },
  void: { aura: [1.0, 0.15, 0.08], auraOpacity: 0.4, star: [1.0, 0.4, 0.3], stars: 0, light: 0xff3020, rate: 12,
    emit: (p, v, c) => r() < 0.35
      ? p.emit({ x: v.x, y: v.y, z: v.z, vx: (r() - 0.5) * 2, vy: (r() - 0.5) * 2, vz: (r() - 0.5) * 2, drag: 4, life: 0.25, size: 0.08, color: c.setRGB(1, 0.3, 0.15), shape: 'pixel' })
      : p.emit({ x: v.x, y: v.y, z: v.z, vx: (r() - 0.5) * 0.2, vy: 0.3 + r() * 0.3, vz: (r() - 0.5) * 0.2, drag: 0.5, life: 1.3, size: 0.3, grow: 1.6, color: c.setRGB(0.08, 0.02, 0.04), alpha: 0.5 }, false) },
};

function regenArcs(fx) {
  const len = fx.len;
  for (const [line, spread] of [[fx.arcs, 0.07], [fx.glow, 0.11]]) {
    const pts = [];
    for (let a = 0; a < 5; a++) {
      // each arc zig-zags up a stretch of the blade, hugging it
      let y = 0.15 + r() * len * 0.5;
      let p = new THREE.Vector3((r() - 0.5) * 0.04, y, (r() - 0.5) * 0.04);
      const steps = 4 + Math.floor(r() * 4);
      for (let s = 0; s < steps; s++) {
        y = Math.min(len * 0.98, y + 0.06 + r() * 0.1);
        const q = new THREE.Vector3((r() - 0.5) * spread * 2, y, (r() - 0.5) * spread * 2);
        pts.push(p, q);
        p = q;
      }
      // one arc reaches out into the air
      if (r() < 0.5) pts.push(p, p.clone().add(new THREE.Vector3((r() - 0.5) * 0.4, r() * 0.2, (r() - 0.5) * 0.4)));
    }
    setLinePoints(line, pts);
  }
}

/** Animate every live blade. tipLight: an optional point light to place at the player's blade. */
export function updateBladeFx(t, dt, particles) {
  for (const fx of active) {
    if (!attached(fx.mesh)) {
      fx.mesh.traverse((o) => { if (o !== fx.mesh && o.material && (o.isLineSegments || o.isSprite)) { o.geometry?.dispose?.(); o.material.dispose?.(); } });
      active.delete(fx);
      continue;
    }
    fx.t += dt;
    if (!fx.mesh.visible) continue;
    if (fx.kind === 'fire') {
      for (const f of fx.flames) { f.userData.uniforms.uTime.value = t; f.userData.uniforms.uNight.value = 1; }
    } else if (UNIQUE[fx.kind]) {
      fx.halo.material.opacity = UNIQUE[fx.kind].auraOpacity * (0.8 + Math.sin(fx.t * 2.3) * 0.2);
      for (const st of fx.stars) {
        const tw = Math.max(0, Math.sin(fx.t * 2.6 + st.userData.ph));
        st.material.opacity = 0.25 + tw * 0.75;
        st.scale.setScalar(0.06 + tw * 0.11);
        st.material.rotation += dt * 0.8;
        if (fx.kind !== 'star' && tw < 0.02) st.position.set((r() - 0.5) * 0.04, 0.15 + r() * fx.len * 0.85, 0.01);
      }
    } else if (fx.kind === 'shock') {
      fx.acc += dt;
      if (fx.acc > 0.05) { fx.acc = 0; regenArcs(fx); }
      for (const st of fx.stars) {
        if (r() < dt * 6) st.position.set((r() - 0.5) * 0.08, 0.2 + r() * fx.len * 0.78, (r() - 0.5) * 0.08);
        st.material.opacity = 0.4 + Math.abs(Math.sin(fx.t * 23 + st.id)) * 0.6;
        st.material.rotation += dt * 4;
      }
      fx.halo.material.opacity = 0.35 + r() * 0.3;
    }
    // embers and sparks fly off the blade into the world (third person only: the first-person hands live in their own scene)
    if (fx.world && particles && UNIQUE[fx.kind]) {
      if (r() < dt * UNIQUE[fx.kind].rate) { fx.mesh.localToWorld(_v.set((r() - 0.5) * 0.05, 0.2 + r() * fx.len * 0.8, 0)); UNIQUE[fx.kind].emit(particles, _v, _c); }
    } else if (fx.world && particles && r() < dt * (fx.kind === 'fire' ? 16 : 12)) {
      fx.mesh.localToWorld(_v.set((r() - 0.5) * 0.05, 0.2 + r() * fx.len * 0.8, 0));
      if (fx.kind === 'fire') particles.emit({ x: _v.x, y: _v.y, z: _v.z, vx: (r() - 0.5) * 0.8, vy: 1 + r() * 1.5, vz: (r() - 0.5) * 0.8, gravity: -0.4, drag: 0.8, life: 0.6 + r() * 0.6, size: r() < 0.25 ? 0.3 : 0.07, color: _c.set(r() < 0.5 ? 0xffb040 : 0xff6a10), shape: r() < 0.25 ? 'star' : 'pixel' });
      else particles.emit({ x: _v.x, y: _v.y, z: _v.z, vx: (r() - 0.5) * 4, vy: (r() - 0.5) * 4, vz: (r() - 0.5) * 4, drag: 5, life: 0.18 + r() * 0.15, size: r() < 0.3 ? 0.28 : 0.08, color: _c.set(r() < 0.5 ? 0xffffff : 0x9ac8ff), shape: r() < 0.3 ? 'star' : 'pixel' });
    }
  }
}

/** The kind of blade the player is holding, if it's an elemental one. */
export function bladeKind(item) { return item?.look?.fx || null; }
/** The colour a blade's glow throws on its surroundings. */
export function bladeLightColor(kind) { return kind === 'fire' ? 0xff7a28 : kind === 'shock' ? 0x8ab8ff : UNIQUE[kind]?.light ?? 0xffffff; }
