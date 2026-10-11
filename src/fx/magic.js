// Spell visual effects: element-specific bolts with trails, impact explosions, lightning, ice shards,
// rune circles for self-cast spells and summoning, and brief light flashes. Everything is additive so
// it blooms, and every effect cleans itself up.
import * as THREE from 'three';
import { softSprite } from '../world/textures.js';
import { buildCarriedFlame } from './flames.js';

const TAU = Math.PI * 2;
const WHITE = new THREE.Color(1, 1, 1);
const _c = new THREE.Color();
const r = Math.random;

function canvasTex(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

let TEX = null;
function textures() {
  if (TEX) return TEX;
  TEX = {
    glow: softSprite(),
    // a hot core with a soft falloff
    core: canvasTex(64, (ctx, S) => {
      const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.18, 'rgba(255,255,255,0.95)');
      g.addColorStop(0.45, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    }),
    // shockwave ring
    ring: canvasTex(128, (ctx, S) => {
      const g = ctx.createRadialGradient(S / 2, S / 2, S * 0.28, S / 2, S / 2, S / 2);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.65, 'rgba(255,255,255,0.9)');
      g.addColorStop(0.8, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    }),
    // a four-point star glint: long thin tapering rays, short diagonal ones, a hot heart
    star: canvasTex(128, (ctx, S) => {
      const c = S / 2;
      const ray = (ang, len, w) => {
        ctx.save(); ctx.translate(c, c); ctx.rotate(ang);
        const g = ctx.createLinearGradient(0, 0, len, 0);
        g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(0, -w); ctx.lineTo(len, 0); ctx.lineTo(0, w); ctx.closePath(); ctx.fill();
        ctx.restore();
      };
      for (let i = 0; i < 4; i++) ray(i * Math.PI / 2, c * 0.98, 3.2);
      for (let i = 0; i < 4; i++) ray(Math.PI / 4 + i * Math.PI / 2, c * 0.42, 2);
      const g = ctx.createRadialGradient(c, c, 0, c, c, c * 0.32);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    }),
    // a six-armed snowflake with branching arms
    flake: canvasTex(128, (ctx, S) => {
      ctx.translate(S / 2, S / 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineCap = 'round';
      ctx.shadowColor = 'white'; ctx.shadowBlur = 5;
      for (let i = 0; i < 6; i++) {
        ctx.save(); ctx.rotate((i / 6) * TAU);
        ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -S * 0.44); ctx.stroke();
        ctx.lineWidth = 3;
        for (const [y, l] of [[0.18, 0.12], [0.3, 0.09]]) {
          for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(0, -S * y); ctx.lineTo(sx * S * l, -S * (y + l)); ctx.stroke(); }
        }
        ctx.restore();
      }
      ctx.lineWidth = 3; ctx.beginPath();
      for (let i = 0; i <= 6; i++) { const a = (i / 6) * TAU; ctx.lineTo(Math.cos(a) * S * 0.09, Math.sin(a) * S * 0.09); }
      ctx.stroke();
    }),
    // a circle of glyphs for self-cast and summoning
    runes: canvasTex(256, (ctx, S) => {
      ctx.translate(S / 2, S / 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.shadowColor = 'white'; ctx.shadowBlur = 6;
      ctx.lineWidth = 3;
      for (const rad of [S * 0.46, S * 0.38, S * 0.2]) { ctx.beginPath(); ctx.arc(0, 0, rad, 0, TAU); ctx.stroke(); }
      ctx.lineWidth = 2;
      // a star of intersecting lines
      ctx.beginPath();
      for (let i = 0; i <= 7; i++) { const a = (i * 3 / 7) * TAU; ctx.lineTo(Math.cos(a) * S * 0.38, Math.sin(a) * S * 0.38); }
      ctx.stroke();
      // glyphs between the outer rings
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * TAU;
        ctx.save(); ctx.rotate(a); ctx.translate(S * 0.42, 0);
        ctx.beginPath();
        const k = i % 4;
        if (k === 0) { ctx.moveTo(-6, -6); ctx.lineTo(0, 6); ctx.lineTo(6, -6); }
        else if (k === 1) { ctx.arc(0, 0, 5, 0.3, TAU - 0.3); }
        else if (k === 2) { ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.moveTo(0, -6); ctx.lineTo(0, 6); }
        else { ctx.moveTo(-5, 6); ctx.lineTo(0, -6); ctx.lineTo(5, 6); ctx.moveTo(-3, 1); ctx.lineTo(3, 1); }
        ctx.stroke(); ctx.restore();
      }
    }),
  };
  return TEX;
}

