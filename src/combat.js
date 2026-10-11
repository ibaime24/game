// Combat resolution: hostility, melee strikes, damage application, projectiles.
import * as THREE from 'three';
import { game } from './game.js';
import { weaponDamage, armorMultiplier, blockReduction } from './data/stats.js';
import { buildArrowMesh, mat } from './actors/models.js';
import { ITEMS } from './data/items.js';

const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3();

export function factionOf(x) {
  return x.isPlayer ? 'player' : x.faction;
}

/** Would a attack b of its own accord? */
export function isHostile(a, b) {
  if (!a || !b || a === b || a.dead || b.dead) return false;
  // the robe of the Mythic Dawn: the faithful take the wearer for one of their own
  if (game.disguisedAmong?.(a, b) || game.disguisedAmong?.(b, a)) return false;
  // Illusion: the calmed want no fight with anyone; the frenzied want a fight with everyone but you
  if (a.calmT > 0 || b.calmT > 0) return false;
  if ((a.frenzyT > 0 && !b.isPlayer) || (b.frenzyT > 0 && !a.isPlayer)) return a.isActor && b.isActor;
  if (a.frenzyT > 0 || b.frenzyT > 0) return false;
  // the restless dead of the Corwyn fire are beyond anyone's quarrels
  if (a.def?.untouchable || b.def?.untouchable) return false;
  const fa = factionOf(a), fb = factionOf(b);
  if (fa === 'monster') return fb !== 'monster';
  if (fb === 'monster') return fa !== 'monster';
  const guardMad = (t) => t.def?.ai === 'guard' && game.crime.resisting;
  // neutral folk (goblins who'd rather talk) only fight you once provoked
  if (fa === 'neutral' && (fb === 'player' || fb === 'ally')) return !!a.hostileToPlayer;
  if (fb === 'neutral' && (fa === 'player' || fa === 'ally')) return !!b.hostileToPlayer;
  if (fa === 'town' && (fb === 'player' || fb === 'ally')) return a.hostileToPlayer || guardMad(a);
  if (fb === 'town' && (fa === 'player' || fa === 'ally')) return b.hostileToPlayer || guardMad(b);
  return false;
}

export function allTargets() {
  const list = [];
  if (game.player && !game.player.dead) list.push(game.player);
  for (const a of game.cell.actors) if (!a.dead) list.push(a);
  return list;
}

/** Find the best target in a melee cone in front of attacker. */
export function findMeleeTarget(attacker, reach) {
  const fwd = attacker.forward(new THREE.Vector3());
  let best = null, bestScore = Infinity;
  for (const c of allTargets()) {
    if (c === attacker || c.def?.untouchable) continue;
    if (!attacker.isPlayer && !isHostile(attacker, c) && c !== attacker.target) continue;
    v1.copy(c.pos).sub(attacker.pos);
    const dy = v1.y;
    v1.y = 0;
    const d = v1.length() - (c.radius || 0.4);
    if (d > reach || Math.abs(dy) > 2.2) continue;
    v1.normalize();
    const dot = v1.dot(fwd);
    if (dot < (d < 0.6 ? -0.2 : 0.45)) continue;
    const score = d - dot * 1.5;
    if (score < bestScore) { best = c; bestScore = score; }
  }
  return best;
}

export function meleeStrike(attacker, power = false) {
  const reach = attacker.isPlayer ? attacker.reach() : attacker.reach + 0.3;
  const target = findMeleeTarget(attacker, reach);
  if (!target) return null;
  let amount, sneak = false;
  if (attacker.isPlayer) {
    const p = attacker;
    sneak = p.sneaking && !(target.isActor && target.target === p);
    amount = weaponDamage(p.ch, p.equippedWeapon(), { power, sneak, fatigueRatio: p.fatigue / p.maxFatigue });
    const skill = p.equippedWeapon()?.skill || 'handtohand';
    p.exercise(skill, power ? 1.3 : 1);
    if (sneak) {
      game.ui.notify(`Sneak attack for ${amount} damage!`);
      p.exercise('sneak', 1.5);
    }
  } else {
    const w = attacker.weapon;
    if (w && w.skill !== 'marksman' && w.damage) amount = w.damage * (0.8 + attacker.level * 0.07);
    else amount = attacker.baseDamage;
    if (power) amount *= 1.6;
  }
  applyHit(target, { amount, attacker, kind: 'melee', power, element: attacker.def?.element });
  const w = attacker.isPlayer ? attacker.equippedWeapon() : null;
  if (w?.elementDamage && !target.dead) elementalStrike(attacker, target, w, power);
  return target;
}

