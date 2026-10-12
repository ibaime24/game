// The player: character sheet, movement physics, combat and magic.
import * as THREE from 'three';
import { game } from './game.js';
import {
  createCharacter, maxMagicka, maxFatigue, carryWeight, magickaRegen, fatigueRegen, runSpeed, jumpVelocity,
  exerciseSkill, spellCost, SKILLS, CLASSES, BIRTHSIGNS, baseHealth,
} from './data/stats.js';
import { ITEMS, Inventory, parseSpec } from './data/items.js';
import { SPELLS } from './data/spells.js';
import { meleeStrike } from './combat.js';
import { buildHumanoid, buildWeaponMesh, buildShieldMesh, animateRig, attachBow } from './actors/models.js';
import { buildKitRig } from './actors/kitRig.js';
import { isKitReady } from './actors/characterKit.js';
import { RACES } from './data/stats.js';
import { buildLightMesh, waterproofLight } from './fx/torch.js';
import { attachBladeFx } from './fx/bladefx.js';
import { snowCover, roadDistance } from './world/layout.js';
import { Actor, dressExtras } from './actors/actor.js';

const EYE = 1.62;
const tmp = new THREE.Vector3();
const _tq = new THREE.Quaternion(), _te = new THREE.Euler();

// third-person casting clips for each gesture
const CAST_CLIPS = { push: 'Spell_Simple_Shoot', raise: 'OverhandThrow', sweep: 'Melee_Hook', slam: 'Shield_OneShot', pull: 'Interact', self: 'Consume', flick: 'Punch_Jab' };

export class Player {
  constructor() {
    this.isPlayer = true;
    this.name = 'Player';
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.radius = 0.35;
    this.height = 1.75;
    this.onGround = true;
    this.sneaking = false;
    this.moving = false;
    this.swimming = false;
    this.dead = false;
    this.thirdPerson = false;
    this.camDist = 3.2;
    this.ch = createCharacter({});
    this.inventory = new Inventory();
    this.equipped = {};
    this.spells = ['flare', 'heal_minor'];
    this.selectedSpell = 'flare';
    this.powersUsed = {};
    this.hotkeys = {};
    this.resetCombat();
    this.effects = { shield: 0, shieldT: 0, lightT: 0, detectT: 0, invisT: 0 };
    this.stepAccum = 0;
    this.shakeT = 0;
    this.hurtFlash = 0;
    this.fallStartY = null;
    this.summon = null;
    this.overEncMsgT = 0;
    this.recalc(true);
  }

  resetCombat() {
    this.weaponOut = false;
    this.attackT = -1;
    this.attackKind = 'slash';
    this.attackHold = -1;
    this.hasHit = false;
    this.blocking = false;
    this.castT = -1;
    this.pendingSpell = null;
    this.drawT = -1;
    this.drawing = false;
    this.cooldown = 0;
  }

  // ------------------------------------------------------------ character
  newCharacter(opts) {
    this.ch = createCharacter(opts);
    this.name = opts.name;
    this.inventory = new Inventory();
    this.equipped = {};
    const C = CLASSES[opts.cls];
    const B = BIRTHSIGNS[opts.sign];
    this.spells = ['flare', 'heal_minor', ...(C.spells || []), ...(B.spells || [])];
    if (B.power) this.spells.push(B.power);
    this.spells = [...new Set(this.spells)];
    this.selectedSpell = 'flare';
    this.inventory.add('gold', 25);
    this.inventory.add('potion_health_light', 2);
    this.inventory.add('bread', 1);
    this.inventory.add('amulet_of_kings', 1);
    this.inventory.add('torch', 1);
    this.stowedShield = null;
    for (const spec of [...C.kit, ...(B.items || [])]) {
      const [id, n] = parseSpec(spec);
      this.inventory.add(id, n);
      const it = ITEMS[id];
      if (it.type === 'weapon' || it.type === 'armor') {
        if (!(it.type === 'weapon' && this.equipped.weapon && it.skill === 'marksman')) this.equip(id, true);
      }
      if (it.type === 'arrow') this.equipped.arrow = id;
    }
    this.recalc(true);
    this.rebuildModel();
  }

  get maxHealth() { return baseHealth(this.ch) + (this.fortify('fortifyHealth')); }
  get maxMagicka() { return maxMagicka(this.ch, this.fortify('fortifyMagicka')); }
  get maxFatigue() { return maxFatigue(this.ch); }

  fortify(key) {
    let s = 0;
    for (const id of Object.values(this.equipped)) if (id && ITEMS[id]?.[key]) s += ITEMS[id][key];
    return s;
  }

  recalc(fill = false) {
    if (fill || this.health === undefined) {
      this.health = this.maxHealth;
      this.magicka = this.maxMagicka;
      this.fatigue = this.maxFatigue;
    }
    this.health = Math.min(this.health, this.maxHealth);
    this.magicka = Math.min(this.magicka, this.maxMagicka);
    this.fatigue = Math.min(this.fatigue, this.maxFatigue);
  }

  equippedWeapon() {
    return this.equipped.weapon ? ITEMS[this.equipped.weapon] : null;
  }

  hasBow() { return this.equippedWeapon()?.skill === 'marksman'; }

  reach() {
    const w = this.equippedWeapon();
    return w && w.skill !== 'marksman' ? w.reach : 1.9;
  }

