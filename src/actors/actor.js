// NPCs and creatures: model, stats, inventory and AI.
import * as THREE from 'three';
import { TEMPLATES, PEOPLE } from '../data/actors.js';
import { RACES } from '../data/stats.js';
import { ITEMS, Inventory, rollLoot, parseSpec } from '../data/items.js';
import { SPELLS } from '../data/spells.js';
import {
  buildHumanoid, buildQuadruped, buildMudcrab, buildClannfear, buildChicken, buildWisp, buildRabbit, animateRig, buildWeaponMesh, buildShieldMesh, attachBow, buildHat, buildSeaweed,
} from './models.js';
import { buildKitRig } from './kitRig.js';
import { isKitReady } from './characterKit.js';
import { game } from '../game.js';
import { meleeStrike, isHostile, castBolt, fireArrow } from '../combat.js';
import { detectChance } from '../data/stats.js';

let counter = 0;
const tmp = new THREE.Vector3();
const RACE_IDS = Object.keys(RACES);

const HEAD_FOR_RACE = { khajiit: 'cat', argonian: 'lizard', orc: 'orc' };

export function makeActorDef(npcOrTpl) {
  if (typeof npcOrTpl === 'string') {
    const t = TEMPLATES[npcOrTpl];
    if (!t) throw new Error('Unknown template ' + npcOrTpl);
    return { ...t, tplId: npcOrTpl, body: { ...t.body } };
  }
  const base = PEOPLE[npcOrTpl.tpl];
  const def = { ...base, ...npcOrTpl, body: { ...base.body } };
  def.tplId = npcOrTpl.tpl;
  def.body.kind = 'human';
  if (npcOrTpl.race) def.body.race = npcOrTpl.race;
  for (const k of ['shirt', 'pants', 'robe', 'hair', 'hairStyle', 'beard', 'hood', 'kitTint', 'kitOutfit', 'skin', 'opacity', 'float', 'emissiveEyes', 'head', 'scale', 'hunch', 'sleeves', 'boots', 'bones', 'seaweed', 'hat']) if (npcOrTpl[k] !== undefined) def.body[k] = npcOrTpl[k];
  return def;
}

function buildBody(def, rand) {
  const b = def.body;
  if (b.kind === 'quad') {
    const rig = buildQuadruped(b);
    if (b.antlers && rig.head) {
      // branching antlers
      const m = new THREE.MeshStandardMaterial({ color: 0xc8b090, roughness: 0.7 });
      const hs = b.headSize || 0.16;
      for (const s of [-1, 1]) {
        const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.022, 0.42, 5), m);
        beam.position.set(s * hs * 0.4, hs * 0.75 + 0.18, -hs * 0.1);
        beam.rotation.set(-0.35, 0, -s * 0.5);
        rig.head.add(beam);
        for (let k = 0; k < 3; k++) {
          const tine = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.012, 0.16, 4), m);
          tine.position.set(0, -0.08 + k * 0.1, 0.03);
          tine.rotation.set(0.9, 0, s * 0.3);
          beam.add(tine);
        }
      }
    }
    return rig;
  }
  if (b.kind === 'crab') {
    const rig = buildMudcrab(b);
    if (b.scale) { rig.root.scale.setScalar(b.scale); rig.height *= b.scale; }
    return rig;
  }
  if (b.kind === 'raptor') return buildClannfear();
  if (b.kind === 'bird') return buildChicken(b);
  if (b.kind === 'wisp') return buildWisp(b);
  if (b.kind === 'rabbit') return buildRabbit(b);
  // humanoid
  let race = b.race;
  if (race === 'random' || (!race && !b.head && !b.bones && !b.skin)) race = RACE_IDS[Math.floor(rand() * RACE_IDS.length)];
  const R = race ? RACES[race] : null;
  const female = !!def.female;
  const o = {
    skin: R?.skin, hair: R?.hair, head: HEAD_FOR_RACE[race] || 'human',
    elfEars: ['altmer', 'dunmer', 'bosmer', 'breton'].includes(race) && race !== 'breton',
    tail: race === 'khajiit' || race === 'argonian', tailColor: R?.skin,
    scale: (race === 'altmer' ? 1.07 : race === 'bosmer' ? 0.93 : 1) * (female ? 0.95 : 1),
    bulk: female ? 0.88 : (race === 'orc' || race === 'nord' ? 1.1 : 1),
    hairStyle: female ? 'long' : ['short', 'short', 'bald', 'mohawk'][Math.floor(rand() * 4)],
    beard: !female && rand() < 0.3,
    female,
    eyeColor: [0x5a7aa0, 0x4a6a3a, 0x5a4030, 0x3a5a80, 0x6a5a3a][Math.floor(rand() * 5)],
    ...Object.fromEntries(Object.entries(b).filter(([, v]) => v !== undefined)),
  };
  if (!o.skin) o.skin = 0xd8a888;
  if (!o.hair) o.hair = 0x3a2a1a;
  if (b.head) o.head = b.head;
  // equipment colors
  if (Array.isArray(def.armor) && !b.armor) {
    o.armor = {};
    for (const id of def.armor) {
      const it = ITEMS[id];
      if (it && it.slot !== 'shield') o.armor[it.slot] = it.color;
    }
  }
  if (isKitReady() && !o.bones) {
    const kitRig = buildKitRig(o);
    if (kitRig) return kitRig;
  }
  return buildHumanoid(o);
}

