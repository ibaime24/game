// The Libram of Lesser Wonders: gameplay and visuals for the 25 "wonder" spells sold by Aldous
// Quillwhistle in Chorrol. Every spell has its own effect; casting gestures live in viewmodel.js
// (first person) and kitRig.js (third person), keyed by each spell's `anim`.
import * as THREE from 'three';
import { applyHit, allTargets, isHostile } from '../combat.js';
import { setLinePoints } from './magic.js';
import { Actor } from '../actors/actor.js';
import { ITEMS } from '../data/items.js';
import { softSprite } from '../world/textures.js';
import { M } from '../world/builder.js';
import { makeProp, hasProp } from '../world/props.js';

const r = Math.random;
const TAU = Math.PI * 2;
const V = () => new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

const addMat = (color, opacity = 1, map = null) => new THREE.MeshBasicMaterial({ color, map, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide, forceSinglePass: true });
const spriteMat = (color, opacity = 1, map = softSprite()) => new THREE.SpriteMaterial({ map, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });

let heartTex = null;
function heart() {
  if (heartTex) return heartTex;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.beginPath(); g.moveTo(32, 54); g.bezierCurveTo(4, 34, 8, 8, 32, 22); g.bezierCurveTo(56, 8, 60, 34, 32, 54); g.fill();
  heartTex = new THREE.CanvasTexture(c);
  return heartTex;
}

/** A jagged polyline between two points. */
function zigzag(a, b, jitter, segs) {
  const pts = [];
  const d = b.clone().sub(a), len = d.length();
  const side = V().set(r() - 0.5, r() - 0.5, r() - 0.5).cross(d).normalize();
  const up = side.clone().cross(d).normalize();
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, env = Math.sin(t * Math.PI);
    pts.push(a.clone().addScaledVector(d, t).addScaledVector(side, (r() - 0.5) * jitter * len * env).addScaledVector(up, (r() - 0.5) * jitter * len * env));
  }
  return pts;
}

export class Spellbook {
  constructor(game) {
    this.game = game;
    this.missiles = [];
    this.mark = null;
  }

  get P() { return this.game.particles; }
  get fx() { return this.game.magic; }

  /** Things a player's spell may hit: anything hostile, plus wild animals (and wisps). */
  targetable(c) {
    const p = this.game.player;
    return c !== p && !c.dead && !c.hiddenNow && (isHostile(p, c) || c.faction === 'wild' || c.frenzyT > 0);
  }
  foesNear(pos, radius) {
    return allTargets().filter((c) => this.targetable(c) && c.pos.distanceTo(pos) < radius);
  }
  /** The creature nearest the crosshair within range. */
  aimTarget(range = 30, cone = 0.93) {
    const p = this.game.player, eye = p.eye(), dir = p.lookDir();
    let best = null, bestScore = -1;
    for (const c of allTargets()) {
      if (!this.targetable(c)) continue;
      const to = c.center(V()).sub(eye);
      const d = to.length();
      if (d > range) continue;
      const dot = to.normalize().dot(dir);
      if (dot < cone) continue;
      if (this.game.cell.collision.segment(eye, c.center(V()))) continue;
      const score = dot - d * 0.002;
      if (score > bestScore) { bestScore = score; best = c; }
    }
    return best;
  }
  /** Where the crosshair meets the world, up to `range` away. */
  aimPoint(range = 35) {
    const p = this.game.player, eye = p.eye(), dir = p.lookDir();
    const end = eye.clone().addScaledVector(dir, range);
    const hit = this.game.cell.collision.segment(eye, end);
    const pt = hit ? new THREE.Vector3(hit.point.x, hit.point.y, hit.point.z) : end;
    pt.y = this.game.cell.collision.groundHeight(pt.x, pt.z, pt.y + 1);
    return pt;
  }
  /** Where the casting hand is, in the world. */
  handPos() {
    const p = this.game.player;
    if (p.thirdPerson) return p.center(V()).add(p.lookDir().multiplyScalar(0.6)).add(V().set(0, 0.35, 0));
    const cam = this.game.camera;
    return V().set(-0.18, -0.16, -0.6).applyQuaternion(cam.quaternion).add(cam.position);
  }
  mag() {
    const p = this.game.player;
    return this.cur ? 1 + p.ch.skills[this.cur.school] / 200 : 1;
  }

  cast(caster, sp) {
    this.cur = sp;
    const fn = this[sp.id];
    if (fn) fn.call(this, caster, sp, this.mag());
    this.cur = null;
  }

  // ---------------------------------------------------------------- Destruction
  lightning(a, b, color, dur = 0.3, width = 1) {
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    const g = new THREE.Group();
    const build = () => {
      g.clear();
      for (let k = 0; k < 1 + width; k++) {
        const pts = zigzag(a, b, 0.18, Math.max(6, Math.round(a.distanceTo(b) * 1.5)));
        g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
      }
    };
    build();
    let acc = 0;
    this.fx.add(g, dur, (e, dt, k) => { acc += dt; if (acc > 0.05) { acc = 0; build(); } mat.opacity = 1 - k; });
    this.fx.flash(b, color, 35, 12, dur);
  }

  chain_lightning(p, sp, mag) {
    const game = this.game;
    game.audio.play('shockCast', 1);
    let from = this.handPos();
    let target = this.aimTarget(30);
    if (!target) { this.lightning(from, this.aimPoint(30).add(V().set(0, 1, 0)), sp.color); return; }
    const hit = new Set();
    let dmg = sp.damage * mag;
    for (let hop = 0; hop < 4 && target; hop++) {
      const t = target, a = from.clone(), d = dmg;
      setTimeout(() => {
        if (t.dead) return;
        const at = t.center(V());
        this.lightning(a, at, sp.color, 0.35, hop === 0 ? 2 : 1);
        applyHit(t, { amount: d, attacker: p, kind: 'spell', element: 'shock' });
        this.P.burst(at, 'spark', 16);
        game.playAt('shockCast', at, 0.6);
      }, hop * 120);
      hit.add(t);
      from = t.center(V());
      dmg *= 0.7;
      target = allTargets().filter((c) => this.targetable(c) && !hit.has(c) && c.pos.distanceTo(t.pos) < 8).sort((x, y) => x.pos.distanceTo(t.pos) - y.pos.distanceTo(t.pos))[0];
    }
  }