/** A conjured elemental blade bites: fire sets the target burning, lightning leaps to a second foe. */
function elementalStrike(attacker, target, w, power) {
  const at = target.center ? target.center(new THREE.Vector3()) : target.pos.clone().setY(target.pos.y + 1);
  let dmg = w.elementDamage * (power ? 1.5 : 1);
  if (w.bane === 'undead' && target.def?.undead) dmg *= 2;
  applyHit(target, { amount: dmg, attacker, kind: 'spell', element: w.element });
  const P = game.particles;
  const c = new THREE.Color();
  // life (and magicka) drunk from the wound
  if (w.drain && attacker.isPlayer) {
    attacker.health = Math.min(attacker.maxHealth, attacker.health + w.drain);
    if (w.drainMagicka) attacker.magicka = Math.min(attacker.maxMagicka, attacker.magicka + w.drainMagicka);
    const to = attacker.center ? attacker.center(new THREE.Vector3()) : attacker.pos;
    for (let i = 0; i < 8; i++) {
      const t = i / 8;
      P.emit({ x: at.x + (to.x - at.x) * t * 0.6, y: at.y + (to.y - at.y) * t * 0.6, z: at.z + (to.z - at.z) * t * 0.6, vx: (to.x - at.x) * 1.2, vy: (to.y - at.y) * 1.2, vz: (to.z - at.z) * 1.2, drag: 2, life: 0.45, size: 0.1, color: c.set(w.id === 'voidreaver' ? 0xff3020 : 0x8aff8a), shape: 'pixel' });
    }
  }
  // Starfang: now and then a star falls on what it strikes
  if (w.starfall && Math.random() < 0.25) {
    const top = at.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2, 9, (Math.random() - 0.5) * 2));
    const fall = game.magic.glint(top, 0xc8dcff, 1.6, 0.6, 2);
    game.magic.add(null, 0.35, (e, dt, k) => { fall.position.lerpVectors(top, at, k); }).onEnd = () => {
      if (!target.dead) applyHit(target, { amount: 15, attacker, kind: 'spell', element: 'shock' });
      game.magic.glint(at, 0xc8dcff, 2.6, 0.5, 1.5);
      for (let i = 0; i < 16; i++) P.emit({ x: at.x, y: at.y, z: at.z, vx: (Math.random() - 0.5) * 7, vy: Math.random() * 5, vz: (Math.random() - 0.5) * 7, gravity: 5, life: 0.6, size: i % 3 ? 0.08 : 0.35, color: c.setRGB(0.8, 0.88, 1), shape: i % 3 ? 'pixel' : 'star' });
      game.playAt('chime', at, 0.6);
    };
  }
  if (w.element === 'frost') {
    target.slowT = 4;
    game.magic.glint(at, 0x9ad8ff, 1.4, 0.35);
    for (let i = 0; i < 12; i++) P.emit({ x: at.x, y: at.y, z: at.z, vx: (Math.random() - 0.5) * 4, vy: Math.random() * 2.5, vz: (Math.random() - 0.5) * 4, gravity: 1.5, drag: 1.5, life: 1, size: 0.22, color: c.setRGB(0.85, 0.95, 1), shape: 'flake' });
    game.playAt('frostCast', at, 0.4);
  } else if (w.element === 'poison') {
    game.magic.glint(at, 0x9aff70, 1.2, 0.3);
    for (let i = 0; i < 10; i++) P.emit({ x: at.x + (Math.random() - 0.5) * 0.4, y: at.y, z: at.z + (Math.random() - 0.5) * 0.4, vx: (Math.random() - 0.5), vy: 0.4 + Math.random() * 0.5, vz: (Math.random() - 0.5), drag: 1.2, life: 1.4, size: 0.5, grow: 1.6, color: c.set(0x7ad84a), alpha: 0.3 }, false);
  }
  if (w.element === 'fire') {
    game.magic.glint(at, 0xff8a30, 1.6, 0.35);
    P.burst(at, 'fire', 14, 0xff6a20);
    for (let i = 0; i < 10; i++) P.emit({ x: at.x, y: at.y, z: at.z, vx: (Math.random() - 0.5) * 6, vy: 1 + Math.random() * 4, vz: (Math.random() - 0.5) * 6, gravity: 6, life: 0.6, size: i % 3 ? 0.09 : 0.35, color: c.set(i % 2 ? 0xffc040 : 0xff6a10), shape: i % 3 ? 'pixel' : 'star' });
    game.playAt('fireCast', at, 0.5);
    // ...and it keeps burning
    if (!target.burning) {
      target.burning = true;
      let tick = 0;
      game.magic.add(null, 3.2, (e, dt, k) => {
        if (target.dead) return;
        tick += dt;
        const p = target.center ? target.center(new THREE.Vector3()) : target.pos;
        if (Math.random() < dt * 30) P.emit({ x: p.x + (Math.random() - 0.5) * 0.5, y: p.y - 0.5 + Math.random(), z: p.z + (Math.random() - 0.5) * 0.5, vx: 0, vy: 1.5 + Math.random(), vz: 0, drag: 1, life: 0.45, size: 0.35, grow: 0.5, color: c.set(Math.random() < 0.4 ? 0xffd080 : 0xff5a10) });
        if (tick >= 0.5) { tick = 0; applyHit(target, { amount: 2.5, attacker, kind: 'spell', element: 'fire' }); }
      }).onEnd = () => { target.burning = false; };
    }
  } else if (w.element === 'shock') {
    game.magic.glint(at, 0x9ac8ff, 1.5, 0.3, 4);
    game.playAt('shockCast', at, 0.6);
    // the lightning leaps to the next foe within reach
    let best = null, bd = 7;
    for (const o of allTargets()) {
      if (o === target || o === attacker || o.dead || !isHostile(o, attacker)) continue;
      const d = o.pos.distanceTo(target.pos);
      if (d < bd) { bd = d; best = o; }
    }
    if (best) {
      const to = best.center ? best.center(new THREE.Vector3()) : best.pos.clone().setY(best.pos.y + 1);
      game.magic.arc(at, to, 0x9ac8ff, 0.35);
      applyHit(best, { amount: dmg * 0.6, attacker, kind: 'spell', element: 'shock' });
    } else {
      // with no one to leap to, it crackles into the ground
      const g = at.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2, -1.2, (Math.random() - 0.5) * 2));
      game.magic.arc(at, g, 0x9ac8ff, 0.25);
    }
  }
}