/** Hats and sea-rot, fixed to the head bone wherever the rig put it. */
function dressExtras(rig, b) {
  if (!b || !rig.head || (!b.hat && !b.seaweed)) return;
  rig.root.updateMatrixWorld(true);
  const head = rig.head.getWorldPosition(new THREE.Vector3());
  const quad = rig.type === 'quadruped';
  const s = quad ? (b.headSize || 0.12) * 0.62 : 0.115 * (b.scale || 1);
  const put = (o, at) => { o.position.copy(at); rig.root.add(o); rig.head.attach(o); };
  if (b.hat) {
    const hat = buildHat(b.hat, s);
    put(hat, head.clone().add(new THREE.Vector3(0, quad ? s * 0.9 : 0.2 * (b.scale || 1), quad ? -s * 0.1 : -0.02)));
  }
  if (b.seaweed) {
    put(buildSeaweed(4, 0.45), head.clone().add(new THREE.Vector3(0, 0.02, 0)));
    if (rig.torso) { const t = rig.torso.getWorldPosition(new THREE.Vector3()); const w = buildSeaweed(5, 0.6); w.position.copy(t).add(new THREE.Vector3(0, 0.25, 0)); rig.root.add(w); rig.torso.attach(w); }
  }
}

export class Actor {
  constructor(defIn, x, y, z, opts = {}) {
    const def = typeof defIn === 'object' && defIn.health && defIn.body ? defIn : makeActorDef(defIn);
    this.def = def;
    this.uid = opts.uid || def.id || `${def.tplId}_${++counter}`;
    this.name = def.name;
    this.isActor = true;
    this.faction = def.faction || 'monster';
    this.radius = def.radius || 0.4;
    this.essential = !!def.essential;
    this.unique = !!def.unique;
    const rand = Math.random;

    // level scaling
    const pl = game.player?.ch?.level ?? 1;
    this.level = def.fixedLevel ? def.level : Math.max(def.level, Math.min(def.level + 8, pl));
    const lvlScale = 1 + 0.13 * (this.level - def.level);
    this.maxHealth = Math.round(def.health * lvlScale);
    this.health = this.maxHealth;
    this.maxMagicka = def.magicka || 0;
    this.magicka = this.maxMagicka;
    this.maxFatigue = 100;
    this.fatigue = 100;
    this.baseDamage = (def.damage || 0) * (1 + 0.1 * (this.level - def.level));
    this.speed = def.speed || 4;
    this.reach = def.reach || 2.2;

    // equipment & inventory
    this.inventory = new Inventory();
    this.weapon = def.weapon ? ITEMS[def.weapon] : null;
    this.shield = def.shield ? ITEMS[def.shield] : null;
    this.armorRating = 0;
    if (Array.isArray(def.armor)) for (const id of def.armor) this.armorRating += ITEMS[id].rating * 1.5;
    else if (typeof def.armor === 'number') this.armorRating = def.armor;
    if (def.body?.armor) this.armorRating += 35; // painted-on armour (guards, dremora)
    if (this.shield) this.armorRating += this.shield.rating;
    if (!def.summon && def.loot) {
      for (const [id, n] of rollLoot(def.loot, rand, this.level)) this.inventory.add(id, n);
      if (this.weapon && def.faction !== 'town' && rand() < 0.6) this.inventory.add(this.weapon.id, 1);
      if (this.weapon?.skill === 'marksman') this.inventory.add('iron_arrow', 3 + Math.floor(rand() * 8));
      if (Array.isArray(def.armor) && rand() < 0.5) this.inventory.add(def.armor[0], 1);
      for (const spec of def.extraLoot || []) { const [id, n] = parseSpec(spec); this.inventory.add(id, n); }
    }

    // model
    this.rig = buildBody(def, rand);
    dressExtras(this.rig, def.body);
    this.group = this.rig.root;
    this.group.userData.actor = this;
    this.height = this.rig.height;
    if (this.rig.type === 'humanoid') {
      if (this.weapon && this.weapon.look) {
        this.weaponMesh = buildWeaponMesh(this.weapon.look);
        if (this.weapon.skill === 'marksman') {
          if (this.rig.bowSlot) this.rig.bowSlot.add(this.weaponMesh);
          else attachBow(this.rig.L.hand, this.weaponMesh);
        } else {
          this.rig.weaponSlot.add(this.weaponMesh);
        }
      }
      if (this.shield) {
        this.rig.shieldSlot.add(buildShieldMesh(this.shield.color));
        this.rig.hasShield = true;
      }
    }
    this.pos = this.group.position;
    this.pos.set(x, y, z);
    this.yaw = opts.yaw ?? rand() * Math.PI * 2;
    this.vy = 0;
    this.home = new THREE.Vector3(x, y, z);
    this.homeYaw = this.yaw;

    // ai
    this.state = 'idle';
    this.target = null;
    this.alerted = 0;
    this.thinkT = rand() * 0.3;
    this.wanderGoal = null;
    this.waitT = rand() * 3;
    this.attackT = -1;
    this.attackKind = def.attackKind || 'slash';
    this.cooldown = 0;
    this.blocking = false;
    this.blockT = 0;
    this.drawT = -1;
    this.castT = -1;
    this.castSpellId = null;
    this.stuckT = 0;
    this.avoid = 0;
    this.avoidT = 0;
    this.fleeT = 0;
    this.hostileToPlayer = this.faction === 'monster';
    this.patrolIdx = 0;
    this.lastTaunt = -100;
    this.disposition = 50 + Math.round((rand() - 0.5) * 20);
    this.anim = { phase: rand() * 10, moveSpeed: 0, attack: -1, attackKind: this.attackKind, block: false, cast: -1, dead: 0, stagger: 0, draw: -1, weaponOut: !!this.weapon && this.faction !== 'town' };
    // ambient idle animation for townsfolk (kit characters only)
    const idles = def.ai === 'civilian' ? [null, null, 'Idle_FoldArms_Loop', 'Idle_Talking_Loop'] : def.ai === 'guard' ? [null, 'Idle_FoldArms_Loop'] : [null];
    this.anim.idleAnim = def.idleAnim ?? idles[Math.floor(rand() * idles.length)];
    this.dead = false;
    this.deathTime = 0;
    this.t = 0;
    this.slowT = 0;
    this.summonT = def.summon ? (opts.duration || 30) : 0;
    this.lastHitBy = null;
    // spirit creatures are made of light: translucent, glowing, with a soft halo of their own colour
    if (def.spirit) {
      this.group.traverse((o) => {
        if (!o.isMesh || !o.material) return;
        o.material = [].concat(o.material).map((m) => { const c = m.clone(); c.transparent = true; c.opacity = 0.62; c.depthWrite = false; if (c.emissive) { c.emissive.setHex(def.spirit); c.emissiveIntensity = 1.1; } return c; });
        if (o.material.length === 1) o.material = o.material[0];
        o.castShadow = false;
      });
    }
    this.update(0);
  }