/** Refill a line object's points, growing its buffer when the new shape has more vertices than the old. */
export function setLinePoints(line, pts) {
  let g = line.geometry;
  const pos = g.attributes.position;
  if (!pos || pos.count < pts.length) {
    g.dispose();
    g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(Math.max(pts.length, 16) * 3 + 96), 3));
    line.geometry = g;
  }
  const a = g.attributes.position;
  for (let i = 0; i < pts.length; i++) a.setXYZ(i, pts[i].x, pts[i].y, pts[i].z);
  a.needsUpdate = true;
  g.setDrawRange(0, pts.length);
  g.computeBoundingSphere();
}

/** The shared magic sprites (glow, core, ring, runes, star, flake). */
export function magicTextures() { return textures(); }

const additive = (tex, color, opacity = 1) => new THREE.MeshBasicMaterial({ map: tex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide, forceSinglePass: true });
const spriteMat = (tex, color, opacity = 1) => new THREE.SpriteMaterial({ map: tex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });

/** A jagged lightning polyline between two points. */
function boltPoints(a, b, jitter, segs = 10) {
  const pts = [];
  const dir = b.clone().sub(a);
  const len = dir.length();
  const side = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).cross(dir).normalize();
  const up = side.clone().cross(dir).normalize();
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const env = Math.sin(t * Math.PI);
    pts.push(a.clone().addScaledVector(dir, t)
      .addScaledVector(side, (r() - 0.5) * jitter * len * env)
      .addScaledVector(up, (r() - 0.5) * jitter * len * env));
  }
  return pts;
}

export class MagicFX {
  constructor(game) {
    this.game = game;
    this.list = [];
    textures();
  }

  get scene() { return this.game.scene; }