/** Central damage pipeline. Returns damage actually dealt. */
export function applyHit(target, hit) {
  if (!target || target.dead) return 0;
  let amount = hit.amount;
  const attacker = hit.attacker;
  const physical = hit.kind === 'melee' || hit.kind === 'arrow';
  const center = target.center ? target.center(new THREE.Vector3()) : target.pos.clone();

  // blocking
  if (physical && target.blocking && attacker) {
    v2.copy(attacker.pos).sub(target.pos).setY(0).normalize();
    const facing = target.forward(v3).dot(v2);
    if (facing > 0.25) {
      const hasShield = target.isPlayer ? ITEMS[target.equipped.shield]?.type === 'armor' : !!target.shield;
      const skill = target.isPlayer ? target.ch.skills.block : 45;
      amount *= 1 - blockReduction(skill, hasShield);
      game.playAt(hasShield ? 'block' : 'hitMetal', target.pos, 1);
      game.particles.burst(v2.multiplyScalar(0.5).add(center), 'spark', 14);
      if (target.isPlayer) {
        target.exercise('block', 1);
        target.fatigue = Math.max(0, target.fatigue - 6);
        game.player.shake(0.15);
      }
      if (attacker.anim && !hit.power) attacker.anim.stagger = 1;
      if (attacker.isPlayer && hit.power) target.blockT = 0;
      hit.blocked = true;
    }
  }

  // armour
  if (physical) {
    const ar = target.isPlayer ? target.armorRating() : (target.armorRating || 0);
    amount *= armorMultiplier(ar);
    if (target.isPlayer) target.exerciseArmor();
  }
  // ghosts shrug off mundane weapons
  if (physical && target.def?.ghostly) {
    const w = attacker?.isPlayer ? attacker.equippedWeapon() : null;
    if (!w?.look?.glow) amount *= 0.3;
  }
  // magical shield
  if (target.shieldPct) amount *= 1 - target.shieldPct / 100;
  if (hit.element === 'frost') target.slowT = 3;
  if (target.def?.undead && hit.element === 'fire') amount *= 1.25;
  if (target.def?.daedra && hit.element === 'fire') amount *= 0.6;

  amount = Math.max(hit.blocked ? 0 : 1, Math.round(amount));
  target.health -= amount;

  if (!hit.blocked) {
    const gore = target.def?.gore || (target.def?.ghostly ? 'magic' : target.def?.daedra ? 'blood' : 'blood');
    if (gore === 'magic') game.particles.burst(center, 'magic', 10, 0x9ab0e0);
    else game.particles.burst(center, gore, hit.power ? 18 : 10);
    if (physical) game.playAt('hit', target.pos, 1);
  }

  if (target.isPlayer) target.onHit(attacker, amount, hit);
  else {
    target.onHit(attacker, amount);
    if (attacker?.isPlayer) game.ui.showEnemyHealth(target);
  }
  if (target.health <= 0) {
    target.health = 0;
    target.die(attacker);
  }
  return amount;
}