  get isAttacking() { return this.attackT >= 0 && this.attackT < 0.6; }

  forward(out = tmp) {
    return out.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
  }

  eye(out = new THREE.Vector3()) {
    return out.set(this.pos.x, this.pos.y + this.height * 0.9, this.pos.z);
  }

  center(out = new THREE.Vector3()) {
    return out.set(this.pos.x, this.pos.y + this.height * 0.55, this.pos.z);
  }

  canTalk() {
    return !this.dead && !this.hiddenNow && (this.faction === 'town' || this.faction === 'neutral') && !this.hostileToPlayer && this.def.ai !== undefined && (this.def.dialogue || this.def.ai === 'guard' || this.def.ai === 'civilian');
  }

  say(text, force = false) {
    if (!force && this.t - this.lastTaunt < 6) return;
    this.lastTaunt = this.t;
    if (game.player && this.pos.distanceTo(game.player.pos) < 22) game.ui.subtitle(this.name, text);
  }

  // ------------------------------------------------------------- update
  update(dt) {
    this.t += dt;
    if (this.dead) {
      this.anim.dead = Math.min(1, this.anim.dead + dt * 1.6);
      // settle on ground
      const cell = game.cell;
      if (cell) {
        const g = cell.collision.groundHeight(this.pos.x, this.pos.z, this.pos.y + 0.5, 0.2);
        this.pos.y += (g - this.pos.y) * Math.min(1, dt * 8);
      }
      this.group.rotation.y = this.yaw;
      animateRig(this.rig, this.anim, this.t);
      return;
    }
    if (dt > 0) {
      if (this.summonT > 0) {
        this.summonT -= dt;
        if (this.summonT <= 0) { this.unsummon(); return; }
      }
      this.think(dt);
      this.move(dt);
      this.combatTimers(dt);
      this.fatigue = Math.min(this.maxFatigue, this.fatigue + dt * 8);
      if (this.maxMagicka) this.magicka = Math.min(this.maxMagicka, this.magicka + dt * 2);
    }
    this.group.rotation.y = this.yaw;
    this.anim.attack = this.attackT;
    this.anim.block = this.blocking;
    this.anim.cast = this.castT;
    this.anim.draw = this.drawT;
    this.anim.stagger = Math.max(0, this.anim.stagger - dt * 2.5);
    animateRig(this.rig, this.anim, this.t);
  }