  armorRating() {
    let ar = 0;
    for (const [slot, id] of Object.entries(this.equipped)) {
      if (slot === 'weapon' || slot === 'arrow' || !id) continue;
      const it = ITEMS[id];
      if (it.type !== 'armor' || !it.rating) continue;
      const skill = it.armorType === 'heavy' ? this.ch.skills.heavyarmor : this.ch.skills.lightarmor;
      ar += it.rating * (0.6 + skill * 0.012);
    }
    return Math.round(ar);
  }

  exerciseArmor() {
    let light = 0, heavy = 0;
    for (const id of Object.values(this.equipped)) {
      const it = id && ITEMS[id];
      if (it?.type !== 'armor') continue;
      if (it.armorType === 'light') light++; else if (it.armorType === 'heavy') heavy++;
    }
    if (light) this.exercise('lightarmor', 0.25 * light);
    if (heavy) this.exercise('heavyarmor', 0.25 * heavy);
  }

  exercise(skill, amount = 1) {
    const events = exerciseSkill(this.ch, skill, amount);
    for (const e of events) {
      if (e.type === 'skill') {
        game.ui.notify(`Your ${SKILLS[e.skill][0]} skill has increased to ${e.value}.`, 'skill');
        game.audio.play('skillUp', 0.8);
      } else if (e.type === 'levelReady') {
        game.ui.notify(`Level up! Press U to choose an attribute.`, 'level');
        game.audio.play('levelUp', 0.6);
      }
    }
  }

  // ------------------------------------------------------------ equipment
  equip(id, silent = false) {
    const it = ITEMS[id];
    if (!it || !this.inventory.has(id)) return;
    if (it.type === 'weapon') {
      this.equipped.weapon = id;
      if (it.skill === 'marksman' && !this.equipped.arrow) {
        const ar = ['steel_arrow', 'iron_arrow'].find((a) => this.inventory.has(a));
        if (ar) this.equipped.arrow = ar;
      }
    } else if (it.type === 'armor' || it.type === 'light') {
      this.equipped[it.slot] = id;
    } else if (it.type === 'arrow') {
      this.equipped.arrow = id;
    } else return;
    if (!silent) game.audio.play('pickup');
    this.recalc();
    this.rebuildModel();
    game.viewmodel?.rebuild();
  }

  unequip(slot) {
    if (ITEMS[this.equipped[slot]]?.quest && slot === 'amulet') { /* allowed */ }
    delete this.equipped[slot];
    this.recalc();
    this.rebuildModel();
    game.viewmodel?.rebuild();
  }

  isEquipped(id) {
    return Object.values(this.equipped).includes(id);
  }

  removeItem(id, n = 1) {
    const r = this.inventory.remove(id, n);
    if (!this.inventory.has(id)) {
      for (const [slot, eid] of Object.entries(this.equipped)) if (eid === id) this.unequip(slot);
    }
    return r;
  }

  use(id) {
    const it = ITEMS[id];
    if (!it || !this.inventory.has(id)) return;
    if (it.type === 'light') {
      if (this.equipped.shield === id || !this.torchLit) this.toggleTorch(false, this.torchLit ? undefined : id);
      else { this.toggleTorch(true); this.toggleTorch(false, id); }
      return;
    }
    if (it.type === 'weapon' || it.type === 'armor' || it.type === 'arrow') {
      const slot = it.type === 'weapon' ? 'weapon' : it.type === 'arrow' ? 'arrow' : it.slot;
      if (this.equipped[slot] === id) this.unequip(slot); else this.equip(id);
      return;
    }
    if (it.madlute) { game.playMadLute(); return; }
    if (it.onUse) { game[it.onUse]?.(id); return; }
    if (it.type === 'potion' || it.type === 'ingredient' || it.usable) {
      for (const e of it.effects || []) this.restore(e.type, e.amount);
      this.removeItem(id, 1);
      if (it.type === 'ingredient') { this.exercise('alchemy', 0.5); game.audio.play('eat'); }
      else game.audio.play('drink');
      game.particles.burst(this.pos, 'heal', 12, it.color || 0x80ff90);
      game.ui.notify(`${it.name} consumed.`);
      return;
    }
    if (it.atlas) {
      // the Atlas of Hours gives back the day's lost hours, once per day
      const day = game.day();
      if (game.flags.atlasDay !== day) {
        game.flags.atlasDay = day;
        this.health = this.maxHealth; this.magicka = this.maxMagicka; this.fatigue = this.maxFatigue;
        game.audio.play('chime', 0.8);
        game.particles.burst(this.pos, 'heal', 30, 0x9ad0ff);
        game.ui.notify('The hours you lost today come quietly back to you.');
      }
      game.ui.showBook(it);
      return;
    }
    if (it.type === 'book') {
      game.ui.showBook(it);
      if (id === 'commentaries_1' && game.quests.stage('mq_dawn') === 20) game.quests.set('mq_dawn', 30, game.day());
    }
  }

  /** Is the body model on screen (third person, or holding V to look at yourself)? */
  get showBody() { return this.thirdPerson || !!this.frontView; }

  get torchLit() { return ITEMS[this.equipped.shield]?.type === 'light'; }