  frost_nova(p, sp, mag) {
    const game = this.game, at = p.pos.clone();
    game.audio.play('frostCast', 1);
    this.fx.runeCircle(at, sp.color, { radius: 2, dur: 1.2 });
    this.fx.flash(at.clone().setY(at.y + 1), sp.color, 50, 16, 0.6);
    // rings of ice spikes burst up from the ground, nearest first
    const shard = new THREE.MeshStandardMaterial({ color: 0xe0f6ff, emissive: 0x60b0ff, emissiveIntensity: 0.9, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.9 });
    const geo = new THREE.ConeGeometry(0.16, 1, 5);
    geo.translate(0, 0.5, 0);
    const col = game.cell.collision;
    for (let ring = 0; ring < 4; ring++) {
      const rad = 1.4 + ring * 1.4, n = 8 + ring * 5;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + ring * 0.3;
        const x = at.x + Math.cos(a) * rad, z = at.z + Math.sin(a) * rad;
        const m = new THREE.Mesh(geo, shard);
        m.position.set(x, col.groundHeight(x, z, at.y + 1) - 0.1, z);
        m.rotation.set((r() - 0.5) * 0.6 + Math.sin(a) * 0.35, 0, (r() - 0.5) * 0.6 - Math.cos(a) * 0.35);
        const h = (0.6 + r() * 0.9) * (1 - ring * 0.12);
        const delay = ring * 0.08;
        m.scale.set(1, 0.01, 1);
        this.fx.add(m, 1.4 + delay, (e) => {
          const k = Math.max(0, e.t - delay);
          m.scale.set(1, Math.min(h, k * 9 * h) * (k > 1.1 ? Math.max(0, 1 - (k - 1.1) * 4) : 1) + 0.01, 1);
        });
      }
    }
    for (let i = 0; i < 60; i++) {
      const a = r() * TAU;
      this.P.emit({ x: at.x, y: at.y + 0.4, z: at.z, vx: Math.cos(a) * 9, vy: r() * 1.5, vz: Math.sin(a) * 9, drag: 3, life: 0.8, size: 0.35, grow: 1, color: new THREE.Color(0xd8f4ff) });
    }
    for (const c of this.foesNear(at, 6)) {
      applyHit(c, { amount: sp.damage * mag, attacker: p, kind: 'spell', element: 'frost' });
      c.slowT = 6;
      this.P.burst(c.center(V()), 'magic', 12, 0xd8f4ff);
    }
    p.shake(0.2);
  }

  meteor(p, sp, mag) {
    const game = this.game;
    const at = this.aimPoint(40);
    game.audio.play('fireCast', 1);
    this.fx.runeCircle(at, sp.color, { radius: 2.4, dur: 1.4, spin: 3 });
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.9, 0), new THREE.MeshStandardMaterial({ color: 0x3a2018, emissive: 0xff5010, emissiveIntensity: 1.6, roughness: 0.8, flatShading: true }));
    const glow = new THREE.Sprite(spriteMat(0xff8030, 0.9));
    glow.scale.setScalar(5);
    const g = new THREE.Group();
    g.add(rock, glow);
    const start = at.clone().add(V().set(-10, 38, -6));
    const tmp = new THREE.Color();
    this.fx.add(g, 1.15, (e, dt, k) => {
      const kk = k * k;
      g.position.lerpVectors(start, at, kk);
      rock.rotation.x += dt * 6; rock.rotation.y += dt * 4;
      for (let i = 0; i < 6; i++) {
        tmp.set(r() < 0.4 ? 0xffd080 : 0xff5010);
        this.P.emit({ x: g.position.x + (r() - 0.5), y: g.position.y + (r() - 0.5), z: g.position.z + (r() - 0.5), vx: (r() - 0.5) * 2, vy: 1 + r(), vz: (r() - 0.5) * 2, drag: 1, life: 0.6 + r() * 0.5, size: 0.9 + r(), grow: 1.5, color: tmp });
      }
      if (r() < 0.5) this.P.emit({ x: g.position.x, y: g.position.y, z: g.position.z, vx: 0, vy: 0.5, vz: 0, life: 2.5, size: 1.6, grow: 2.5, color: tmp.setRGB(0.15, 0.12, 0.1), alpha: 0.35 }, false);
    });
    this.fx.flash(at.clone().setY(at.y + 6), sp.color, 30, 30, 1.1);
    setTimeout(() => {
      if (game.cell == null) return;
      this.fx.impact(at.clone().setY(at.y + 0.6), { element: 'fire', color: sp.color, radius: 6 });
      game.playAt('explode', at, 1.6);
      game.audio.play('thunder', 0.5);
      for (const c of this.foesNear(at, 6)) {
        const d = c.pos.distanceTo(at);
        applyHit(c, { amount: sp.damage * mag * (1 - d / 6 * 0.6), attacker: p, kind: 'spell', element: 'fire' });
        this.knockback(c, at, 4);
      }
      if (p.pos.distanceTo(at) < 25) p.shake(0.6);
      // the crater smoulders
      let acc = 0;
      this.fx.add(null, 4, (e, dt) => { acc += dt * 20; while (acc > 1) { acc -= 1; this.P.burst(V().set(at.x + (r() - 0.5) * 3, at.y + 0.1, at.z + (r() - 0.5) * 3), r() < 0.7 ? 'flame' : 'ember', 1); } });
    }, 1150);
  }

  acid_spray(p, sp, mag) {
    const game = this.game;
    game.audio.play('splash', 1);
    const eye = p.eye(), dir = p.lookDir();
    const hand = this.handPos();
    const tmp = new THREE.Color();
    let acc = 0;
    this.fx.add(null, 0.6, (e, dt) => {
      acc += dt * 160;
      while (acc > 1) {
        acc -= 1;
        const d = dir.clone().add(V().set((r() - 0.5) * 0.7, (r() - 0.3) * 0.4, (r() - 0.5) * 0.7)).normalize();
        tmp.setHSL(0.24 + r() * 0.05, 0.9, 0.45 + r() * 0.2);
        this.P.emit({ x: hand.x, y: hand.y, z: hand.z, vx: d.x * 12, vy: d.y * 12, vz: d.z * 12, gravity: 9, drag: 0.6, life: 0.7, size: 0.12 + r() * 0.12, color: tmp, alpha: 0.85 }, false);
      }
    });
    for (const c of allTargets()) {
      if (!this.targetable(c)) continue;
      const to = c.center(V()).sub(eye);
      if (to.length() > 8 || to.normalize().dot(dir) < 0.8) continue;
      // poison eats away for five seconds
      let ticks = 0;
      this.fx.add(null, 5, (e) => {
        while (ticks < Math.floor(e.t) + 1 && ticks < 5) {
          ticks++;
          if (c.dead) return;
          applyHit(c, { amount: sp.damage * mag, attacker: p, kind: 'spell', element: 'poison' });
          this.P.burst(c.center(V()), 'magic', 8, 0x9aff40);
        }
        if (!c.dead && r() < 0.3) this.P.emit({ x: c.pos.x + (r() - 0.5) * 0.6, y: c.pos.y + r() * c.height, z: c.pos.z + (r() - 0.5) * 0.6, vx: 0, vy: 0.6, vz: 0, life: 1, size: 0.3, grow: 1, color: new THREE.Color(0x7acc30), alpha: 0.5 }, false);
      });
    }
  }

  arcane_missiles(p, sp, mag) {
    this.game.audio.play('chime', 0.8);
    const target = this.aimTarget(35, 0.85);
    const dir = p.lookDir();
    for (let i = 0; i < 5; i++) {
      const s = new THREE.Sprite(spriteMat(sp.color, 1));
      s.scale.setScalar(0.45);
      const core = new THREE.Sprite(spriteMat(0xffffff, 1));
      core.scale.setScalar(0.18);
      const g = new THREE.Group();
      g.add(s, core);
      const pos = this.handPos();
      const side = V().crossVectors(dir, UP).normalize();
      const vel = dir.clone().multiplyScalar(6).addScaledVector(side, (i - 2) * 2.4).addScaledVector(UP, 2 + (i % 2) * 1.5);
      g.position.copy(pos);
      this.game.scene.add(g);
      this.missiles.push({ g, vel, target, life: 3, delay: i * 0.09, dmg: sp.damage * mag, color: sp.color, owner: p, dir: dir.clone() });
    }
  }

  flame_wall(p, sp, mag) {
    const game = this.game;
    game.audio.play('fireCast', 1);
    const dir = p.lookDir().setY(0).normalize();
    const side = V().crossVectors(dir, UP).normalize();
    const centre = p.pos.clone().addScaledVector(dir, 5);
    const col = game.cell.collision;
    const pts = [];
    for (let i = 0; i <= 10; i++) {
      const q = centre.clone().addScaledVector(side, (i / 10 - 0.5) * 9);
      q.y = col.groundHeight(q.x, q.z, p.pos.y + 2);
      pts.push(q);
    }
    this.fx.flash(centre.clone().setY(centre.y + 1.5), sp.color, 40, 18, 8);
    let acc = 0, tick = 0;
    const tmp = new THREE.Color();
    // flames race outward from the centre, then burn steadily
    this.fx.add(null, 8, (e, dt) => {
      const reach = Math.min(1, e.t * 3);
      acc += dt * 90;
      while (acc > 1) {
        acc -= 1;
        const i = Math.floor(r() * pts.length);
        if (Math.abs(i / 10 - 0.5) * 2 > reach) continue;
        const q = pts[i];
        tmp.set(r() < 0.3 ? 0xffd070 : sp.color);
        this.P.emit({ x: q.x + (r() - 0.5) * 0.8, y: q.y + 0.05, z: q.z + (r() - 0.5) * 0.4, vx: (r() - 0.5) * 0.4, vy: 2 + r() * 2.5, vz: (r() - 0.5) * 0.4, drag: 1, life: 0.6 + r() * 0.5, size: 0.7 + r() * 0.5, grow: -0.4, color: tmp });
        if (r() < 0.05) this.P.emit({ x: q.x, y: q.y + 2, z: q.z, vx: 0, vy: 1.2, vz: 0, life: 2.5, size: 1, grow: 2.5, color: tmp.setRGB(0.15, 0.13, 0.12), alpha: 0.3 }, false);
      }
      tick += dt;
      if (tick > 0.5) {
        tick = 0;
        for (const c of allTargets()) {
          if (!this.targetable(c)) continue;
          const rel = c.pos.clone().sub(centre);
          if (Math.abs(rel.dot(dir)) < 1.1 && Math.abs(rel.dot(side)) < 4.6 * reach) applyHit(c, { amount: sp.damage * mag * 0.5, attacker: p, kind: 'spell', element: 'fire' });
        }
      }
    });
  }

  /** Shove an actor away from a point over a fraction of a second. */
  knockback(c, from, dist) {
    if (c.isPlayer || c.dead) return;
    const dir = c.pos.clone().sub(from).setY(0);
    if (dir.lengthSq() < 0.01) dir.set(r() - 0.5, 0, r() - 0.5);
    dir.normalize();
    c.anim.stagger = 1;
    const col = this.game.cell.collision;
    this.fx.add(null, 0.35, (e, dt, k) => {
      if (c.dead) return;
      c.pos.addScaledVector(dir, dist * dt / 0.35 * (1.6 - k * 1.2));
      col.resolve(c.pos, c.radius || 0.4, c.height || 1.8);
      c.pos.y = col.groundHeight(c.pos.x, c.pos.z, c.pos.y + 1) + Math.sin(k * Math.PI) * 0.5;
    });
  }

  thunderclap(p, sp, mag) {
    const game = this.game, at = p.pos.clone();
    game.audio.play('thunder', 0.9);
    game.ui.screenFlash?.(0xfff0a0);
    p.shake(0.5);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.12, 6, 40), addMat(sp.color, 1));
    ring.rotation.x = Math.PI / 2;
    ring.position.set(at.x, at.y + 0.4, at.z);
    this.fx.add(ring, 0.5, (e, dt, k) => { ring.scale.setScalar(0.5 + k * 7); ring.material.opacity = 1 - k; });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), addMat(0xfff8d0, 0.35));
    dome.position.copy(at);
    this.fx.add(dome, 0.35, (e, dt, k) => { dome.scale.setScalar(0.5 + k * 6); dome.material.opacity = 0.35 * (1 - k); });
    for (let i = 0; i < 6; i++) {
      const a = r() * TAU;
      this.lightning(at.clone().setY(at.y + 1), at.clone().add(V().set(Math.cos(a) * 6, 0.2, Math.sin(a) * 6)), sp.color, 0.25, 0);
    }
    for (let i = 0; i < 50; i++) { const a = r() * TAU; this.P.emit({ x: at.x, y: at.y + 0.2, z: at.z, vx: Math.cos(a) * 12, vy: r() * 2, vz: Math.sin(a) * 12, drag: 4, life: 0.6, size: 0.6, grow: 2, color: new THREE.Color(0.55, 0.5, 0.42), alpha: 0.4 }, false); }
    for (const c of this.foesNear(at, 7)) {
      applyHit(c, { amount: sp.damage * mag, attacker: p, kind: 'spell', element: 'shock' });
      this.knockback(c, at, 5);
    }
  }

  // ---------------------------------------------------------------- Restoration
  rejuvenation(p, sp, mag) {
    const game = this.game;
    game.audio.play('heal', 1);
    p.effects.regenT = 10;
    p.effects.regenAmt = sp.heal * mag;
    this.fx.runeCircle(p.pos, sp.color, { radius: 1.3, dur: 2 });
    // flowers bloom around your feet and wilt when the spell ends
    if (hasProp('celandine_01')) {
      const col = game.cell.collision;
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * TAU, rad = 0.9 + r() * 0.6;
        const x = p.pos.x + Math.cos(a) * rad, z = p.pos.z + Math.sin(a) * rad;
        const f = makeProp(['celandine_01', 'dandelion_01'][i % 2], { variant: i, height: 0.4, shadow: false });
        f.position.set(x, col.groundHeight(x, z, p.pos.y + 1), z);
        const base = f.scale.x;
        f.scale.setScalar(0.001);
        this.fx.add(f, 10, (e, dt, k) => { const grow = Math.min(1, e.t * 2.5), wilt = k > 0.85 ? 1 - (k - 0.85) / 0.15 : 1; f.scale.setScalar(base * Math.max(0.001, grow * wilt)); });
      }
    }
  }

  sunbeam(p, sp, mag) {
    const game = this.game;
    const at = this.aimPoint(30);
    game.audio.play('chime', 1);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.8, 70, 24, 1, true), addMat(0xffe8a0, 0.45));
    beam.position.set(at.x, at.y + 35, at.z);
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 70, 16, 1, true), addMat(0xffffff, 0.6));
    core.position.copy(beam.position);
    const g = new THREE.Group(); g.add(beam, core);
    this.fx.add(g, 2.6, (e, dt, k) => { const w = Math.min(1, e.t * 4) * (k > 0.75 ? (1 - k) / 0.25 : 1); g.scale.set(w, 1, w); beam.material.opacity = 0.45 * w; core.material.opacity = 0.6 * w; });
    this.fx.runeCircle(at, 0xffe080, { radius: 3, dur: 2.6, spin: 0.6 });
    this.fx.flash(at.clone().setY(at.y + 2), 0xffe0a0, 70, 22, 2.6);
    let acc = 0;
    const tmp = new THREE.Color(0xfff0b0);
    this.fx.add(null, 2.4, (e, dt) => { acc += dt * 50; while (acc > 1) { acc -= 1; this.P.emit({ x: at.x + (r() - 0.5) * 4, y: at.y + 6 + r() * 8, z: at.z + (r() - 0.5) * 4, vx: 0, vy: -3 - r() * 2, vz: 0, life: 1.6, size: 0.14, color: tmp }); } });
    setTimeout(() => {
      if (p.pos.distanceTo(at) < 3.2) { p.health = Math.min(p.maxHealth, p.health + sp.heal * mag); this.P.burst(p.pos, 'heal', 30, 0xffe080); }
      for (const c of this.foesNear(at, 4)) applyHit(c, { amount: (c.def?.undead ? sp.damage : sp.damage * 0.25) * mag, attacker: p, kind: 'spell', element: 'fire' });
    }, 300);
  }

  turn_undead(p, sp) {
    const game = this.game, at = p.pos.clone();
    game.audio.play('chime', 1);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 64), addMat(0xfff4c0, 0.9));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(at.x, at.y + 0.15, at.z);
    this.fx.add(ring, 1.2, (e, dt, k) => { ring.scale.setScalar(1 + k * 20); ring.material.opacity = 0.9 * (1 - k); });
    this.fx.flash(at.clone().setY(at.y + 2), 0xfff4c0, 60, 25, 1);
    let n = 0;
    for (const c of game.cell.actors) {
      if (c.dead || !c.def?.undead || c.pos.distanceTo(at) > 20) continue;
      c.fleeFrom = p; c.fleeT = 12; c.setTarget?.(null); n++;
      this.P.burst(c.center(V()), 'heal', 16, 0xfff4c0);
    }
    game.ui.notify(n ? `${n} undead flee from the light.` : 'The light finds nothing unholy here.');
  }

  life_drain(p, sp, mag) {
    const game = this.game;
    const t = this.aimTarget(20);
    if (!t) { game.ui.notify('There is no living thing to drain.'); return; }
    game.audio.play('spellGeneric', 1);
    const mat = new THREE.LineBasicMaterial({ color: sp.color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    const line = new THREE.Line(new THREE.BufferGeometry(), mat);
    line.frustumCulled = false;
    let tick = 0, acc = 0;
    const tmp = new THREE.Color();
    this.fx.add(line, 3, (e, dt, k) => {
      if (t.dead || t.pos.distanceTo(p.pos) > 24) { e.t = e.dur; return; }
      const a = t.center(V()), b = this.handPos();
      const pts = [];
      for (let i = 0; i <= 24; i++) {
        const q = i / 24;
        const w = Math.sin(q * Math.PI) * 0.25;
        pts.push(a.clone().lerp(b, q).add(V().set(Math.sin(q * 12 + e.t * 18) * w, Math.cos(q * 9 + e.t * 15) * w, 0)));
      }
      setLinePoints(line, pts);
      mat.opacity = 0.9 * (1 - k * 0.5);
      // life flows toward you
      acc += dt * 40;
      while (acc > 1) {
        acc -= 1;
        const q = r();
        const s = a.clone().lerp(b, q);
        const vel = b.clone().sub(a).normalize().multiplyScalar(8);
        tmp.setHSL(0.98, 0.9, 0.5 + r() * 0.2);
        this.P.emit({ x: s.x, y: s.y, z: s.z, vx: vel.x, vy: vel.y, vz: vel.z, life: 0.25, size: 0.16, color: tmp });
      }
      tick += dt;
      if (tick > 0.5) {
        tick = 0;
        const amt = applyHit(t, { amount: sp.damage * mag * 0.5, attacker: p, kind: 'spell' });
        p.health = Math.min(p.maxHealth, p.health + amt);
      }
    });
  }

  // ---------------------------------------------------------------- Alteration
  leap(p) {
    this.game.audio.play('swingHeavy', 1);
    p.vel.y = 13;
    p.onGround = false;
    p.fallStartY = null;
    p.effects.featherT = 8;
    const at = p.pos.clone();
    this.fx.runeCircle(at, 0xd0e8ff, { radius: 1.2, dur: 0.8, spin: 4 });
    for (let i = 0; i < 40; i++) {
      const a = r() * TAU;
      this.P.emit({ x: at.x, y: at.y + 0.2, z: at.z, vx: Math.cos(a) * 4, vy: 1 + r() * 2, vz: Math.sin(a) * 4, drag: 2, gravity: 0.4, life: 1.6 + r(), size: 0.14, color: new THREE.Color(0xffffff), alpha: 0.9 }, false);
    }
  }

  stoneskin(p, sp) {
    const game = this.game;
    game.audio.play('hitMetal', 0.7);
    p.effects.shield = 35; p.effects.shieldT = 45;
    const g = new THREE.Group();
    const stones = [];
    for (let i = 0; i < 7; i++) {
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.11 + r() * 0.06, 0), M('rock'));
      m.castShadow = true;
      g.add(m);
      stones.push({ m, a: (i / 7) * TAU, h: 0.15 + r() * 0.45, rad: 0.95 + r() * 0.3, spd: 1.4 + r() });
    }
    this.fx.add(g, 45, (e, dt, k) => {
      g.position.copy(p.pos);
      for (const s of stones) {
        s.a += dt * s.spd;
        s.m.position.set(Math.cos(s.a) * s.rad, s.h + Math.sin(e.t * 2 + s.a) * 0.1, Math.sin(s.a) * s.rad);
        s.m.rotation.x += dt; s.m.rotation.y += dt * 1.3;
      }
      g.visible = p.effects.shieldT > 0;
    });
    for (let i = 0; i < 30; i++) this.P.emit({ x: p.pos.x + (r() - 0.5), y: p.pos.y + r() * 1.8, z: p.pos.z + (r() - 0.5), vx: 0, vy: -1, vz: 0, gravity: 4, life: 0.8, size: 0.1, color: new THREE.Color(0.7, 0.65, 0.55) }, false);
    game.ui.screenFlash?.(0xb8a888);
  }

  telekinesis(p, sp) {
    const game = this.game, eye = p.eye(), dir = p.lookDir();
    let best = null, bestDot = 0.965;
    for (const it of game.cell.interactables) {
      if (it.disabled || !it.mesh || (it.kind !== 'item' && it.kind !== 'harvest')) continue;
      const to = it.pos.clone().sub(eye);
      const d = to.length();
      if (d > 25) continue;
      const dot = to.normalize().dot(dir);
      if (dot < bestDot) continue;
      const hit = game.cell.collision.segment(eye, it.pos);
      if (hit && hit.t < 0.92) continue;
      bestDot = dot; best = it;
    }
    if (!best) { game.ui.notify('Your will finds nothing loose to pull.'); return; }
    game.audio.play('portal', 0.25);
    const m = best.mesh, start = m.position.clone();
    const tmp = new THREE.Color(sp.color);
    this.fx.add(null, 0.8, (e, dt, k) => {
      const dest = this.handPos();
      const kk = k * k * (3 - 2 * k);
      m.position.lerpVectors(start, dest, kk).add(V().set(0, Math.sin(k * Math.PI) * 1.2, 0));
      m.rotation.y += dt * 8;
      this.P.emit({ x: m.position.x, y: m.position.y, z: m.position.z, vx: (r() - 0.5), vy: (r() - 0.5), vz: (r() - 0.5), life: 0.4, size: 0.2, grow: -0.5, color: tmp });
    });
    setTimeout(() => {
      if (best.disabled || game.state !== 'playing') return;
      best.pos.copy(m.position);
      game.interaction.target = best;
      game.activate();
    }, 820);
  }

  blink(p, sp) {
    const game = this.game, col = game.cell.collision;
    const eye = p.eye(), dir = p.lookDir();
    dir.y = Math.max(-0.3, Math.min(0.3, dir.y));
    dir.normalize();
    const end = eye.clone().addScaledVector(dir, 12);
    const hit = col.segment(eye, end);
    const dest = hit ? V().set(hit.point.x, hit.point.y, hit.point.z).addScaledVector(dir, -0.7) : end;
    dest.y = col.groundHeight(dest.x, dest.z, dest.y + 0.5);
    const puff = (at) => {
      for (let i = 0; i < 40; i++) {
        const a = r() * TAU, b = r() * Math.PI;
        this.P.emit({ x: at.x, y: at.y + 1, z: at.z, vx: Math.cos(a) * Math.sin(b) * 3, vy: Math.cos(b) * 3, vz: Math.sin(a) * Math.sin(b) * 3, drag: 4, life: 0.6, size: 0.3, grow: -0.6, color: new THREE.Color(sp.color) });
      }
      this.fx.flash(at.clone().setY(at.y + 1), sp.color, 30, 10, 0.35);
    };
    puff(p.pos);
    p.pos.copy(dest);
    p.vel.set(0, 0, 0);
    puff(dest);
    game.audio.play('portal', 0.35);
    game.camera.fov = game.settings.fov + 16;
    game.camera.updateProjectionMatrix();
    game.ui.screenFlash?.(sp.color);
  }

  haste(p, sp) {
    this.game.audio.play('swing', 1);
    p.effects.hasteT = 20;
    this.fx.runeCircle(p.pos, sp.color, { radius: 1.1, dur: 0.9, spin: 6 });
    this.game.ui.screenFlash?.(sp.color);
  }

  // ---------------------------------------------------------------- Conjuration
  summonGhost(p, tpl, color, duration) {
    const game = this.game;
    if (p.summon && !p.summon.dead) p.summon.unsummon();
    const at = p.pos.clone().addScaledVector(p.forward(V()), 2.5);
    at.y = game.cell.collision.groundHeight(at.x, at.z, p.pos.y + 1);
    const a = new Actor(tpl, at.x, at.y, at.z, { duration: duration * this.mag() });
    a.yaw = p.yaw + Math.PI;
    // spectral: see-through and glowing
    a.group.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      o.material = o.material.clone();
      o.material.transparent = true;
      o.material.opacity = 0.55;
      o.material.depthWrite = false;
      if (o.material.emissive) { o.material.emissive.setHex(color); o.material.emissiveIntensity = 0.6; }
      o.castShadow = false;
    });
    game.addActor(a);
    p.summon = a;
    game.audio.play('conjure');
    this.fx.summon(at, color);
    return a;
  }
  spectral_wolf(p, sp) { this.summonGhost(p, 'spectral_wolf', sp.color, 45); }
  ghost_knight(p, sp) { this.summonGhost(p, 'ghost_knight', sp.color, 45); }

  bound_sword(p, sp) { this.conjureBlade(p, sp, 'bound_sword'); }
  flame_blade(p, sp) { this.conjureBlade(p, sp, 'flame_blade'); }
  storm_blade(p, sp) { this.conjureBlade(p, sp, 'storm_blade'); }
  /** A conjured weapon replaces whatever is in your hand for 60 secs, then your own weapon comes back. */
  conjureBlade(p, sp, id) {
    const game = this.game;
    const ef = p.effects;
    if (ef.boundT > 0 && ef.boundItem && ef.boundItem !== id) p.inventory.remove(ef.boundItem, 99);
    else if (!ef.boundT) ef.boundPrev = p.equipped.weapon || null;
    ef.boundItem = id;
    if (!p.inventory.has(id)) p.inventory.add(id, 1);
    p.equip(id, true);
    p.weaponOut = true;
    ef.boundT = 60;
    game.audio.play('conjure', 0.8);
    if (id === 'flame_blade') game.audio.play('torch', 0.9);
    if (id === 'storm_blade') game.audio.play('shockCast', 0.7);
    game.ui.screenFlash?.(sp.color);
    const hand = this.handPos();
    const shape = id === 'storm_blade' ? 'pixel' : id === 'flame_blade' ? 'pixel' : undefined;
    for (let i = 0; i < 46; i++) this.P.emit({ x: hand.x + 0.3, y: hand.y, z: hand.z, vx: (r() - 0.5) * 3, vy: r() * 3, vz: (r() - 0.5) * 3, drag: 3, life: 0.7, size: i % 4 ? 0.14 : 0.5, grow: -0.5, color: new THREE.Color(sp.color).lerp(new THREE.Color(1, 1, 1), i % 4 ? 0 : 0.5), shape: i % 4 ? shape : 'star' });
    this.fx.glint(hand.clone().add(V().set(0, 0.3, 0)), sp.color, 2.2, 0.5);
  }

  // ---------------------------------------------------------------- Illusion
  calm(p, sp, mag) {
    const game = this.game;
    const t = this.aimTarget(25);
    if (!t) { game.ui.notify('There is no one there to calm.'); return; }
    if ((t.level || 1) > 10 + p.ch.skills.illusion / 5) { game.ui.notify(`${t.name} is too strong-willed.`); this.P.burst(t.center(V()), 'magic', 12, 0x808080); return; }
    game.audio.play('chime', 0.8);
    t.calmT = 30 * mag;
    t.setTarget?.(null);
    const tex = heart();
    let acc = 0;
    this.fx.add(null, t.calmT, (e, dt) => {
      if (t.dead || !(t.calmT > 0)) { e.t = e.dur; return; }
      acc += dt;
      if (acc > 0.5) {
        acc = 0;
        const s = new THREE.Sprite(spriteMat(sp.color, 1, tex));
        s.scale.setScalar(0.3);
        const c = t.center(V()).add(V().set((r() - 0.5) * 0.5, t.height * 0.45, (r() - 0.5) * 0.5));
        s.position.copy(c);
        this.fx.add(s, 1.6, (e2, dt2, k) => { s.position.y += dt2 * 0.7; s.position.x += Math.sin(e2.t * 5) * dt2 * 0.3; s.material.opacity = 1 - k; s.scale.setScalar(0.3 + k * 0.15); });
      }
    });
  }

  frenzy(p, sp, mag) {
    const game = this.game;
    const t = this.aimTarget(25);
    if (!t) { game.ui.notify('There is no one there to madden.'); return; }
    game.audio.play('crime', 0.6);
    t.frenzyT = 20 * mag;
    t.calmT = 0;
    // pick a fight with the nearest other creature
    const victim = game.cell.actors.filter((a) => a !== t && !a.dead && !a.hiddenNow).sort((x, y) => x.pos.distanceTo(t.pos) - y.pos.distanceTo(t.pos))[0];
    if (victim) { t.setTarget?.(victim); victim.setTarget?.(t); }
    let acc = 0;
    this.fx.add(null, t.frenzyT, (e, dt) => {
      if (t.dead || !(t.frenzyT > 0)) { e.t = e.dur; return; }
      acc += dt * 25;
      while (acc > 1) { acc -= 1; this.P.emit({ x: t.pos.x + (r() - 0.5) * 0.8, y: t.pos.y + r() * t.height, z: t.pos.z + (r() - 0.5) * 0.8, vx: 0, vy: 1, vz: 0, life: 0.5, size: 0.2, grow: -0.5, color: new THREE.Color(0xff2a10) }); }
    });
  }

  night_eye(p, sp) {
    this.game.audio.play('spellGeneric', 0.8);
    p.effects.nightEyeT = 60;
    this.game.ui.screenFlash?.(sp.color);
  }

  fireworks(p, sp) {
    const game = this.game;
    const hues = [0, 0.08, 0.15, 0.33, 0.55, 0.75, 0.88];
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        if (!game.cell) return;
        const start = p.pos.clone().add(V().set(0, 1.5, 0));
        const dir = V().set((r() - 0.5) * 0.5, 1, (r() - 0.5) * 0.5).normalize();
        const height = 18 + r() * 12;
        const hue = hues[Math.floor(r() * hues.length)];
        const rocket = new THREE.Sprite(spriteMat(0xffd0a0, 1));
        rocket.scale.setScalar(0.35);
        game.audio.play('swing', 0.5);
        this.fx.add(rocket, 0.9, (e, dt, k) => {
          rocket.position.copy(start).addScaledVector(dir, height * Math.sin(k * Math.PI / 2));
          this.P.emit({ x: rocket.position.x, y: rocket.position.y, z: rocket.position.z, vx: (r() - 0.5) * 0.5, vy: -1, vz: (r() - 0.5) * 0.5, gravity: 3, life: 0.6, size: 0.1, color: new THREE.Color(1, 0.8, 0.5) });
        });
        setTimeout(() => {
          const at = start.clone().addScaledVector(dir, height);
          const col = new THREE.Color();
          const kind = i % 3;
          for (let k = 0; k < 140; k++) {
            const a = r() * TAU, b = Math.acos(2 * r() - 1);
            const sp2 = kind === 1 ? 7 : 5 + r() * 3;
            col.setHSL((hue + (kind === 2 ? r() * 0.3 : 0)) % 1, 0.9, 0.6 + r() * 0.2);
            this.P.emit({ x: at.x, y: at.y, z: at.z, vx: Math.cos(a) * Math.sin(b) * sp2, vy: Math.cos(b) * sp2, vz: Math.sin(a) * Math.sin(b) * sp2, drag: 1.4, gravity: 1.6, life: 1.4 + r() * 0.8, size: 0.32, grow: -0.4, color: col });
          }
          this.fx.flash(at, col.getHex(), 60, 40, 0.6);
          game.audio.play('explode', 0.35);
          setTimeout(() => game.audio.play('block', 0.25), 300);
        }, 900);
      }, i * 380);
    }
    // animals and the faint of heart scatter
    for (const c of game.cell.actors) {
      if (c.dead || c.pos.distanceTo(p.pos) > 30) continue;
      if (c.def?.ai === 'prey' || c.def?.ai === 'beast' || (c.hostileToPlayer && c.maxHealth < 40)) { c.fleeFrom = p; c.fleeT = 6; }
    }
  }

  // ---------------------------------------------------------------- Mysticism
  mark_recall(p, sp) {
    const game = this.game;
    const m = this.mark;
    if (!m) {
      const at = p.pos.clone();
      this.mark = { cell: game.cell.id, pos: { x: at.x, z: at.z, yaw: p.yaw } };
      this.placeMarkRune();
      game.audio.play('chime', 0.8);
      game.ui.notify('You leave a rune of return here. Cast again to come back to it.');
      return;
    }
    this.mark = null;
    this.removeMarkRune();
    game.audio.play('portal', 0.6);
    game.ui.screenFlash?.(sp.color);
    const column = (at) => {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 6, 20, 1, true), addMat(sp.color, 0.5));
      c.position.set(at.x, at.y + 3, at.z);
      this.fx.add(c, 0.8, (e, dt, k) => { c.scale.set(1 - k, 1 + k, 1 - k); c.material.opacity = 0.5 * (1 - k); });
      this.P.burst(V().set(at.x, at.y + 1, at.z), 'magic', 40, sp.color);
    };
    column(p.pos);
    if (m.cell !== game.cell.id) {
      game.enterCell(m.cell, m.pos, 'You are pulled back to your rune of return.');
      return;
    }
    p.pos.set(m.pos.x, game.cell.collision.groundHeight(m.pos.x, m.pos.z, p.pos.y + 50), m.pos.z);
    p.vel.set(0, 0, 0);
    column(p.pos);
  }
  placeMarkRune() {
    const game = this.game, m = this.mark;
    if (!m || m.cell !== game.cell?.id) return;
    this.removeMarkRune();
    const g = this.fx.runeCircle(V().set(m.pos.x, 0, m.pos.z), 0x60e0e0, { radius: 1, dur: 1e9, spin: 0.4 });
    this.markRune = g;
  }
  removeMarkRune() {
    if (!this.markRune) return;
    const e = this.fx.list.find((x) => x.obj === this.markRune);
    if (e) e.t = e.dur;
    this.markRune = null;
  }

  reveal(p) {
    const game = this.game;
    game.audio.play('chime', 0.9);
    let n = 0;
    for (const it of game.cell.interactables) {
      if (it.disabled || !['container', 'item', 'harvest'].includes(it.kind) || it.pos.distanceTo(p.pos) > 40 || n > 40) continue;
      n++;
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, 9, 8, 1, true), addMat(it.kind === 'container' ? 0xffd060 : 0x80ffd0, 0.55));
      pillar.position.set(it.pos.x, it.pos.y + 4.5, it.pos.z);
      const delay = it.pos.distanceTo(p.pos) / 30;
      this.fx.add(pillar, 15 + delay, (e, dt, k) => { const w = Math.min(1, Math.max(0, e.t - delay) * 3); pillar.scale.set(w * (1 + Math.sin(e.t * 4) * 0.15), w, w); pillar.material.opacity = 0.55 * (k > 0.9 ? (1 - k) / 0.1 : 1); });
    }
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.95, 1, 64), addMat(0xffe060, 0.8));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(p.pos.x, p.pos.y + 0.2, p.pos.z);
    this.fx.add(ring, 1.3, (e, dt, k) => { ring.scale.setScalar(1 + k * 40); ring.material.opacity = 0.8 * (1 - k); });
    game.ui.notify(n ? `Your senses reach out: ${n} things worth finding.` : 'Nothing of value lies near.');
  }

  // ---------------------------------------------------------------- per frame
  update(dt) {
    const game = this.game, p = game.player;
    if (!p || !game.cell) return;
    const ef = p.effects;
    // seeking missiles
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const m = this.missiles[i];
      m.life -= dt;
      if (m.delay > 0) { m.delay -= dt; m.g.position.copy(this.handPos()); continue; }
      const want = m.target && !m.target.dead ? m.target.center(V()).sub(m.g.position).normalize().multiplyScalar(18) : m.dir.clone().multiplyScalar(18);
      m.vel.lerp(want, Math.min(1, dt * 4));
      m.g.position.addScaledVector(m.vel, dt);
      this.P.emit({ x: m.g.position.x, y: m.g.position.y, z: m.g.position.z, vx: 0, vy: 0, vz: 0, life: 0.3, size: 0.25, grow: -0.7, color: new THREE.Color(m.color) });
      let done = m.life <= 0;
      if (m.target && !m.target.dead && m.g.position.distanceTo(m.target.center(V())) < 0.7) {
        applyHit(m.target, { amount: m.dmg, attacker: m.owner, kind: 'spell' });
        this.P.burst(m.g.position, 'magic', 14, m.color);
        game.playAt('block', m.g.position, 0.3);
        done = true;
      }
      if (!done && game.cell.collision.segment(m.g.position, m.g.position.clone().addScaledVector(m.vel, dt))) { this.P.burst(m.g.position, 'magic', 10, m.color); done = true; }
      if (done) { game.scene.remove(m.g); this.missiles.splice(i, 1); }
    }
    // timed effects on the player
    if (ef.regenT > 0) {
      ef.regenT -= dt;
      p.health = Math.min(p.maxHealth, p.health + (ef.regenAmt || 6) * dt);
      if (r() < dt * 14) {
        const a = game.clockT * 4 + r();
        this.P.emit({ x: p.pos.x + Math.cos(a) * 0.6, y: p.pos.y + 0.2, z: p.pos.z + Math.sin(a) * 0.6, vx: -Math.sin(a), vy: 1.2, vz: Math.cos(a), life: 1.2, size: 0.12, color: new THREE.Color().setHSL(0.28 + r() * 0.08, 0.7, 0.55) });
      }
    }
    if (ef.hasteT > 0) {
      ef.hasteT -= dt;
      if (p.speedNow > 1 && r() < dt * 40) {
        const back = p.forward(V()).multiplyScalar(-0.4);
        this.P.emit({ x: p.pos.x + back.x + (r() - 0.5) * 0.6, y: p.pos.y + 0.2 + r() * 1.4, z: p.pos.z + back.z + (r() - 0.5) * 0.6, vx: back.x * 3, vy: 0, vz: back.z * 3, drag: 2, life: 0.4, size: 0.16, grow: -0.6, color: new THREE.Color(0xffd060) });
      }
    }
    if (ef.featherT > 0) {
      ef.featherT -= dt;
      if (!p.onGround && r() < dt * 8) this.P.emit({ x: p.pos.x + (r() - 0.5), y: p.pos.y, z: p.pos.z + (r() - 0.5), vx: (r() - 0.5) * 0.5, vy: -0.3, vz: (r() - 0.5) * 0.5, gravity: 0.3, life: 2.5, size: 0.12, color: new THREE.Color(1, 1, 1), alpha: 0.9 }, false);
    }
    if (ef.nightEyeT > 0) ef.nightEyeT -= dt;
    if (ef.boundT > 0) {
      ef.boundT -= dt;
      if (ef.boundT <= 0) {
        const prev = ef.boundPrev, id = ef.boundItem || 'bound_sword';
        p.inventory.remove(id, 99);
        if (p.equipped.weapon === id) p.unequip('weapon');
        if (prev && p.inventory.has(prev)) p.equip(prev, true);
        ef.boundPrev = null;
        ef.boundItem = null;
        game.ui.notify(`The ${ITEMS[id].name.replace('Bound ', '').toLowerCase()} fades away.`);
      }
    }
    // calm and frenzy wear off
    for (const a of game.cell.actors) {
      if (a.calmT > 0) { a.calmT -= dt; if (a.target?.isPlayer) a.setTarget(null); }
      if (a.frenzyT > 0) a.frenzyT -= dt;
    }
  }

  clear() {
    for (const m of this.missiles) this.game.scene.remove(m.g);
    this.missiles = [];
    this.markRune = null;
  }
}