  // ------------------------------------------------------------- AI
  potentialTargets() {
    const list = [];
    const p = game.player;
    if (p && !p.dead) list.push(p);
    for (const a of game.cell.actors) if (a !== this && !a.dead) list.push(a);
    return list;
  }

  canSee(other) {
    const a = this.eye(), b = other.eye ? other.eye(new THREE.Vector3()) : other.pos;
    return game.cell.collision.segment(a, b) === null;
  }

  perceive() {
    const def = this.def;
    const range = def.aggroRange || (def.ai === 'guard' ? 30 : 24);
    let best = null, bestD = Infinity;
    for (const c of this.potentialTargets()) {
      if (!isHostile(this, c)) continue;
      const d = this.pos.distanceTo(c.pos);
      if (d > range * (c === this.target ? 2.2 : 1) || d >= bestD) continue;
      if (c.isPlayer && c !== this.target && !this.alerted) {
        // stealth check
        const behind = this.forward(new THREE.Vector3()).dot(tmp.copy(c.pos).sub(this.pos).normalize()) < -0.2;
        let chance = detectChance(c.ch.skills.sneak, c.ch.attrs.agility, d, c.sneaking, c.moving, c.lightLevel(), c.invisible > 0);
        if (behind) chance *= 0.5;
        if (Math.random() > chance * 0.6) continue;
      }
      if (!this.canSee(c) && d > 4) continue;
      best = c; bestD = d;
    }
    return best;
  }

  setTarget(t) {
    if (t && t !== this.target) {
      if (this.def.taunts && Math.random() < 0.6) this.say(this.def.taunts[Math.floor(Math.random() * this.def.taunts.length)]);
      if (this.def.sound && this.state !== 'combat') game.playAt(this.def.sound, this.pos, 1);
    }
    this.target = t;
    this.state = t ? 'combat' : 'idle';
    if (t) this.alerted = 6;
  }