// ------------------------------------------------------------------ projectiles

export class Projectiles {
  constructor() {
    this.list = [];
    this.lights = [];
  }

  attach(scene) {
    // fixed pool of lights so the shader light count never changes
    if (!this.lights.length) {
      for (let i = 0; i < 3; i++) {
        const l = new THREE.PointLight(0xff6020, 0, 10, 2);
        this.lights.push(l);
      }
    }
    for (const l of this.lights) scene.add(l);
    for (const p of this.list) scene.add(p.mesh);
  }

  clear(scene) {
    for (const p of this.list) scene.remove(p.mesh);
    this.list = [];
    for (const l of this.lights) l.intensity = 0;
  }

  spawn(o) {
    let mesh;
    if (o.kind === 'arrow') {
      mesh = buildArrowMesh();
    }
    let vis = null;
    if (o.kind === 'spell') {
      vis = game.magic.bolt(o.spell);
      mesh = vis.group;
    }
    mesh.position.copy(o.pos);
    game.scene.add(mesh);
    const p = { ...o, mesh, vis, vel: o.dir.clone().multiplyScalar(o.speed), life: 4, light: null };
    if (o.kind === 'spell') {
      const free = this.lights.find((l) => l.intensity === 0);
      if (free) { p.light = free; free.color.setHex(o.color); free.intensity = 8; }
    }
    if (o.kind === 'arrow') mesh.lookAt(v1.copy(o.pos).sub(p.vel));
    this.list.push(p);
    return p;
  }