  /** Light the torch (stowing the shield) or douse it (taking the shield back up). */
  toggleTorch(silent = false, want) {
    if (this.torchLit) {
      const back = this.stowedShield;
      this.stowedShield = null;
      delete this.equipped.shield;
      if (back && this.inventory.has(back)) this.equipped.shield = back;
      this.recalc(); this.rebuildModel(); game.viewmodel?.rebuild();
      if (!silent) game.audio.play('douse', 0.7);
      return;
    }
    // the best light you carry: Maela's lantern over a common torch
    const torch = want ?? Object.keys(ITEMS).filter((id) => ITEMS[id].type === 'light' && this.inventory.has(id)).sort((a, b) => (ITEMS[b].rank || 0) - (ITEMS[a].rank || 0))[0];
    if (!torch) { if (!silent) game.ui.notify('You have no torch.'); return; }
    if (this.swimming && !waterproofLight(ITEMS[torch])) { if (!silent) game.ui.notify('You can\'t light a torch in the water.'); return; }
    this.stowedShield = ITEMS[this.equipped.shield]?.type === 'armor' ? this.equipped.shield : null;
    this.equip(torch, true);
    if (!silent) game.audio.play('torch', 0.8);
  }

  restore(type, amount) {
    if (type === 'health') this.health = Math.min(this.maxHealth, this.health + amount);
    if (type === 'magicka') this.magicka = Math.min(this.maxMagicka, this.magicka + amount);
    if (type === 'fatigue') this.fatigue = Math.min(this.maxFatigue, this.fatigue + amount);
  }

  encumbrance() { return this.inventory.weight(); }
  carryLimit() { return carryWeight(this.ch); }

  // ------------------------------------------------------------ model (third person)
  rebuildModel() {
    if (this.model && game.scene) this.model.root.parent?.remove(this.model.root);
    const R = RACES[this.ch.race];
    const armor = {};
    let robe = false;
    for (const slot of ['chest', 'head', 'legs', 'feet', 'hands']) {
      const it = this.equipped[slot] && ITEMS[this.equipped[slot]];
      if (!it) continue;
      if (it.armorType === 'cloth') { if (slot === 'chest') robe = it.id === 'mage_robe'; continue; }
      armor[slot] = it.color;
    }
    const chestCloth = this.equipped.chest && ITEMS[this.equipped.chest].armorType === 'cloth' ? ITEMS[this.equipped.chest].color : null;
    const modelOpts = {
      skin: R.skin, hair: R.hair, head: R.beast === 'cat' ? 'cat' : R.beast === 'lizard' ? 'lizard' : R.tusks ? 'orc' : 'human',
      elfEars: ['altmer', 'dunmer', 'bosmer'].includes(this.ch.race), tail: !!R.beast, tailColor: R.skin,
      shirt: chestCloth ?? 0x8a7a60, pants: 0x5a4a3a, armor, robe,
      hairStyle: this.ch.female ? 'long' : 'short', scale: this.ch.race === 'altmer' ? 1.05 : 1, female: !!this.ch.female,
    };
    // unique armour sets are sculpted piece by piece onto the skeleton
    const armorSets = {};
    for (const slot of ['head', 'chest', 'hands', 'legs', 'feet']) { const it = this.equipped[slot] && ITEMS[this.equipped[slot]]; if (it?.set) armorSets[slot] = it.set; }
    // the cloth under a legendary set takes the set's own colour, unwashed
    const SET_CLOTH = { starwarden: 0x2a3a88, emberforge: 0x3a2420, frostbloom: 0xc4d2e4 };
    this.modelOpts = { ...modelOpts, kitTint: chestCloth ?? (armorSets.chest ? SET_CLOTH[armorSets.chest] : undefined), kitTintExact: !!armorSets.chest && chestCloth == null, armorSets };
    if (!game.scene) return;
    const built = this.buildRig();
    this.model = built.model;
    this.modelWeapon = built.weapon;
    this.modelTorch = built.torch;
    this.model.root.visible = this.showBody;
    game.scene.add(this.model.root);
    this.modelAnim = { phase: 0, moveSpeed: 0, attack: -1, block: false, cast: -1, dead: 0, stagger: 0, draw: -1 };
  }

  /** A body in the player's current gear: the third-person model, or the inventory's portrait. */
  buildRig(o = {}) {
    const model = (isKitReady() && buildKitRig(this.modelOpts)) || buildHumanoid(this.modelOpts);
    // hats you wear (Brisk's tricorn, the Hollow King's crown) sit on your own head too
    const headItem = this.equipped.head && ITEMS[this.equipped.head];
    if (headItem?.hat) dressExtras(model, { hat: headItem.hat, scale: this.modelOpts.scale });
    let weapon = null, torch = null;
    const w = this.equippedWeapon();
    if (w?.look) {
      const m = buildWeaponMesh(w.look);
      if (w.skill === 'marksman') { if (model.bowSlot) model.bowSlot.add(m); else attachBow(model.L.hand, m); }
      else { model.weaponSlot.add(m); if (!o.portrait) attachBladeFx(m, w.look, { world: true }); }
      weapon = m;
    }
    if (this.torchLit) {
      torch = buildLightMesh(ITEMS[this.equipped.shield]);
      (model.bowSlot ?? model.L.hand).add(torch);
      model.holdTorch = true;
    } else if (this.equipped.shield) {
      model.shieldSlot.add(buildShieldMesh(ITEMS[this.equipped.shield].color));
      model.hasShield = true;
    }
    return { model, weapon, torch };
  }