  think(dt) {
    this.thinkT -= dt;
    this.alerted = Math.max(0, this.alerted - dt);
    const def = this.def;
    const player = game.player;

    if (this.target && (this.target.dead || (this.target.isActor && this.target.cell !== undefined && !game.cell.actors.includes(this.target)))) this.setTarget(null);
    if (this.target && !isHostile(this, this.target)) this.setTarget(null);

    if (this.thinkT <= 0) {
      this.thinkT = 0.25 + Math.random() * 0.15;
      if (def.ai === 'prey') {
        // grazing animals bolt from anything that comes near
        for (const c of this.potentialTargets()) {
          if (c === this || c.def?.ai === 'prey') continue;
          // tame animals (pets, the Admiral) only run from things that would hurt them
          if (def.tame && !isHostile(this, c)) continue;
          const d = this.pos.distanceTo(c.pos);
          const shy = def.shyUnlessSneaking ? (c.isPlayer && c.sneaking ? 0 : def.shyUnlessSneaking) : def.shy ?? (c.isPlayer && c.sneaking ? 9 : 22);
          if (this.following && c.isPlayer) continue;
          if (d < shy) { this.fleeFrom = c; this.fleeT = def.shy || def.shyUnlessSneaking ? 1.2 + Math.random() : 4 + Math.random() * 3; break; }
        }
      } else if (def.ai === 'support') {
        // spirits that tend rather than fight: they only follow
      } else if (def.ai !== 'civilian') {
        const seen = this.perceive();
        if (seen && (!this.target || this.pos.distanceTo(seen.pos) < this.pos.distanceTo(this.target.pos) - 3)) this.setTarget(seen);
        if (!seen && this.target && this.pos.distanceTo(this.target.pos) > 60) this.setTarget(null);
      } else {
        // civilians flee from nearby threats
        for (const c of this.potentialTargets()) {
          if (isHostile(this, c) && this.pos.distanceTo(c.pos) < 14) { this.fleeFrom = c; this.fleeT = 6; break; }
        }
      }
      // guards arrest criminals
      if (def.ai === 'guard' && player && game.crime.bounty > 0 && !game.crime.resisting && !player.dead && game.cell.id === 'world') {
        const d = this.pos.distanceTo(player.pos);
        if (d < 25 && (d < 6 || this.canSee(player))) this.state = 'arrest';
      }
      // follow owner (summons)
      if ((def.summon || this.following) && !this.target) this.state = 'follow';
      else if (this.state === 'follow' && !this.following && !def.summon) this.state = 'idle';
    }

    this.moveDir = null;
    this.moveSpeed = 0;
    this.blocking = false;

    if (this.fleeT > 0 && this.fleeFrom) {
      this.fleeT -= dt;
      const away = tmp.copy(this.pos).sub(this.fleeFrom.pos).setY(0).normalize();
      this.moveDir = away.clone();
      this.moveSpeed = this.speed * 1.2;
      if (def.ai === 'civilian' && Math.random() < 0.01) this.say(['Help! Guards!', 'Somebody help me!', 'Run for your life!'][Math.floor(Math.random() * 3)]);
      return;
    }

    if (this.state === 'arrest' && player) {
      if (game.crime.bounty <= 0 || game.crime.resisting) { this.state = 'idle'; }
      else {
        const d = this.pos.distanceTo(player.pos);
        this.faceTo(player.pos, dt);
        if (d > 2.4) { this.moveDir = tmp.copy(player.pos).sub(this.pos).setY(0).normalize().clone(); this.moveSpeed = this.speed * 1.1; }
        if (d < 4.5 && game.state === 'playing' && this.canSee(player)) game.crime.arrest(this);
        return;
      }
    }

    if (this.state === 'combat' && this.target) return this.combatThink(dt);

    if (this.state === 'follow' && player) {
      const d = this.pos.distanceTo(player.pos);
      if (d > 4) {
        this.moveDir = tmp.copy(player.pos).sub(this.pos).setY(0).normalize().clone();
        this.moveSpeed = d > 8 ? this.speed : this.speed * 0.5;
      }
      if (d > 40) { this.pos.copy(player.pos).add(new THREE.Vector3(1.5, 0, 1.5)); }
      return;
    }

    // idle behaviours
    if (def.patrol) {
      const pt = def.patrol[this.patrolIdx];
      tmp.set(pt[0], this.pos.y, pt[1]);
      if (this.pos.distanceTo(tmp) < 1.5) {
        if ((this.waitT -= dt) <= 0) { this.patrolIdx = (this.patrolIdx + 1) % def.patrol.length; this.waitT = 2 + Math.random() * 4; }
      } else {
        this.moveDir = tmp.sub(this.pos).setY(0).normalize().clone();
        this.moveSpeed = this.speed * 0.4;
      }
      return;
    }
    if (def.stationary) {
      if (this.pos.distanceTo(this.home) > 1) {
        this.moveDir = tmp.copy(this.home).sub(this.pos).setY(0).normalize().clone();
        this.moveSpeed = this.speed * 0.4;
      } else if (player && this.pos.distanceTo(player.pos) < 5 && this.faction === 'town' && !this.noFacePlayer) {
        this.faceTo(player.pos, dt * 0.5);
      } else {
        this.yaw = turnToward(this.yaw, this.homeYaw, dt * 2);
      }
      return;
    }
    const wanderR = def.wander ?? (this.faction === 'monster' ? 12 : 0);
    if (wanderR > 0) {
      if (!this.wanderGoal) {
        if ((this.waitT -= dt) <= 0) {
          const a = Math.random() * Math.PI * 2, r = Math.random() * wanderR;
          this.wanderGoal = new THREE.Vector3(this.home.x + Math.cos(a) * r, 0, this.home.z + Math.sin(a) * r);
          this.wanderTime = 0;
        }
      } else {
        this.wanderTime += dt;
        tmp.copy(this.wanderGoal).sub(this.pos).setY(0);
        if (tmp.length() < 1 || this.wanderTime > 15) { this.wanderGoal = null; this.waitT = 3 + Math.random() * 6; }
        else { this.moveDir = tmp.normalize().clone(); this.moveSpeed = this.speed * 0.35; }
      }
      // townsfolk greet the player
      if (player && this.faction === 'town' && this.pos.distanceTo(player.pos) < 3.5 && !this.wanderGoal) this.faceTo(player.pos, dt);
    }
  }