  update(dt) {
    const col = game.cell.collision;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life -= dt;
      const from = p.mesh.position.clone();
      p.vel.y -= (p.gravity || 0) * dt;
      const to = from.clone().addScaledVector(p.vel, dt);
      // actors
      let hitActor = null, hitT = 2;
      for (const c of allTargets()) {
        if (c === p.owner) continue;
        if (!p.owner.isPlayer && !isHostile(p.owner, c)) continue;
        const t = segVsCylinder(from, to, c.pos, (c.radius || 0.4) + 0.15, c.height || 1.8);
        if (t !== null && t < hitT) { hitT = t; hitActor = c; }
      }
      const world = col.segment(from, to);
      if (world && world.t < hitT) { hitActor = null; hitT = world.t; }
      if (hitT <= 1) {
        const at = from.clone().lerp(to, hitT);
        this.impact(p, at, hitActor);
        this.remove(i);
        continue;
      }
      p.mesh.position.copy(to);
      if (p.kind === 'arrow') p.mesh.lookAt(v1.copy(to).sub(p.vel));
      else p.vis?.update(dt, to, p.vel);
      if (p.light) p.light.position.copy(to);
      // water
      if (game.cell.waterLevel !== undefined && to.y < game.cell.waterLevel && from.y >= game.cell.waterLevel) {
        game.particles.burst(to, 'splash', 10);
      }
      if (p.life <= 0) this.remove(i);
    }
  }

  remove(i) {
    const p = this.list[i];
    game.scene.remove(p.mesh);
    p.vis?.dispose();
    if (p.light) p.light.intensity = 0;
    this.list.splice(i, 1);
  }

  impact(p, at, target) {
    if (p.kind === 'arrow') {
      game.playAt('arrowHit', at, 1);
      if (target) {
        let amount = p.damage;
        applyHit(target, { amount, attacker: p.owner, kind: 'arrow' });
      } else {
        game.particles.burst(at, 'dust', 3);
      }
      return;
    }
    const sp = p.spell;
    game.magic.impact(at, sp);
    if (sp.radius) {
      game.playAt('explode', at, 1.2);
      for (const c of allTargets()) {
        if (c === p.owner) continue;
        const d = c.center ? c.center(new THREE.Vector3()).distanceTo(at) : c.pos.distanceTo(at);
        if (d < sp.radius) applyHit(c, { amount: p.damage * (1 - d / sp.radius * 0.6), attacker: p.owner, kind: 'spell', element: sp.element });
      }
    } else {
      game.playAt(sp.element === 'shock' ? 'shockCast' : sp.element === 'frost' ? 'frostCast' : 'explode', at, 0.6);
      if (target) applyHit(target, { amount: p.damage, attacker: p.owner, kind: 'spell', element: sp.element });
    }
  }
}

function segVsCylinder(a, b, base, r, h) {
  const steps = Math.max(1, Math.ceil(a.distanceTo(b) / 0.25));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t, z = a.z + (b.z - a.z) * t;
    if (y < base.y - 0.1 || y > base.y + h) continue;
    if ((x - base.x) ** 2 + (z - base.z) ** 2 < r * r) return t;
  }
  return null;
}

/** NPC casts a bolt spell at a target. */
export function castBolt(caster, spell, target) {
  const from = caster.eye(new THREE.Vector3());
  const fwd = caster.forward(new THREE.Vector3());
  from.addScaledVector(fwd, 0.6);
  from.y -= 0.3;
  const aim = target.center ? target.center(new THREE.Vector3()) : target.pos.clone().setY(target.pos.y + 1);
  const dir = aim.sub(from).normalize();
  game.playAt(spell.element === 'shock' ? 'shockCast' : spell.element === 'frost' ? 'frostCast' : 'fireCast', caster.pos, 0.8);
  const dmg = spell.damage * (0.7 + caster.level * 0.05);
  game.projectiles.spawn({ kind: 'spell', pos: from, dir, speed: spell.speed * 0.8, owner: caster, spell, damage: dmg, color: spell.color, radius: spell.radius });
}

/** NPC archer fires at target. */
export function fireArrow(actor, target, draw = 1) {
  const from = actor.eye(new THREE.Vector3());
  from.y -= 0.2;
  const aim = target.center ? target.center(new THREE.Vector3()) : target.pos.clone();
  const d = from.distanceTo(aim);
  aim.y += d * d * 0.004 + (Math.random() - 0.5) * 0.6;
  aim.x += (Math.random() - 0.5) * 0.8;
  aim.z += (Math.random() - 0.5) * 0.8;
  const dir = aim.sub(from).normalize();
  game.playAt('bowShoot', actor.pos, 0.8);
  const dmg = ((actor.weapon?.damage || 8) + 6) * (0.7 + actor.level * 0.06) * draw;
  game.projectiles.spawn({ kind: 'arrow', pos: from, dir, speed: 38, gravity: 6, owner: actor, damage: dmg });
}