  attachModel(scene) {
    if (!this.model || (!this.model.kit && isKitReady())) this.rebuildModel();
    else scene.add(this.model.root);
  }

  // ------------------------------------------------------------ helpers
  forward(out = tmp) {
    return out.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }
  lookDir(out = new THREE.Vector3()) {
    return out.set(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch));
  }
  // seated, the eye is a fixed height above the floor the chair stands on, whatever the chair's collider does to pos.y
  eyeHeight() { return this.seated ? this.seated.y + 1.12 - this.pos.y : this.sneaking ? 1.15 : EYE; }
  eye(out = new THREE.Vector3()) { return out.set(this.pos.x, this.pos.y + this.eyeHeight(), this.pos.z); }
  center(out = new THREE.Vector3()) { return out.set(this.pos.x, this.pos.y + 1.0, this.pos.z); }
  get isAttacking() { return this.attackT >= 0 && this.attackT < 0.6; }
  get invisible() { return this.effects.invisT; }

  lightLevel() {
    if (this.effects.lightT > 0) return 1;
    if (this.torchLit) return 0.95;
    const c = game.cell;
    if (!c || c.interior) return c?.lightLevel ?? 0.6;
    return 1 - game.sky.night * 0.6;
  }

  shake(a) { this.shakeT = Math.max(this.shakeT, a); }

  onHit(attacker, amount, hit) {
    this.hurtFlash = Math.min(1, this.hurtFlash + 0.35 + amount / 40);
    if (!hit.blocked) game.audio.play('hurt', 0.7);
    this.shake(0.25);
    if (hit.power && !hit.blocked) this.attackT = -1;
    game.onPlayerAttacked(attacker);
  }

  die() {
    if (this.dead) return;
    this.dead = true;
    game.audio.play('die');
    game.onPlayerDeath();
  }

  // ------------------------------------------------------------ magic
  canCast(sp) {
    if (sp.power) {
      const day = Math.floor(game.time.hours / 24);
      if (this.powersUsed[sp.id] === day) return 'You can only use this power once a day.';
      return null;
    }
    if (this.silenceT > 0) return 'You have been silenced. The words will not come.';
    const skill = this.ch.skills[sp.school];
    if (skill < sp.min) return `Your ${SKILLS[sp.school][0]} skill is too low to cast ${sp.name}.`;
    if (this.magicka < spellCost(sp.cost, skill)) return 'You do not have enough Magicka to cast this spell.';
    return null;
  }

  startCast() {
    if (this.castT >= 0 || this.attackT >= 0 || this.drawT >= 0) return;
    const sp = SPELLS[this.selectedSpell];
    if (!sp) return;
    const err = this.canCast(sp);
    if (err) { game.ui.notify(err); game.audio.play('spellFail'); return; }
    if (sp.power) this.powersUsed[sp.id] = Math.floor(game.time.hours / 24);
    else this.magicka -= spellCost(sp.cost, this.ch.skills[sp.school]);
    this.castT = 0;
    this.castAnim = sp.anim || 'push';
    this.pendingSpell = sp;
    this.blocking = false;
  }

  performSpell(sp) {
    const skill = this.ch.skills[sp.school];
    const mag = 1 + skill / 200;
    const eye = this.eye();
    const dir = this.lookDir();
    switch (sp.kind) {
      case 'special': game.spellbook.cast(this, sp); break;
      case 'bolt': {
        const from = eye.clone().addScaledVector(dir, 0.8);
        from.y -= 0.15;
        game.audio.play(sp.element === 'shock' ? 'shockCast' : sp.element === 'frost' ? 'frostCast' : 'fireCast', 0.9);
        game.projectiles.spawn({ kind: 'spell', pos: from, dir, speed: sp.speed, owner: this, spell: sp, damage: Math.round(sp.damage * mag), color: sp.color, radius: sp.radius });
        break;
      }
      case 'self':
        if (sp.heal) { this.health = Math.min(this.maxHealth, this.health + sp.heal * mag); game.audio.play('heal'); }
        if (sp.shield) { this.effects.shield = sp.shield; this.effects.shieldT = sp.duration; game.audio.play('spellGeneric'); }
        game.magic.selfCast(this.pos, sp);
        game.ui.screenFlash?.(sp.color);
        break;
      case 'unlock': {
        game.audio.play('spellGeneric');
        if (game.interaction.target?.pos) game.particles.burst(game.interaction.target.pos, 'magic', 30, sp.color);
        const tgt = game.interaction.target;
        if (tgt?.lock) {
          if (tgt.lock.level <= sp.lockLevel) { tgt.lock = null; game.audio.play('unlock'); game.ui.notify('The lock opens.'); }
          else game.ui.notify('This lock is too difficult for this spell.');
        } else game.ui.notify('There is nothing to unlock.');
        break;
      }
      case 'summon': {
        if (this.summon && !this.summon.dead) this.summon.unsummon();
        const at = this.pos.clone().addScaledVector(this.forward(new THREE.Vector3()), 2.5);
        at.y = game.cell.collision.groundHeight(at.x, at.z, this.pos.y + 1);
        const a = new Actor(sp.creature, at.x, at.y, at.z, { duration: sp.duration * mag });
        a.yaw = this.yaw + Math.PI;
        game.addActor(a);
        this.summon = a;
        game.audio.play('conjure');
        game.magic.summon(at, sp.color);
        break;
      }
      case 'light':
        this.effects.lightT = sp.duration * mag;
        game.magic.runeCircle(this.pos, sp.color, { radius: 1, dur: 1.4 });
        game.ui.screenFlash?.(sp.color);
        game.audio.play('spellGeneric');
        break;
      case 'detect':
        this.effects.detectT = sp.duration * mag;
        game.magic.runeCircle(this.pos, sp.color, { radius: 1, dur: 1.4 });
        game.ui.screenFlash?.(sp.color);
        game.audio.play('spellGeneric');
        break;
      case 'invisibility':
        this.effects.invisT = sp.duration;
        game.magic.runeCircle(this.pos, sp.color, { radius: 1, dur: 1.4 });
        game.ui.screenFlash?.(sp.color);
        game.audio.play('spellGeneric');
        game.ui.notify('You fade from sight.');
        break;
    }
    if (!sp.power) this.exercise(sp.school, 1);
  }

  // ------------------------------------------------------------ update
  update(dt, input) {
    const cell = game.cell;
    const col = cell.collision;
    if (this.dead) return;

    // ---- look
    if (input.locked) {
      this.yaw -= input.mouse.dx * input.sensitivity;
      this.pitch -= input.mouse.dy * input.sensitivity * (input.invertY ? -1 : 1);
      this.pitch = Math.max(-1.5, Math.min(1.5, this.pitch));
    }
    if (input.mouse.wheel && this.thirdPerson) this.camDist = Math.max(1.5, Math.min(8, this.camDist + input.mouse.wheel * 0.5));

    // ---- toggles
    if (input.wasPressed('KeyC')) { this.sneaking = !this.sneaking; }
    if (input.wasPressed('KeyF')) { this.thirdPerson = !this.thirdPerson; if (this.model) this.model.root.visible = this.thirdPerson; }
    if (input.wasPressed('KeyL')) this.toggleTorch();
    // hold V to swing the camera round in front of you and see yourself
    this.frontView = input.isDown('KeyV');
    if (input.wasPressed('KeyR')) { this.weaponOut = !this.weaponOut; game.audio.play(this.weaponOut ? 'swing' : 'pickup', 0.4); }

    // ---- seated (the Captain's armchair): any step, jump, swing or spell gets you up again
    if (this.seated) {
      const stir = ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyQ', 'KeyR', 'KeyC'].some((k) => input.isDown(k)) || input.mouseDown(0) || input.mouseDown(2);
      if (stir) game.standUp(true);
      else { this.pos.x = this.seated.x; this.pos.z = this.seated.z; this.vel.set(0, this.vel.y, 0); }
    }

    // ---- movement
    const enc = this.encumbrance() > this.carryLimit();
    let mx = 0, mz = 0;
    if (this.seated) { /* sitting still */ } else if (input.isDown('KeyW') || input.isDown('ArrowUp')) mz -= 1;
    if (input.isDown('KeyS') || input.isDown('ArrowDown')) mz += 1;
    if (input.isDown('KeyA') || input.isDown('ArrowLeft')) mx -= 1;
    if (input.isDown('KeyD') || input.isDown('ArrowRight')) mx += 1;
    const len = Math.hypot(mx, mz);
    this.moving = len > 0 && !enc;
    if (enc && len > 0 && (this.overEncMsgT -= dt) <= 0) { game.ui.notify('You are carrying too much to be able to move.'); this.overEncMsgT = 3; }
    let speed = runSpeed(this.ch);
    const sprint = input.isDown('ShiftLeft') && this.fatigue > 5 && this.moving && !this.sneaking;
    if (sprint) { speed *= 1.45; this.fatigue -= dt * 12; this.exercise('athletics', dt * 0.12); }
    else if (this.moving) this.exercise('athletics', dt * 0.04);
    if (this.sneaking) { speed *= 0.45; if (this.moving) this.exercise('sneak', dt * 0.05 * (game.anyEnemyNear(15) ? 3 : 1)); }
    if (this.blocking) speed *= 0.6;
    if (this.drawT >= 0) speed *= 0.6;
    if (this.slowT > 0) { speed *= 0.6; this.slowT -= dt; }
    if (this.effects.hasteT > 0) speed *= 1.6;
    const fatigueFactor = 0.75 + 0.25 * (this.fatigue / this.maxFatigue);
    speed *= fatigueFactor;
    if (this.swimming) speed *= 0.55;

    let wx = 0, wz = 0;
    if (this.moving) {
      const s = Math.sin(this.yaw), c = Math.cos(this.yaw);
      const fx = mx / len, fz = mz / len;
      wx = (fx * c + fz * s) * speed;
      wz = (-fx * s + fz * c) * speed;
    }
    const control = this.onGround || this.swimming ? 1 : 0.15;
    const k = Math.min(1, dt * (this.onGround ? 14 : 3));
    this.vel.x += (wx - this.vel.x) * k * control + (control < 1 ? (wx - this.vel.x) * dt * 0.5 : 0);
    this.vel.z += (wz - this.vel.z) * k * control + (control < 1 ? (wz - this.vel.z) * dt * 0.5 : 0);

    // jumping / swimming / gravity
    const water = cell.waterLevel;
    const ground = col.groundHeight(this.pos.x, this.pos.z, this.pos.y, this.radius);
    this.swimming = water !== undefined && ground < water - 1.35 && this.pos.y < water - 1.2;
    if (this.swimming) {
      const target = water - 1.35;
      this.vel.y += (target - this.pos.y) * dt * 6 - this.vel.y * dt * 3;
      if (input.isDown('Space')) this.vel.y += dt * 6;
      this.fallStartY = null;
      if (this.moving) this.exercise('athletics', dt * 0.06);
    } else {
      if (input.wasPressed('Space') && this.onGround && this.fatigue > 3 && !enc) {
        this.vel.y = jumpVelocity(this.ch);
        this.onGround = false;
        this.fatigue -= 4;
        this.exercise('acrobatics', 0.35);
      }
      // Leap of the Kestrel: drift down like a feather
      this.vel.y -= (this.effects.featherT > 0 && this.vel.y < 0 ? 5 : 20) * dt;
      if (this.effects.featherT > 0) this.vel.y = Math.max(this.vel.y, -3.5);
    }

    const prev = this.pos.clone();
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    this.pos.y += this.vel.y * dt;
    col.resolve(this.pos, this.radius, this.sneaking ? 1.3 : this.height);
    // world bounds
    if (cell.bounds) {
      const b = cell.bounds;
      this.pos.x = Math.max(b[0], Math.min(b[2], this.pos.x));
      this.pos.z = Math.max(b[1], Math.min(b[3], this.pos.z));
    }
    const g = col.groundHeight(this.pos.x, this.pos.z, Math.max(prev.y, this.pos.y), this.radius);
    if (this.pos.y <= g + 0.02 && this.vel.y <= 0.1) {
      // landed
      if (!this.onGround && this.fallStartY !== null) {
        const fall = this.fallStartY - g;
        const safe = 5 + this.ch.skills.acrobatics * 0.05;
        if (fall > safe && !(this.effects.featherT > 0)) {
          const dmg = Math.round((fall - safe) * 6 * (1 - this.ch.skills.acrobatics / 250));
          this.health -= dmg;
          this.hurtFlash = 1;
          game.audio.play('hurt');
          this.exercise('acrobatics', 1);
          if (this.health <= 0) { this.health = 0; this.die(); }
        }
        game.audio.play('land', 0.6);
      }
      this.pos.y = g;
      this.vel.y = 0;
      this.onGround = true;
      this.fallStartY = null;
    } else {
      if (this.onGround && this.pos.y - g < 0.35 && this.vel.y <= 0) {
        // glue to slopes when walking downhill
        this.pos.y = g;
        this.vel.y = 0;
      } else {
        if (this.onGround) this.fallStartY = this.pos.y;
        this.onGround = false;
        if (this.fallStartY === null) this.fallStartY = this.pos.y;
        this.fallStartY = Math.max(this.fallStartY, this.pos.y);
      }
    }
    if (this.swimming) { this.onGround = false; this.fallStartY = null; }
    // ceiling
    if (col.ceiling < Infinity && this.pos.y + this.height > col.ceiling) { this.pos.y = col.ceiling - this.height; this.vel.y = Math.min(0, this.vel.y); }

    // footsteps
    const horiz = Math.hypot(this.pos.x - prev.x, this.pos.z - prev.z);
    if (this.onGround && horiz > 0) {
      this.stepAccum += horiz;
      const stride = sprint ? 2.2 : 1.8;
      if (this.stepAccum > stride) {
        this.stepAccum = 0;
        if (!this.sneaking) game.audio.play(cell.interior ? 'stepStone' : snowCover(this.pos.x, this.pos.z, this.pos.y) > 0.5 && roadDistance(this.pos.x, this.pos.z) > 2.5 ? 'stepSnow' : 'step', 0.5);
      }
    }
    if (this.swimming && horiz > 0 && Math.random() < dt * 2) game.audio.play('splash', 0.3);
    if (this.swimming && this.torchLit && !waterproofLight(ITEMS[this.equipped.shield])) { this.toggleTorch(true); game.audio.play('douse', 0.9); game.ui.notify('Your torch hisses out in the water.'); }
    // a one-time nudge the first time it gets properly dark
    if (!this._torchHint && !this.torchLit && this.lightLevel() < 0.5 && this.inventory.has('torch')) {
      this._torchHint = true;
      game.ui.notify('It is dark. Press L to light your torch.');
    }
    this.bob = (this.bob || 0) + horiz * 2.2;
    this.speedNow = dt > 0 ? horiz / dt : 0;

    // ---- combat
    this.updateCombat(dt, input);

    // ---- regen & effects
    this.magicka = Math.min(this.maxMagicka, this.magicka + magickaRegen(this.ch) * dt);
    if (!sprint && this.attackT < 0 && !this.blocking) this.fatigue = Math.min(this.maxFatigue, this.fatigue + fatigueRegen(this.ch) * dt);
    this.fatigue = Math.max(0, this.fatigue);
    const ef = this.effects;
    if (ef.shieldT > 0) { ef.shieldT -= dt; if (ef.shieldT <= 0) ef.shield = 0; }
    if (this.silenceT > 0) this.silenceT -= dt;
    this.shieldPct = ef.shield;
    if (ef.lightT > 0) ef.lightT -= dt;
    if (ef.detectT > 0) ef.detectT -= dt;
    if (ef.invisT > 0) { ef.invisT -= dt; if (ef.invisT <= 0) game.ui.notify('You are visible again.'); }
    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 1.5);
    this.shakeT = Math.max(0, this.shakeT - dt);

    // ---- third-person model
    if (this.model) {
      const m = this.model;
      m.root.position.copy(this.pos);
      m.root.rotation.y = this.yaw + Math.PI;
      const a = this.modelAnim;
      a.moveSpeed = this.speedNow;
      a.phase += this.speedNow * dt * 2.1 / 1.0;
      a.attack = this.attackT;
      a.attackKind = this.attackKind;
      a.block = this.blocking;
      a.cast = this.castT;
      a.castClip = CAST_CLIPS[this.castAnim] || 'Spell_Simple_Shoot';
      a.draw = this.drawT;
      a.sneak = this.sneaking;
      a.weaponOut = this.weaponOut;
      a.lookPitch = -this.pitch * 0.4;
      if (this.modelWeapon) this.modelWeapon.visible = this.weaponOut || this.attackT >= 0;
      animateRig(m, a, game.clockT);
      m.root.visible = this.showBody;
      if (this.modelTorch) {
        // the wrist keeps the torch upright (tipped a little forward) whatever the arm is doing
        const t = this.modelTorch;
        const bowOut = this.hasBow() && (this.weaponOut || this.drawT >= 0);
        t.visible = !bowOut;
        if (this.modelWeapon && this.hasBow()) this.modelWeapon.visible = bowOut;
        t.parent.updateWorldMatrix(true, false);
        const pq = t.parent.getWorldQuaternion(_tq).invert();
        t.quaternion.setFromEuler(_te.set(-0.25, this.yaw, 0.12, 'YXZ')).premultiply(pq);
      }
    }
  }

  updateCombat(dt, input) {
    this.cooldown -= dt;
    const w = this.equippedWeapon();
    const bow = w?.skill === 'marksman';
    const busy = this.attackT >= 0 || this.castT >= 0;

    // casting
    if (input.wasPressed('KeyQ') && !busy && this.drawT < 0) this.startCast();
    if (this.castT >= 0) {
      this.castT += dt / 0.7;
      if (this.pendingSpell && this.castT >= 0.4) { this.performSpell(this.pendingSpell); this.pendingSpell = null; }
      if (this.castT >= 1) this.castT = -1;
    }

    // blocking
    this.blocking = input.mouseDown(2) && !busy && this.drawT < 0 && !bow && this.fatigue > 0;
    if (this.blocking) { this.weaponOut = true; this.fatigue -= dt * 2; }

    if (bow) {
      const arrowId = this.equipped.arrow;
      if (input.mousePressed(0) && !busy && this.cooldown <= 0) {
        if (!arrowId || !this.inventory.has(arrowId)) {
          game.ui.notify('You have no arrows equipped.');
        } else {
          this.weaponOut = true;
          this.drawT = 0;
          this.drawing = true;
          game.audio.play('bowDraw', 0.6);
        }
      }
      if (this.drawT >= 0) {
        this.drawT = Math.min(1, this.drawT + dt / 0.9);
        if (!input.mouseDown(0)) {
          // release
          const draw = this.drawT;
          this.drawT = -1;
          this.drawing = false;
          if (draw > 0.15 && this.inventory.has(arrowId)) {
            this.removeItem(arrowId, 1);
            if (!this.inventory.has(arrowId)) delete this.equipped.arrow;
            const ar = ITEMS[arrowId];
            const sneak = this.sneaking && !game.anyEnemyTargeting();
            let dmg = (w.damage + ar.damage) * (0.5 + this.ch.skills.marksman * 0.015) * (0.3 + 0.7 * draw);
            if (sneak) { dmg *= 2; game.ui.notify('Sneak attack!'); }
            const from = this.eye().addScaledVector(this.lookDir(), 0.5);
            game.projectiles.spawn({ kind: 'arrow', pos: from, dir: this.lookDir(), speed: 20 + 32 * draw, gravity: 6, owner: this, damage: Math.round(dmg) });
            game.audio.play('bowShoot');
            this.exercise('marksman', 1);
            this.fatigue -= 3;
            this.cooldown = 0.25;
          }
        }
      }
      return;
    }

    // melee
    if (input.mousePressed(0) && !busy && this.cooldown <= 0) {
      if (!this.weaponOut) { this.weaponOut = true; this.cooldown = 0.35; game.audio.play('swing', 0.4); return; }
      this.attackHold = 0;
    }
    if (this.attackHold >= 0) {
      this.attackHold += dt;
      const release = !input.mouseDown(0);
      if (this.attackHold > 0.35 || release) {
        const power = !release && this.fatigue > 10;
        this.attackHold = -1;
        this.attackT = 0;
        this.hasHit = false;
        this.attackKind = power ? 'power' : 'slash';
        // quick slashes chain into a forehand / backhand combo; a pause starts it over
        this.swingN = power ? 1 : game.clockT - (this.lastSwingEnd ?? -9) < 0.6 ? (this.swingN || 0) + 1 : 0;
        this.fatigue -= power ? 14 : 4;
        game.audio.play(power ? 'swingHeavy' : 'swing', 0.8);
      }
    }
    if (this.attackT >= 0) {
      const spd = w?.speed || 1.3;
      const dur = (this.attackKind === 'power' ? 0.95 : 0.6) / spd;
      // hit-stop: the blade bites and hangs for a few frames before following through
      if (this.hitStop > 0) this.hitStop -= dt;
      else this.attackT += dt / dur;
      if (!this.hasHit && this.attackT >= (this.attackKind === 'power' ? 0.5 : 0.42)) {
        this.hasHit = true;
        const power = this.attackKind === 'power';
        const hit = meleeStrike(this, power);
        if (hit) { this.shake(power ? 0.24 : 0.14); this.hitStop = power ? 0.09 : 0.05; }
      }
      if (this.attackT >= 1) { this.attackT = -1; this.cooldown = 0.08; this.lastSwingEnd = game.clockT; }
    }
  }

  // ------------------------------------------------------------ camera
  updateCamera(camera, dt) {
    const eyeY = this.pos.y + this.eyeHeight() - (this.swimming ? 0.2 : 0);
    this.camY = this.camY === undefined ? eyeY : this.camY + (eyeY - this.camY) * Math.min(1, dt * 12);
    const shake = this.shakeT > 0 ? this.shakeT * 0.06 : 0;
    const bob = !this.showBody && this.onGround && this.speedNow > 0.5 ? Math.sin(this.bob) * 0.035 : 0;
    camera.rotation.order = 'YXZ';
    camera.rotation.y = this.yaw + (Math.random() - 0.5) * shake;
    camera.rotation.x = this.pitch + (Math.random() - 0.5) * shake;
    camera.rotation.z = 0;
    // the view leans into a swing: a roll along the cut, and a nod as a power attack comes down
    if (!this.thirdPerson && this.attackT >= 0) {
      const a = this.attackT;
      const bump = (t0, t1) => (a <= t0 || a >= t1 ? 0 : Math.sin(Math.PI * (a - t0) / (t1 - t0)));
      if (this.attackKind === 'power') {
        camera.rotation.x += 0.02 * bump(0.1, 0.45) - 0.045 * bump(0.44, 0.9);
      } else {
        const s = (this.swingN || 0) % 2 ? -1 : 1;
        camera.rotation.z = s * 0.025 * bump(0.28, 0.8);
        camera.rotation.y -= s * 0.012 * bump(0.34, 0.72);
      }
    }
    if (this.frontView) {
      // looking back at yourself from the front: a little above eye level, framing head to knees
      const head = new THREE.Vector3(this.pos.x, this.camY - 0.15, this.pos.z);
      const fwd = this.forward(new THREE.Vector3());
      const want = head.clone().addScaledVector(fwd, 2.6).add(new THREE.Vector3(0, 0.15, 0));
      const hit = game.cell.collision.segment(head, want);
      if (hit) want.copy(head).lerp(want, Math.max(0.25, hit.t - 0.08));
      this._frontCam = this._frontCam ? this._frontCam.lerp(want, Math.min(1, dt * 10)) : want.clone();
      camera.position.copy(this._frontCam);
      camera.lookAt(this.pos.x, this.camY - 0.45, this.pos.z);
      return;
    }
    this._frontCam = null;
    if (!this.thirdPerson) {
      camera.position.set(this.pos.x, this.camY + bob, this.pos.z);
    } else {
      const dir = this.lookDir();
      const head = new THREE.Vector3(this.pos.x, this.camY + 0.1, this.pos.z);
      const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
      head.addScaledVector(right, 0.45);
      const want = head.clone().addScaledVector(dir, -this.camDist);
      const hit = game.cell.collision.segment(head, want);
      if (hit) want.copy(head).lerp(want, Math.max(0.1, hit.t - 0.1));
      camera.position.copy(want);
    }
  }

  // ------------------------------------------------------------ persistence
  toJSON() {
    return {
      name: this.name, ch: this.ch, inventory: this.inventory.toJSON(), equipped: this.equipped,
      spells: this.spells, selectedSpell: this.selectedSpell, powersUsed: this.powersUsed, hotkeys: this.hotkeys,
      pos: this.pos.toArray(), yaw: this.yaw, pitch: this.pitch,
      health: this.health, magicka: this.magicka, fatigue: this.fatigue, thirdPerson: this.thirdPerson,
      stowedShield: this.stowedShield, torchGiven: true,
    };
  }

  fromJSON(o) {
    this.name = o.name;
    this.ch = o.ch;
    this.inventory = Inventory.fromJSON(o.inventory);
    this.equipped = o.equipped || {};
    this.spells = o.spells;
    this.selectedSpell = o.selectedSpell;
    this.powersUsed = o.powersUsed || {};
    this.hotkeys = o.hotkeys || {};
    this.pos.fromArray(o.pos);
    this.yaw = o.yaw; this.pitch = o.pitch;
    this.health = o.health; this.magicka = o.magicka; this.fatigue = o.fatigue;
    this.thirdPerson = !!o.thirdPerson;
    this.stowedShield = o.stowedShield ?? null;
    // characters from before torches existed get one too
    if (!o.torchGiven && !this.inventory.has('torch')) this.inventory.add('torch', 1);
    this.dead = false;
    this.vel.set(0, 0, 0);
    this.resetCombat();
    this.effects = { shield: 0, shieldT: 0, lightT: 0, detectT: 0, invisT: 0 };
    this.summon = null;
    this.rebuildModel();
  }
}