  combatThink(dt) {
    const t = this.target;
    const def = this.def;
    const d = Math.hypot(t.pos.x - this.pos.x, t.pos.z - this.pos.z);
    const toT = tmp.copy(t.pos).sub(this.pos).setY(0).normalize().clone();
    this.faceTo(t.pos, dt * 1.5);
    const reachD = this.reach + (t.radius || 0.4) * 0.6;

    // leash
    if (!def.summon && this.pos.distanceTo(this.home) > 90 && def.ai !== 'guard') { this.setTarget(null); this.state = 'return'; return; }

    const busy = this.attackT >= 0 || this.castT >= 0 || this.drawT >= 0;
    const canCast = def.spells && this.magicka >= 15 && this.cooldown <= 0;

    if (def.ai === 'archer' && this.weapon?.skill === 'marksman') {
      if (d < 5) { this.moveDir = toT.clone().negate(); this.moveSpeed = this.speed * 0.8; }
      else if (d > this.reach * 0.9 || !this.canSee(t)) { this.moveDir = toT; this.moveSpeed = this.speed * 0.8; }
      if (!busy && this.cooldown <= 0 && d < this.reach && this.canSee(t)) { this.drawT = 0; game.playAt('bowDraw', this.pos, 0.6); }
      return;
    }
    if (def.ai === 'caster' && canCast && d < (def.reach || 18) && d > 3 && !busy && this.canSee(t)) {
      this.startCast(def.spells[Math.floor(Math.random() * def.spells.length)]);
      return;
    }
    if (canCast && def.ai === 'melee' && d > 6 && d < 18 && !busy && Math.random() < 0.02) {
      this.startCast(def.spells[0]);
      return;
    }
    if (def.ai === 'caster' && d > 3 && d < 8 && !busy) {
      // keep some distance while magicka recharges
      this.moveDir = toT.clone().negate(); this.moveSpeed = this.speed * 0.6;
    }

    if (d > reachD * 0.8 && (!busy || this.attackT > 0.6)) {
      this.moveDir = toT;
      this.moveSpeed = this.speed * (this.slowT > 0 ? 0.5 : 1) * (d > reachD ? 1 : 0.4);
    }
    if (d <= reachD && !busy) {
      // in range
      const blockChance = def.block || 0;
      if (t.isAttacking && blockChance && Math.random() < blockChance) {
        this.blockT = 0.6 + Math.random() * 0.6;
      }
      if (this.blockT > 0) { this.blocking = true; }
      else if (this.cooldown <= 0) {
        this.attackT = 0;
        this.anim.attackKind = this.attackKind === 'slash' && Math.random() < 0.25 ? 'power' : this.attackKind;
        this.hasHit = false;
        game.playAt(this.anim.attackKind === 'power' ? 'swingHeavy' : 'swing', this.pos, 0.7);
      } else if (Math.random() < 0.01) {
        // circle-strafe a little
        this.moveDir = new THREE.Vector3(-toT.z, 0, toT.x).multiplyScalar(Math.random() < 0.5 ? 1 : -1);
        this.moveSpeed = this.speed * 0.4;
      }
    }
  }

  startCast(spellId) {
    this.castT = 0;
    this.castSpellId = spellId;
    this.hasCast = false;
  }