  add(obj, dur, update) {
    if (obj) this.scene.add(obj);
    const e = { obj, t: 0, dur, update };
    this.list.push(e);
    return e;
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const e = this.list[i];
      e.t += dt;
      const k = Math.min(1, e.t / e.dur);
      if (e.update) e.update(e, dt, k);
      if (k >= 1) {
        if (e.obj) { this.scene.remove(e.obj); e.obj.traverse?.((o) => { o.geometry?.dispose?.(); if (o.material && !o.material.userData.shared) o.material.dispose?.(); }); }
        e.onEnd?.();
        this.list.splice(i, 1);
      }
    }
  }

  clear() {
    for (const e of this.list) { if (e.obj) this.scene.remove(e.obj); e.onEnd?.(); }
    this.list = [];
  }

  /** A short-lived point of light routed through the game's light pool. */
  flash(pos, color, intensity = 40, distance = 16, dur = 0.35, glint = true) {
    const cell = this.game.cell;
    if (!cell) return;
    if (glint) this.glint(pos, color, Math.min(4.5, 0.7 + intensity / 22), dur * 1.3);
    const l = { color: new THREE.Color(color), intensity, distance, pos: pos.clone(), flicker: false, night: false, on: true, priority: true };
    cell.lights.push(l);
    const e = this.add(null, dur, (e, dt, k) => { l.intensity = intensity * (1 - k) * (1 - k); });
    e.onEnd = () => { const i = cell.lights.indexOf(l); if (i >= 0) cell.lights.splice(i, 1); };
  }

  /** A big four-point star that pops open, turns a little and closes: the signature sparkle of all magic. */
  glint(pos, color, size = 2, dur = 0.45, spin = 0.8) {
    const T = textures();
    const c = new THREE.Color(color).lerp(WHITE, 0.3);
    const st = new THREE.Sprite(spriteMat(T.star, c, 1));
    st.position.copy(pos);
    st.material.rotation = r() * 0.4;
    const halo = new THREE.Sprite(spriteMat(T.glow, new THREE.Color(color), 0.25));
    halo.position.copy(pos);
    const g = new THREE.Group();
    g.add(halo, st);
    // a glint right in front of the eye would fill the screen: keep it to a sparkle
    const cam = this.game.camera;
    this.add(g, dur, (e, dt, k) => {
      const open = k < 0.18 ? k / 0.18 : 1 - (k - 0.18) / 0.82;
      const near = cam ? Math.min(1, cam.position.distanceTo(pos) / (size * 2.2)) : 1;
      const sz = size * near;
      st.scale.setScalar(sz * (0.35 + open * 0.9));
      st.material.rotation += dt * spin;
      st.material.opacity = Math.min(1, open * 1.4);
      halo.scale.setScalar(sz * 0.9 * (0.5 + k * 0.7));
      halo.material.opacity = 0.25 * (1 - k);
    });
    return g;
  }

  /** A crackling arc of lightning between two points (chain lightning, the storm blade). */
  arc(from, to, color = 0xb8d0ff, dur = 0.32) {
    const mat = new THREE.LineBasicMaterial({ color: new THREE.Color(color).lerp(WHITE, 0.5), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    const glow = new THREE.LineBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    const a = new THREE.LineSegments(new THREE.BufferGeometry(), mat), b = new THREE.LineSegments(new THREE.BufferGeometry(), glow);
    a.frustumCulled = b.frustumCulled = false;
    const g = new THREE.Group();
    g.add(a, b);
    const regen = () => {
      for (const [line, j] of [[a, 0.18], [b, 0.3]]) {
        const pts = [];
        const l = boltPoints(from, to, j, 12);
        for (let i = 0; i < l.length - 1; i++) pts.push(l[i], l[i + 1]);
        const m = l[5 + Math.floor(r() * 3)];
        const br = boltPoints(m, m.clone().add(new THREE.Vector3((r() - 0.5) * 1.6, (r() - 0.5) * 1.6, (r() - 0.5) * 1.6)), 0.4, 4);
        for (let i = 0; i < br.length - 1; i++) pts.push(br[i], br[i + 1]);
        setLinePoints(line, pts);
      }
    };
    regen();
    let acc = 0;
    this.add(g, dur, (e, dt, k) => { acc += dt; if (acc > 0.045) { acc = 0; regen(); } mat.opacity = 1 - k * k; glow.opacity = 0.5 * (1 - k); });
    this.glint(to, color, 1.4, dur);
    const P = this.game.particles;
    for (let i = 0; i < 10; i++) P.emit({ x: to.x, y: to.y, z: to.z, vx: (r() - 0.5) * 8, vy: (r() - 0.2) * 7, vz: (r() - 0.5) * 8, gravity: 6, drag: 2, life: 0.3 + r() * 0.3, size: i % 3 ? 0.08 : 0.3, color: _c.set(i % 2 ? 0xffffff : color), shape: i % 3 ? 'pixel' : 'star' });
  }

  // ------------------------------------------------------------------ bolts
  /** Visuals that ride a spell projectile. Returns { group, update(dt, pos, vel), dispose() }. */
  bolt(spell) {
    const T = textures();
    const el = spell.element || 'fire';
    const color = new THREE.Color(spell.color);
    const big = !!spell.radius;
    const sz = big ? 1.6 : 1;
    const group = new THREE.Group();
    // a hot white heart, a coloured halo, and a turning four-point star round it
    const core = new THREE.Sprite(spriteMat(T.core, new THREE.Color(1, 1, 1).lerp(color, 0.25)));
    const halo = new THREE.Sprite(spriteMat(T.glow, color, el === 'frost' ? 0.35 : 0.5));
    const star = new THREE.Sprite(spriteMat(T.star, color.clone().lerp(WHITE, 0.5), 0.9));
    group.add(halo, core, star);
    let crystal = null, arcs = null, flake = null, ring = null;
    if (el === 'fire') {
      // a ring of flame-coloured light that churns round the core
      ring = new THREE.Sprite(spriteMat(T.ring, new THREE.Color(1.0, 0.45, 0.1), 0.85));
      group.add(ring);
    }
    if (el === 'frost') {
      crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), new THREE.MeshStandardMaterial({ color: 0xe8faff, emissive: 0x90d8ff, emissiveIntensity: 2.2, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.92 }));
      crystal.scale.set(0.8, 1.9, 0.8);
      flake = new THREE.Sprite(spriteMat(T.flake, new THREE.Color(0.75, 0.92, 1.0), 0.95));
      group.add(crystal, flake);
    }
    if (el === 'shock') {
      arcs = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xe8f0ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      arcs.frustumCulled = false;
      group.add(arcs);
    }
    const P = this.game.particles;
    let t = 0, acc = 0;
    const tmp = new THREE.Color();
    return {
      group,
      update: (dt, pos, vel) => {
        t += dt;
        group.position.copy(pos);
        const pulse = 1 + Math.sin(t * 30) * 0.12;
        core.scale.setScalar(0.17 * sz * pulse);
        halo.scale.setScalar(0.7 * sz * (1 + Math.sin(t * 13) * 0.08));
        star.scale.setScalar((0.75 + Math.sin(t * 21) * 0.25) * sz);
        star.material.rotation += dt * 3;
        if (ring) { ring.scale.setScalar(0.65 * sz * (1 + Math.sin(t * 17) * 0.15)); ring.material.rotation -= dt * 9; }
        if (crystal) { crystal.lookAt(pos.clone().add(vel)); crystal.rotateX(Math.PI / 2); crystal.rotateY(t * 9); }
        if (flake) { flake.scale.setScalar(0.62 * sz); flake.material.rotation += dt * 5; }
        if (arcs) {
          const pts = [];
          for (let k = 0; k < 5; k++) {
            const a = new THREE.Vector3((r() - 0.5) * 0.2, (r() - 0.5) * 0.2, (r() - 0.5) * 0.2);
            const b = new THREE.Vector3((r() - 0.5) * 1.3, (r() - 0.5) * 1.3, (r() - 0.5) * 1.3);
            const line = boltPoints(a, b, 0.5, 5);
            for (let i = 0; i < line.length - 1; i++) pts.push(line[i], line[i + 1]);
          }
          setLinePoints(arcs, pts);
          star.material.opacity = r() < 0.3 ? 1 : 0.5;
        }
        // trails
        acc += dt * (big ? 150 : 100);
        const back = vel.clone().normalize().multiplyScalar(-1);
        let n = 0;
        while (acc >= 1) {
          acc -= 1;
          n++;
          const o = { x: pos.x + (r() - 0.5) * 0.15, y: pos.y + (r() - 0.5) * 0.15, z: pos.z + (r() - 0.5) * 0.15 };
          if (el === 'fire') {
            // a comet's tail of flame, chunky embers and the occasional golden glint
            tmp.set(r() < 0.3 ? 0xffd080 : r() < 0.5 ? 0xff9a30 : spell.color);
            P.emit({ ...o, vx: back.x * 2 + (r() - 0.5), vy: back.y * 2 + r() * 1.2, vz: back.z * 2 + (r() - 0.5), drag: 2, life: 0.35 + r() * 0.3, size: (big ? 0.55 : 0.36) + r() * 0.2, grow: 0.8, color: tmp });
            if (r() < 0.22) P.emit({ ...o, vx: (r() - 0.5) * 3, vy: r() * 2, vz: (r() - 0.5) * 3, gravity: 3, life: 0.8 + r() * 0.6, size: 0.09, color: tmp.set(r() < 0.5 ? 0xffc040 : 0xff6a10), shape: 'pixel' });
            if (r() < 0.07) P.emit({ ...o, vx: back.x, vy: back.y + 0.3, vz: back.z, life: 0.5, size: 0.55, color: tmp.setRGB(1, 0.85, 0.5), shape: 'star' });
            if (r() < 0.05) P.emit({ ...o, vx: back.x, vy: 1, vz: back.z, life: 1.4, size: 0.5, grow: 2.5, color: tmp.setRGB(0.12, 0.1, 0.09), alpha: 0.3 }, false);
          } else if (el === 'frost') {
            // a wake of tumbling snowflakes, glinting rime and cold mist
            tmp.set(r() < 0.5 ? 0xffffff : spell.color);
            P.emit({ ...o, vx: back.x * 1.2 + (r() - 0.5) * 0.6, vy: back.y + (r() - 0.5) * 0.6, vz: back.z * 1.2 + (r() - 0.5) * 0.6, drag: 3, life: 0.6 + r() * 0.5, size: 0.2 + r() * 0.16, color: tmp, shape: n % 3 === 0 ? 'flake' : n % 3 === 1 ? 'star' : undefined });
            if (r() < 0.2) P.emit({ ...o, vx: (r() - 0.5) * 0.4, vy: -0.3, vz: (r() - 0.5) * 0.4, life: 1.2, size: 0.45, grow: 1.5, color: tmp.setRGB(0.75, 0.88, 1), alpha: 0.18 }, false);
          } else if (el === 'shock') {
            // spitting sparks: white-violet pixels and star flickers
            tmp.set(r() < 0.5 ? 0xffffff : spell.color);
            P.emit({ ...o, vx: (r() - 0.5) * 6, vy: (r() - 0.5) * 6, vz: (r() - 0.5) * 6, drag: 6, life: 0.12 + r() * 0.15, size: n % 4 === 0 ? 0.32 : 0.1, color: tmp, shape: n % 4 === 0 ? 'star' : 'pixel' });
          } else {
            tmp.set(spell.color);
            P.emit({ ...o, vx: back.x + (r() - 0.5) * 0.5, vy: 0.3 + r() * 0.4, vz: back.z + (r() - 0.5) * 0.5, drag: 1, life: 0.8 + r() * 0.5, size: 0.35, grow: 1.2, color: tmp, alpha: 0.6, shape: n % 5 === 0 ? 'pixel' : undefined });
          }
        }
      },
      dispose: () => { group.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); }); },
    };
  }

  // ------------------------------------------------------------------ impacts
  impact(at, spell) {
    const el = spell.element || 'fire';
    const color = new THREE.Color(spell.color);
    const big = !!spell.radius;
    const scale = big ? spell.radius * 0.55 : 1;
    const P = this.game.particles;
    const T = textures();
    this.flash(at, spell.color, big ? 60 : 28, big ? 26 : 14, big ? 0.6 : 0.35, false);
    // a coloured blast shell that swells and thins (kept dim so the shapes inside it read)
    const blast = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 14), additive(null, color.clone().lerp(WHITE, 0.15), 0.26));
    blast.position.copy(at);
    this.add(blast, big ? 0.5 : 0.28, (e, dt, k) => { blast.scale.setScalar((0.4 + k * 2.0) * scale); blast.material.opacity = 0.26 * (1 - k) * (1 - k); });
    // a flat shockwave on the ground
    const gy = this.game.cell?.collision?.groundHeight(at.x, at.z, at.y + 1) ?? at.y;
    if (at.y - gy < 2.5) {
      const ring = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), additive(T.ring, color, 0.85));
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(at.x, gy + 0.06, at.z);
      this.add(ring, big ? 0.7 : 0.45, (e, dt, k) => { ring.scale.setScalar((0.5 + k * 5) * scale); ring.material.opacity = 0.85 * (1 - k); });
    }
    this.glint(at, spell.color, (big ? 3.4 : 1.9), big ? 0.7 : 0.5, el === 'shock' ? 3 : 0.8);
    if (el === 'fire') {
      // the blast blooms into a crown of real flame for a moment
      const n = big ? 7 : 4;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU, d = (big ? 1.4 : 0.5) * (0.6 + r() * 0.4);
        const f = buildCarriedFlame((big ? 0.55 : 0.3) * (0.7 + r() * 0.5), { halo: 2.2 });
        f.position.set(at.x + Math.cos(a) * d, at.y - 0.2, at.z + Math.sin(a) * d);
        const u = f.userData.uniforms;
        this.add(f, big ? 1.1 : 0.7, (e, dt, k) => { u.uTime.value = this.game.clockT; f.scale.setScalar(Math.sin(Math.min(1, k * 1.4) * Math.PI) + 0.01); });
      }
      for (let i = 0; i < (big ? 24 : 10); i++) P.emit({ x: at.x, y: at.y, z: at.z, vx: (r() - 0.5) * 8, vy: 2 + r() * 6, vz: (r() - 0.5) * 8, gravity: 7, drag: 1, life: 0.6 + r() * 0.6, size: i % 3 ? 0.11 : 0.45, color: _c.set(i % 3 ? 0xffb040 : 0xffe0a0), shape: i % 3 ? 'pixel' : 'star' });
      P.burst(at, 'fire', big ? 70 : 28, spell.color);
      P.burst(at, 'smoke', big ? 10 : 4);
      const tmp = new THREE.Color();
      for (let i = 0; i < (big ? 40 : 16); i++) P.emit({ x: at.x, y: at.y, z: at.z, vx: (r() - 0.5) * 9, vy: r() * 7, vz: (r() - 0.5) * 9, gravity: 9, life: 0.7 + r() * 0.8, size: 0.07, color: tmp.set(r() < 0.5 ? 0xffc060 : 0xff6020) });
    } else if (el === 'frost') {
      // ice shards burst outward and tumble down
      const shardMat = new THREE.MeshStandardMaterial({ color: 0xe0f6ff, emissive: 0x70c0ff, emissiveIntensity: 1.2, roughness: 0.1, transparent: true });
      const geo = new THREE.ConeGeometry(0.05, 0.3, 4);
      const g = new THREE.Group();
      g.position.copy(at);
      const shards = [];
      for (let i = 0; i < 14; i++) {
        const m = new THREE.Mesh(geo, shardMat);
        const v = new THREE.Vector3(r() - 0.5, r() * 0.8, r() - 0.5).normalize().multiplyScalar(3 + r() * 4);
        m.userData.v = v;
        m.userData.spin = new THREE.Vector3(r() * 10, r() * 10, r() * 10);
        m.scale.setScalar(0.6 + r() * 0.9);
        g.add(m);
        shards.push(m);
      }
      this.add(g, 0.9, (e, dt, k) => {
        for (const m of shards) {
          m.userData.v.y -= 9 * dt;
          m.position.addScaledVector(m.userData.v, dt);
          m.rotation.x += m.userData.spin.x * dt; m.rotation.y += m.userData.spin.y * dt;
        }
        shardMat.opacity = 1 - k * k;
      });
      P.burst(at, 'magic', 26, 0xd0f4ff);
      // a snowflake burst: big flakes spin out and drift down
      for (let i = 0; i < (big ? 26 : 14); i++) P.emit({ x: at.x, y: at.y, z: at.z, vx: (r() - 0.5) * 6, vy: r() * 4, vz: (r() - 0.5) * 6, gravity: 1.2, drag: 2, life: 1.0 + r() * 0.8, size: 0.35 + r() * 0.35, color: _c.setRGB(0.8, 0.94, 1.0), shape: i % 2 ? 'flake' : 'star' });
      const fl = new THREE.Sprite(spriteMat(textures().flake, new THREE.Color(0.8, 0.95, 1.0), 1));
      fl.position.copy(at);
      this.add(fl, 0.8, (e, dt, k) => { fl.scale.setScalar((big ? 5 : 2.6) * (0.3 + k)); fl.material.rotation += dt * 1.5; fl.material.opacity = 1 - k; });
      const tmp = new THREE.Color(0xc8e8ff);
      for (let i = 0; i < 12; i++) P.emit({ x: at.x + (r() - 0.5), y: at.y + (r() - 0.5) * 0.5, z: at.z + (r() - 0.5), vx: (r() - 0.5) * 1.2, vy: 0.2, vz: (r() - 0.5) * 1.2, drag: 1, life: 1.6, size: 0.9, grow: 1.8, color: tmp, alpha: 0.22 }, false);
    } else if (el === 'shock') {
      // lightning forks out to the surroundings for a moment
      const mat = new THREE.LineBasicMaterial({ color: 0xe8f0ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
      const lines = new THREE.LineSegments(new THREE.BufferGeometry(), mat);
      lines.frustumCulled = false;
      const regen = () => {
        const pts = [];
        for (let k = 0; k < 7; k++) {
          const end = at.clone().add(new THREE.Vector3((r() - 0.5) * 5, (r() - 0.3) * 3, (r() - 0.5) * 5));
          const line = boltPoints(at, end, 0.35, 8);
          for (let i = 0; i < line.length - 1; i++) pts.push(line[i], line[i + 1]);
          // a branch
          const mid = line[4];
          const bl = boltPoints(mid, mid.clone().add(new THREE.Vector3((r() - 0.5) * 2, (r() - 0.5) * 2, (r() - 0.5) * 2)), 0.4, 4);
          for (let i = 0; i < bl.length - 1; i++) pts.push(bl[i], bl[i + 1]);
        }
        setLinePoints(lines, pts);
      };
      regen();
      let acc = 0;
      this.add(lines, 0.35, (e, dt, k) => { acc += dt; if (acc > 0.05) { acc = 0; regen(); } mat.opacity = 1 - k; });
      const tmp = new THREE.Color();
      for (let i = 0; i < 40; i++) P.emit({ x: at.x, y: at.y, z: at.z, vx: (r() - 0.5) * 12, vy: (r() - 0.3) * 10, vz: (r() - 0.5) * 12, gravity: 6, drag: 2, life: 0.3 + r() * 0.4, size: i % 5 ? 0.1 : 0.4, color: tmp.set(r() < 0.5 ? 0xffffff : spell.color), shape: i % 5 ? 'pixel' : 'star' });
      // the after-image: a few stars that keep flickering where it struck
      for (let i = 0; i < 6; i++) this.add(null, 0.15 + i * 0.07, () => {}).onEnd = () => this.glint(at.clone().add(new THREE.Vector3((r() - 0.5) * 1.2, (r() - 0.5) * 1.2, (r() - 0.5) * 1.2)), spell.color, 0.9, 0.22, 4);
    } else {
      // poison: a lingering, curling cloud
      const tmp = new THREE.Color(spell.color);
      for (let i = 0; i < 26; i++) P.emit({ x: at.x + (r() - 0.5) * 0.6, y: at.y + (r() - 0.5) * 0.4, z: at.z + (r() - 0.5) * 0.6, vx: (r() - 0.5) * 1.5, vy: 0.3 + r() * 0.6, vz: (r() - 0.5) * 1.5, drag: 1.5, life: 1.8 + r(), size: 0.8, grow: 2, color: tmp, alpha: 0.35 }, false);
      P.burst(at, 'magic', 20, spell.color);
    }
  }

  // ------------------------------------------------------------------ circles
  /** A glowing rune circle on the ground. */
  runeCircle(pos, color, { radius = 1.2, dur = 1.6, rise = 0, spin = 1.2 } = {}) {
    const T = textures();
    const gy = this.game.cell?.collision?.groundHeight(pos.x, pos.z, pos.y + 1) ?? pos.y;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), additive(T.runes, new THREE.Color(color), 1));
    m.rotation.x = -Math.PI / 2;
    m.position.set(pos.x, gy + 0.05, pos.z);
    this.add(m, dur, (e, dt, k) => {
      const grow = Math.min(1, k * 5);
      m.scale.setScalar(radius * 2 * (0.6 + grow * 0.4));
      m.rotation.z += dt * spin;
      m.position.y = gy + 0.05 + rise * k;
      m.material.opacity = dur > 1000 ? Math.min(0.9, e.t * 3) * (0.75 + Math.sin(e.t * 2) * 0.25) : k < 0.2 ? k / 0.2 : 1 - (k - 0.2) / 0.8;
    });
    return m;
  }

  /** Healing / warding: rune circle, rising motes in a spiral, a soft column of light. */
  selfCast(pos, spell) {
    const color = new THREE.Color(spell.color);
    this.runeCircle(pos, spell.color, { radius: 1.1, dur: 1.6 });
    this.flash(pos.clone().setY(pos.y + 1), spell.color, 22, 10, 0.8);
    const P = this.game.particles;
    const tmp = new THREE.Color();
    let acc = 0;
    this.add(null, 1.1, (e, dt) => {
      acc += dt * 90;
      while (acc >= 1) {
        acc -= 1;
        const a = e.t * 9 + r() * 0.6;
        const rad = 0.7 + r() * 0.2;
        P.emit({ x: pos.x + Math.cos(a) * rad, y: pos.y + 0.1 + e.t * 1.6, z: pos.z + Math.sin(a) * rad, vx: -Math.sin(a) * 1.2, vy: 1.2 + r(), vz: Math.cos(a) * 1.2, drag: 1, life: 0.8 + r() * 0.4, size: 0.12 + r() * 0.08, color: tmp.copy(color).lerp(new THREE.Color(1, 1, 1), r() * 0.5) });
      }
    });
    if (spell.shield) {
      // a shimmering ward bubble
      const bubble = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false, forceSinglePass: true }));
      bubble.position.set(pos.x, pos.y + 1, pos.z);
      this.add(bubble, 0.9, (e, dt, k) => { bubble.scale.setScalar(0.6 + k * 0.9); bubble.material.opacity = 0.3 * (1 - k); });
    }
  }

  /** A summoning: a burning rune circle, a pillar of light, and the creature stepping out of it. */
  summon(pos, color) {
    this.runeCircle(pos, color, { radius: 1.6, dur: 2.4, spin: 2 });
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.2, 6, 24, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false, forceSinglePass: true }));
    const gy = this.game.cell?.collision?.groundHeight(pos.x, pos.z, pos.y + 1) ?? pos.y;
    pillar.position.set(pos.x, gy + 3, pos.z);
    this.add(pillar, 1.1, (e, dt, k) => { pillar.scale.set(1 - k * 0.6, 0.3 + k * 0.9, 1 - k * 0.6); pillar.material.opacity = 0.55 * (1 - k); });
    this.flash(new THREE.Vector3(pos.x, gy + 1.5, pos.z), color, 50, 16, 0.9);
    this.game.particles.burst(new THREE.Vector3(pos.x, gy + 1, pos.z), 'magic', 50, color);
  }
}