  combatTimers(dt) {
    this.cooldown -= dt;
    this.blockT -= dt;
    this.slowT -= dt;
    const rate = (this.def.attackRate || 1) * (this.slowT > 0 ? 0.6 : 1);
    if (this.attackT >= 0) {
      const dur = (this.anim.attackKind === 'power' ? 1.15 : 0.85) / rate;
      this.attackT += dt / dur;
      if (!this.hasHit && this.attackT >= (this.anim.attackKind === 'power' ? 0.55 : 0.45)) {
        this.hasHit = true;
        meleeStrike(this, this.anim.attackKind === 'power');
      }
      if (this.attackT >= 1) { this.attackT = -1; this.cooldown = 0.3 + Math.random() * 1.0; }
    }
    if (this.drawT >= 0) {
      this.drawT += dt / 1.1;
      if (this.drawT >= 1) {
        this.drawT = -1;
        if (this.target && !this.target.dead) {
          fireArrow(this, this.target, 1);
        }
        this.cooldown = 1.2 + Math.random() * 1.2;
      }
    }
    if (this.castT >= 0) {
      this.castT += dt / 0.8;
      // magic gathers in the caster's hand
      const sp = SPELLS[this.castSpellId];
      const hand = this.rig.R?.hand;
      if (sp && hand && this.castT < 0.5 && game.particles) {
        hand.getWorldPosition(tmp);
        const c = new THREE.Color(sp.color);
        for (let i = 0; i < 2; i++) {
          const a = Math.random() * Math.PI * 2, rr = 0.25 + Math.random() * 0.15;
          game.particles.emit({ x: tmp.x + Math.cos(a) * rr, y: tmp.y + (Math.random() - 0.5) * 0.3, z: tmp.z + Math.sin(a) * rr, vx: -Math.cos(a) * 1.2, vy: 0.2, vz: -Math.sin(a) * 1.2, drag: 2, life: 0.3, size: 0.14, color: c });
        }
      }
      if (!this.hasCast && this.castT >= 0.5) {
        this.hasCast = true;
        const sp = SPELLS[this.castSpellId];
        if (sp && this.target) {
          this.magicka -= sp.cost;
          castBolt(this, sp, this.target);
        }
      }
      if (this.castT >= 1) { this.castT = -1; this.cooldown = 1.5 + Math.random() * 1.5; }
    }
  }

  faceTo(p, k) {
    const want = Math.atan2(p.x - this.pos.x, p.z - this.pos.z);
    this.yaw = turnToward(this.yaw, want, Math.max(0, k) * 6);
  }

  move(dt) {
    const cell = game.cell;
    const col = cell.collision;
    let vx = 0, vz = 0;
    if (this.moveDir && this.moveSpeed > 0) {
      let dir = this.moveDir;
      if (this.avoidT > 0) {
        this.avoidT -= dt;
        const c = Math.cos(this.avoid), s = Math.sin(this.avoid);
        dir = new THREE.Vector3(dir.x * c - dir.z * s, 0, dir.x * s + dir.z * c);
      }
      vx = dir.x * this.moveSpeed;
      vz = dir.z * this.moveSpeed;
      if (this.state !== 'combat' || this.attackT < 0) {
        const want = Math.atan2(dir.x, dir.z);
        if (this.state !== 'combat' || this.fleeT > 0) this.yaw = turnToward(this.yaw, want, dt * 6);
      }
    }
    const ox = this.pos.x, oz = this.pos.z;
    this.pos.x += vx * dt;
    this.pos.z += vz * dt;
    // keep land creatures out of deep water
    if (cell.waterLevel !== undefined && this.def.body.kind !== 'crab') {
      const gh = col.ground(this.pos.x, this.pos.z);
      if (gh < cell.waterLevel - 0.9 && col.ground(ox, oz) >= gh) { this.pos.x = ox; this.pos.z = oz; }
    }
    // a perched animal (on a rail, on your lap) stays exactly where it was put
    const free = this.perch === undefined;
    if (free) col.resolve(this.pos, this.radius, this.height);
    // separation from other actors
    if (free) for (const o of cell.actors) {
      if (o === this || o.dead) continue;
      const dx = this.pos.x - o.pos.x, dz = this.pos.z - o.pos.z;
      const min = this.radius + o.radius;
      const d2 = dx * dx + dz * dz;
      if (d2 < min * min && d2 > 1e-6) {
        const d = Math.sqrt(d2), push = (min - d) * 0.5;
        this.pos.x += (dx / d) * push; this.pos.z += (dz / d) * push;
      }
    }
    const p = game.player;
    if (p && !p.dead && free) {
      const dx = this.pos.x - p.pos.x, dz = this.pos.z - p.pos.z;
      const min = this.radius + p.radius;
      const d2 = dx * dx + dz * dz;
      if (d2 < min * min && d2 > 1e-6) { const d = Math.sqrt(d2); this.pos.x += (dx / d) * (min - d); this.pos.z += (dz / d) * (min - d); }
    }
    // ground (or a perch: a ship's rail, a lap)
    const g = this.perch ?? col.groundHeight(this.pos.x, this.pos.z, this.pos.y, this.radius);
    if (this.perch !== undefined) { this.pos.y = this.perch; this.vy = 0; } else if (this.pos.y > g + 0.05) {
      this.vy -= 20 * dt;
      this.pos.y += this.vy * dt;
      if (this.pos.y < g) { this.pos.y = g; this.vy = 0; }
    } else {
      this.pos.y = g;
      this.vy = 0;
    }
    // stuck detection
    const moved = Math.hypot(this.pos.x - ox, this.pos.z - oz);
    const speed = dt > 0 ? moved / dt : 0;
    if (this.moveSpeed > 0.5 && speed < this.moveSpeed * 0.25) {
      this.stuckT += dt;
      if (this.stuckT > 0.5) { this.avoid = (Math.random() < 0.5 ? 1 : -1) * (Math.PI / 2.2); this.avoidT = 0.9; this.stuckT = 0; }
    } else this.stuckT = 0;
    this.anim.moveSpeed = speed;
    this.anim.phase += speed * dt * (this.rig.type === 'crab' ? 3 : 2.1) / Math.max(0.6, this.height * 0.55);
    if (this.rig.type === 'humanoid') this.anim.weaponOut = this.state === 'combat' || (!!this.weapon && this.faction !== 'town');
  }

  // ------------------------------------------------------------- damage
  onHit(attacker, amount) {
    this.anim.stagger = 1;
    if (this.attackT >= 0 && this.attackT < 0.4 && amount > this.maxHealth * 0.15) this.attackT = -1;
    if (attacker && !attacker.dead && attacker !== this) {
      if (attacker.isPlayer && this.def.cultist && !game.flags.dawnExposed) game.exposeDisguise(this);
      if (attacker.isPlayer && this.faction === 'town') {
        if (!this.hostileToPlayer) game.crime.assault(this);
      }
      if (attacker.isPlayer && this.faction === 'neutral' && !this.hostileToPlayer) game.provokeBand(this);
      if (this.def.ai === 'civilian' || this.def.ai === 'prey') { this.fleeFrom = attacker; this.fleeT = 8; }
      else if (isHostile(this, attacker) || attacker.isPlayer) this.setTarget(attacker);
    }
    // alert nearby allies
    for (const o of game.cell.actors) {
      if (o === this || o.dead || o.faction !== this.faction || o.target) continue;
      if (o.pos.distanceTo(this.pos) < 20 && attacker && isHostile(o, attacker)) o.setTarget(attacker);
    }
  }

  die(killer) {
    if (this.dead) return;
    if (this.essential) {
      // essential characters are knocked out instead
      this.health = 1;
      this.anim.stagger = 1;
      this.fleeT = 3; this.fleeFrom = killer;
      if (killer?.isPlayer) game.ui.notify(`${this.name} is essential and has been knocked unconscious.`);
      return;
    }
    this.dead = true;
    this.deathTime = game.time.hours;
    this.attackT = this.castT = this.drawT = -1;
    this.target = null;
    game.playAt(this.def.undead ? 'rattle' : 'die', this.pos, 0.8);
    if (this.weaponMesh && this.rig.type === 'humanoid') this.weaponMesh.visible = false;
    if (this.def.ghostly) {
      game.particles.burst(this.center(), 'magic', 30, 0x9ab0e0);
      this.group.visible = false;
    }
    game.onActorDeath(this, killer);
  }

  unsummon() {
    this.dead = true;
    this.group.visible = false;
    game.particles.burst(this.center(), 'magic', 30, 0xc0c0ff);
    game.removeActor(this);
  }
}

export function turnToward(cur, want, maxStep) {
  let d = want - cur;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  if (Math.abs(d) <= maxStep) return want;
  return cur + Math.sign(d) * maxStep;
}
