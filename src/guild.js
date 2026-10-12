// The Hollow King: the Mages Guild of Chorrol questline (sq_mg1–sq_mg5). Mixed into `game`, so `this` is the game.
// The sealed hall and its Founders' Flame, the observatory in the snow, the three Hearts, the Hollow Gate's rite,
// the boy on the Bone Stair, and the lich on his throne.
import * as THREE from 'three';
import { Actor } from './actors/actor.js';
import { NPCS } from './data/actors.js';
import { ITEMS } from './data/items.js';
import { LOCATIONS, HK } from './world/layout.js';
import { buildCarriedFlame } from './fx/flames.js';
import { magicTextures } from './fx/magic.js';

const _mist = new THREE.Color();

const LAMP_ORDER = ['sun', 'moon', 'star'];
const LAMP_NAMES = { sun: 'the Sun', moon: 'the Moon', star: 'the Star' };
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);

export const GUILD = {
  // ----------------------------------------------------------------- small helpers
  /** Is the Founders' Ember burning in the player's hand? */
  emberLit() {
    const p = this.player;
    return p.torchLit && ITEMS[p.equipped.shield]?.lightStyle === 'founder';
  },
  /** Magister Vell is away from the hall (travelling with you). */
  ondineAway() { return !!this.flags.ondineFollowing; },
  mgQ(q) { return this.quests.stage(q); },
  /** A builder-like shim so placeItem can drop a quest item into a cell that is already built. */
  cellShim(cell) { return { add: (o) => cell.group.add(o), interact: (d) => { cell.interactables.push(d); return d; } }; },
  placeOnce(cell, id, at, cid) {
    if (!at || this.taken[cid] || cell['_placed_' + cid] || this.player.inventory.has(id)) return;
    cell['_placed_' + cid] = true;
    this.placeItem(this.cellShim(cell), id, at.x, at.y ?? cell.collision.groundHeight(at.x, at.z, 4) + 0.05, at.z, cid);
  },

  // ----------------------------------------------------------------- followers
  makeOndineFollower(x, y, z) {
    const npc = NPCS.find((n) => n.id === 'ondine');
    const a = new Actor({ ...npc, ai: 'caster', spells: ['frostbite', 'frostbite', 'shock_bolt'], magicka: 900, reach: 16, faction: 'ally', hideWhen: undefined, stationary: false, health: 260 }, x, y, z, { uid: 'ondine_follow' });
    a.following = true;
    return a;
  },
  makeBastienFollower(x, y, z) {
    const npc = NPCS.find((n) => n.id === 'bastien');
    const a = new Actor({ ...npc, faction: 'ally', essential: true, stationary: false, extraLoot: [], taunts: undefined }, x, y, z, { uid: 'bastien_follow' });
    a.following = true;
    return a;
  },
  /** Called from enterCell: Ondine and Bastien come with you through every door (and come back after a load). */
  guildFollowers(followers, p, y, cell) {
    const has = (uid) => followers.some((a) => a.uid === uid) || cell.actors.some((a) => a.uid === uid);
    if (this.flags.ondineFollowing && !has('ondine_follow')) followers.push(this.makeOndineFollower(p.x - 1.2, y, p.z + 1.2));
    if (this.flags.bastienFollowing && !has('bastien_follow')) followers.push(this.makeBastienFollower(p.x + 1.2, y, p.z + 1.2));
  },
  ondineJoins() {
    this.quests.set('sq_mg3', 100, this.day());
    this.quests.set('sq_mg4', 10, this.day());
    this.flags.ondineFollowing = true;
    const p = this.player.pos;
    const a = this.makeOndineFollower(p.x - 1, p.y, p.z + 1);
    this.addActor(a);
    a.say('The Hollow Gate. North-east, past the goblins. Keep the Ember lit.', true);
  },

  // ----------------------------------------------------------------- the sealed hall
  /** The Chorrol Guild door: sealed by Ondine's ward until you carry the token (or the ward comes down). */
  guildDoorBlocked() {
    if (this.flags.guildOpen || this.player.inventory.has('ward_token')) return false;
    this.ui.showMessage('Mages Guild', 'A ward hangs over the doorway like a sheet of moving water. It is warm to the touch and absolutely solid. Behind it, very faintly, someone is singing scales to keep warm.\n\nTeekeeus handles the Guild\'s business in the square.');
    return true;
  },
  /** The lamps that are lit, the Founders' Flame, the frost, the Magister's things. */
  applyGuildHall(cell) {
    const M = cell.meta;
    if (!M) return;
    const lit = this.flags.mgLamps ? LAMP_ORDER : this.flags.mgLampsLit || [];
    for (const L of M.lamps || []) if (lit.includes(L.n)) this.kindleWardLamp(cell, L, true); else this.douseWardLamp(cell, L);
    const awake = !!this.flags.mgLamps;
    if (M.pool) {
      if (M.pool.flame) M.pool.flame.visible = awake;
      if (M.pool.light) M.pool.light.on = awake;
      // the black ice cracks and lights from below once the Flame wakes, and thaws when he is dead
      if (M.pool.ice) M.pool.ice.visible = !this.flags.ashgraveDead;
      if (awake) for (const m of M.pool.ice?.userData.mats || []) { m.emissive?.setHex(0x3a6ac8); m.emissiveIntensity = 0.7; }
    }
    if (M.coldLight) M.coldLight.on = !awake;
    for (const f of M.frost || []) f.visible = !awake;
    for (const it of cell.interactables) if (it.id === 'magister_bed' && this.flags.mgMagister) it.owner = null;
    this.placeOnce(cell, 'guild_charter', M.charter, 'guild_charter_pickup');
  },
  kindleWardLamp(cell, L, quiet = false) {
    if (L.fire) return;
    const at = L.flamePos || v3(L.x, 1.9, L.z);
    const f = buildCarriedFlame(0.2, { halo: 4, color: 0xcfe4ff });
    f.position.copy(at);
    f.userData.uniforms.uNight.value = 1;
    cell.group.add(f);
    const l = { color: new THREE.Color(0xbcd8ff), intensity: 18, distance: 13, pos: at.clone().setY(at.y + 0.3), flicker: true, night: false, on: true };
    cell.lights.push(l);
    L.fire = f; L.light = l;
    if (!quiet) { this.audio.play('torch', 0.9); this.particles.burst(at, 'magic', 18, 0xcfe4ff); }
  },
  douseWardLamp(cell, L) {
    if (!L.fire) return;
    cell.group.remove(L.fire);
    L.light.on = false;
    L.fire = null; L.light = null;
    this.particles.burst(v3(L.x, 1.9, L.z), 'smoke', 8);
  },
  useWardLamp(t) {
    const c = this.cell, p = this.player, L = c.meta.lamps.find((l) => l.n === t.n);
    if (this.flags.mgLamps) return this.ui.showMessage(t.name, 'The lamp burns blue-white and steady, and the Founders\' Flame stands in the pool between the three of them like a fourth.');
    const lit = (this.flags.mgLampsLit ||= []);
    if (lit.includes(t.n)) return this.ui.notify(`The Lamp of ${LAMP_NAMES[t.n]} is already burning.`);
    // a flame you made yourself: your own torch, or a Flare
    let how;
    if (p.torchLit) how = 'You hold your own flame to the wick.';
    else if (p.spells.includes('flare') && p.magicka >= 9) { p.magicka -= 9; how = 'You spark a Flare into the bowl.'; this.audio.play('fireCast', 0.6); }
    else return this.ui.showMessage(t.name, `A tall bronze lamp-stand worked with the sign of ${LAMP_NAMES[t.n]}, its bowl rimed with frost. It would take a flame you made yourself — a lit torch (L), or a spell of fire.`);
    const want = LAMP_ORDER[lit.length];
    if (t.n !== want) {
      // the wrong order: every lamp gutters, and the cold comes up out of the pool
      for (const l of c.meta.lamps) this.douseWardLamp(c, l);
      this.flags.mgLampsLit = [];
      p.health = Math.max(1, p.health - 10);
      p.vel.add(v3(p.pos.x - c.meta.pool.x, 0, p.pos.z - c.meta.pool.z).normalize().multiplyScalar(6));
      this.audio.play('frostCast', 0.9);
      this.particles.burst(v3(c.meta.pool.x, 0.8, c.meta.pool.z), 'magic', 30, 0x9ad8ff);
      return this.ui.showMessage(t.name, `${how} The wick catches — and then every lamp in the room gutters out at once, and a gust of cold comes up out of the black ice and knocks you back a step.\n\n(The lamps must be woken in the right order. The Charter will say which.)`);
    }
    lit.push(t.n);
    this.kindleWardLamp(c, L);
    this.ui.notify(`${how} The Lamp of ${LAMP_NAMES[t.n]} burns blue-white.`);
    if (lit.length === 3) this.wakeFoundersFlame();
  },
  wakeFoundersFlame() {
    const c = this.cell, P = c.meta.pool;
    this.flags.mgLamps = true;
    const st = this.mgQ('sq_mg1');
    if (st < 40) this.quests.set('sq_mg1', 40, this.day());
    this.audio.play('portal', 0.6);
    setTimeout(() => this.audio.play('chime', 1), 600);
    for (let i = 0; i < 6; i++) setTimeout(() => this.particles.burst(v3(P.x, 0.6 + i * 0.3, P.z), 'magic', 20, 0xcfe4ff), i * 140);
    this.applyGuildHall(c);
    this.quests.set('sq_mg1', 50, this.day());
    this.ui.showMessage('The Founders\' Flame', 'As the third lamp catches, the black ice in the pool cracks from rim to rim with a sound like a bell breaking. Steam pours up. The frost on the books and the windows goes to water and runs.\n\nAnd out of the middle of the pool stands a flame: tall, silent, blue-white, so bright it throws your shadow on the ceiling.\n\nFor one moment, deep in it, you see a skull in a crown of black ice, looking up. Then it turns its head, very slowly, and looks at you.\n\nThen it is only fire.');
  },
  examineFounderPool(t) {
    if (this.flags.ashgraveDead) return this.ui.showMessage(t.name, 'The pool has thawed. In the still water there is only the sky over Chorrol, and a drift of cloud.');
    if (this.flags.mgLamps) return this.ui.showMessage(t.name, 'The Founders\' Flame stands in the pool, blue-white and silent. It gives off no heat at all until you hold your hand close, and then a great deal.');
    return this.ui.showMessage(t.name, 'A round basin set into the floor, filled to the brim with ice so black it looks like a hole. Something under the surface is never quite still. You look away before you can decide what it is.');
  },
  guildMembership() {
    this.quests.set('sq_mg1', 100, this.day());
    this.flags.mgMember = true;
    this.flags.guildOpen = true;
    this.takeItem('ward_token', 1);
    this.giveItem('founders_ember', 1);
    this.quests.set('sq_mg2', 10, this.day());
    this.ui.showMessage('Associate of the Guild', 'Ondine hands you the lantern. The Founders\' Flame burns inside it, small and fierce, and the glass is cool to the touch.\n\n"An ember of the Founders\' Flame. It will not go out, not in rain, not in the sea, not in the dark under a mountain. It is the only fire that can break his Hearts — and the dead do not like its light."\n\nShe lets the ward down with a word, and for the first time in nine days the hall door swings open on the square. Somebody cheers. It is Teekeeus.\n\n"You are an Associate of the Guild of Mages. The library is yours, the beds are yours, the spell table is yours. And Bastien is yours, I\'m afraid. He was obsessed with the old Starfall Observatory, up in the mountains north of the Wintersmeet road, where the Guild used to watch the seal. Find him."\n\n(Press L with the Founders\' Ember equipped to raise it.)');
  },
  guildMagister() {
    this.quests.set('sq_mg5', 100, this.day());
    this.flags.mgMagister = true;
    this.giveItem('gold', 500);
    this.giveItem('ashgrave_grimoire', 1);
    this.applyPersistentState(this.cell);
    this.applyGuildHall(this.cell);
    this.audio.play('levelUp', 0.7);
    this.ui.notify('You are Magister of the Chorrol Chapter. The study is yours.');
  },
  readGrimoire(id) {
    const p = this.player;
    if (!p.spells.includes('summon_bone_knight')) { p.spells.push('summon_bone_knight'); this.ui.notify('You learned Summon Bone Knight.'); this.audio.play('conjure', 0.6); }
    this.ui.showBook(ITEMS[id]);
  },
  drinkFrostWard(id) {
    const p = this.player;
    this.takeItem(id, 1);
    p.effects.shield = 30; p.effects.shieldT = 60;
    this.audio.play('drink');
    this.particles.burst(p.pos, 'heal', 14, 0x9ad8ff);
    this.ui.notify('A chill settles over your skin like armour. (Shield 30% for 60 secs.)');
  },

  // ----------------------------------------------------------------- Starfall
  useSealOrrery(t) {
    if (this.mgQ('sq_mg2') >= 20 && this.mgQ('sq_mg2') < 30) this.quests.set('sq_mg2', 30, this.day());
    this.audio.play('chime', 0.4);
    const broken = ['heartRime', 'heartVilverin'].filter((k) => this.flags[k]).length + (this.flags.lastHeartBroken ? 1 : 0);
    return this.ui.showMessage(t.name, `A great brass armillary, two storeys tall, cracked by the frost: nine spheres on nine rings, slowly turning by some old charm though nothing drives them. ${3 - broken} of the spheres are black ice, and they turn slower than the rest, as if they were heavy.\n\nA brass dial at the foot reads, in the Guild\'s old script: ASHGRAVE — ${3 - broken} — UNBROKEN.\n\nThe founders built this place to keep watch on him.`);
  },

  // ----------------------------------------------------------------- the three Hearts
  mgHeartStage() {
    const st = this.mgQ('sq_mg3');
    if (st < 10 || st >= 100) return;
    const n = ['heartRime', 'heartVilverin', 'heartFrostfang'].filter((k) => this.flags[k]).length;
    const want = [10, 20, 30, 40][n];
    if (want > st) this.quests.set('sq_mg3', want, this.day());
  },
  /** A Heart's guardian rises, with company. */
  heartGuard(extra, n) {
    const p = this.player.pos, c = this.cell;
    for (let i = 0; i <= n; i++) {
      const a = (i / (n + 1)) * Math.PI * 2 + 0.6, r = i ? 4 : 3;
      const x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r;
      const g = this.spawnCreature(c, i ? extra : 'heartwarden', x, 0, z, i ? {} : { uid: 'heartwarden_' + c.id });
      g.setTarget(this.player);
      this.particles.burst(g.center(), 'magic', 20, 0x9ad8ff);
    }
    this.audio.play('roar', 0.6);
  },
  useHeartstone(t) {
    if (this.flags.heartRime || this.flags.heartRimeTaken) return this.ui.showMessage(t.name, 'The flagstone lies aside. The little hollow under it is empty, and frost-furred.');
    this.flags.heartRimeTaken = true;
    t.disabled = true;
    const slab = t.slab || this.cell.meta?.heartStone?.slab;
    if (slab) { const y0 = slab.position.y; this.magic.add(null, 0.8, (e, dt, k) => { slab.position.y = y0 + Math.sin(k * Math.PI) * 0.4; slab.rotation.z = k * 0.9; }); }
    this.giveItem('ashgrave_heart', 1);
    this.ui.showMessage(t.name, 'Under the flagstone, packed in moss gone to dust, is a cage of tarnished silver around a fist of black ice. Inside the ice, something beats. Once. Then again, several seconds later.\n\nThe floor of the tower shudders, and the cold comes up out of it like breath.');
    this.heartGuard('ice_wraith', 2);
  },
  useHeartNiche(t) {
    if (this.flags.heartVilverin || this.flags.heartVilverinTaken) return this.ui.showMessage(t.name, 'The niche stands open and empty. The oak-leaf glyph has gone dark.');
    if (!this.emberLit()) return this.ui.showMessage(t.name, 'A niche cut in the Ayleid stone and sealed with a slab carved with an oak leaf — not an Ayleid sign. Bosmer. The glyph is dark and cold. It looks as if it is waiting for a particular light.\n\n(Hold up the Founders\' Ember.)');
    this.flags.heartVilverinTaken = true;
    t.disabled = true;
    const slab = t.slab || this.cell.meta?.heartNiche?.slab;
    if (slab) { const y0 = slab.position.y; this.magic.add(null, 1.5, (e, dt, k) => { slab.position.y = y0 - k * 2.6; }); }
    const glyph = this.cell.meta?.heartNiche?.glyph;
    if (glyph?.material) { glyph.material.emissive?.setHex(0x9adf6a); glyph.material.emissiveIntensity = 1.5; }
    this.audio.play('gateClose', 0.6);
    this.giveItem('ashgrave_heart', 1);
    this.ui.showMessage(t.name, 'The oak leaf drinks the Ember\'s light, glows green-gold, and the slab sinks into the floor with a grinding sigh. Behind it, on a bed of leaves four hundred years dead, lies a silver cage around a fist of black ice. It is beating.\n\nSomething behind you scrapes its way up out of the floor.');
    this.heartGuard('hollow_thrall', 2);
  },
  /** Breaking a Heart: hold it up in the Founders' Ember. */
  useAshgraveHeart(id) {
    if (!this.emberLit()) {
      this.audio.play('frostCast', 0.4);
      return this.ui.notify('The Heart hums against your palm, cold enough to hurt. You need fire older than the cold: the Founders\' Ember, lit in your hand.');
    }
    this.takeItem(id, 1);
    const p = this.player, at = p.center().add(new THREE.Vector3(0, 0.4, 0));
    this.audio.play('explode', 0.5);
    this.audio.play('chime', 0.8);
    this.particles.burst(at, 'magic', 40, 0xcfe4ff);
    for (let i = 0; i < 3; i++) setTimeout(() => this.particles.burst(at, 'sparkle', 16), i * 160);
    const f = this.flags;
    let which;
    if (f.heartRimeTaken && !f.heartRime) { f.heartRime = true; which = 'Hrolfa'; }
    else if (f.heartVilverinTaken && !f.heartVilverin) { f.heartVilverin = true; which = 'Thalindor'; }
    else { f.lastHeartBroken = true; which = 'last'; }
    this.mgHeartStage();
    if (which === 'last' && this.cell.id === 'ashgrave_throne') {
      const k = this.cell.actors.find((a) => a.uid === 'hollow_king' && !a.dead);
      k?.say('NO— no, no, NO—', true);
    }
    this.ui.showMessage('Heart of Ashgrave', 'You lift the silver cage into the Ember\'s light. The black ice screams — there is no other word for it — and cracks, and cracks again, and goes to white steam that smells of old paper and candle-smoke.\n\nSomewhere very far away, under a mountain, something feels it.' + (which === 'last' ? '\n\nThat was the last of them.' : ''));
  },
  frostfangHeartGone() {
    if (!this.player.inventory.has('bastien_receipt')) this.giveItem('bastien_receipt', 1);
    this.flags.heartFrostfang = true;
    this.mgHeartStage();
  },

  // ----------------------------------------------------------------- the Hollow Gate
  useHollowGate(t) {
    const f = this.flags;
    if (f.hollowGateOpen) return this.ui.showMessage(t.name, 'The black ice of the Gate has gone. Beyond it a stair runs down into the mountain, lit by a cold blue light from somewhere far below.');
    const desc = 'A door of black ice twice the height of a house, set into the foot of the mountain. Above it, three figures are carved in the living rock: a Nord with a sun, a Bosmer with a moon, an Imperial woman with a star. Each holds her light out over the door like a lamp.';
    if (this.mgQ('sq_mg4') < 10) return this.ui.showMessage(t.name, desc + '\n\nThe ice is so cold it burns to look at. Nothing you know will open it.');
    if (!this.cell.actors.some((a) => a.uid === 'ondine_follow' && !a.dead)) return this.ui.showMessage(t.name, desc + '\n\nOnly the founders\' rite will open it, and Magister Vell is the only living soul who knows it.');
    if (!this.emberLit()) return this.ui.showMessage(t.name, desc + '\n\n"Hold up the Ember," says Ondine. "Where they can see it. And don\'t let it drop, whatever comes out of the snow."');
    if (this.gateRite) return;
    this.startGateRite();
  },
  startGateRite() {
    const c = this.cell, st = c.state.hollowGate, on = this.cells.world?.state.hollowGate;
    const ond = c.actors.find((a) => a.uid === 'ondine_follow');
    if (ond) { ond.following = false; ond.def.stationary = true; ond.home.set(HK.gateFront.x + 1.5, ond.pos.y, HK.gateFront.z); }
    const say = (t) => ond?.say(t, true);
    const orb = (i) => {
      const m = st?.founderOrbs?.[i];
      if (m) this.magic.add(null, 2, (e, dt, k) => { m.material.emissiveIntensity = k * 3; });
      if (m) this.particles.burst(m.getWorldPosition(new THREE.Vector3()), 'magic', 30, 0xffe8b0);
      this.audio.play('chime', 0.9);
    };
    const wave = (n) => {
      for (let i = 0; i < n; i++) {
        const [x, z] = HK.gateSpawns[(i * 2 + this.gateRite.waves) % HK.gateSpawns.length];
        const a = this.spawnLeveled(c, 'ashgrave_snow', x, 0, z);
        a.setTarget(this.player);
        this.particles.burst(a.center(), 'smoke', 8);
      }
      this.gateRite.waves++;
      this.ui.notify('Things are climbing up out of the snow!');
    };
    const steps = [
      [0.5, () => say('Stonevoice, who gave the sun. Hear me.')],
      [3, () => wave(2)],
      [4.5, () => orb(0)],
      [7, () => say('Thalindor, who gave the moon. Hear me.')],
      [10, () => wave(3)],
      [11, () => orb(1)],
      [14, () => say('Corve, who gave the star. Your daughter in the Guild asks it. Open.')],
      [17, () => orb(2)],
      [20, () => this.openHollowGate()],
    ];
    this.gateRite = { start: this.clockT, steps, i: 0, waves: 0 };
    this.audio.setMusic('combat');
    this.ui.notify('Ondine begins the founders\' rite. Keep the Ember up, and stay close.');
  },
  tickGateRite() {
    const R = this.gateRite, p = this.player;
    if (this.cell.id !== 'world') { this.abortGateRite(); return; }
    if (!this.emberLit() || Math.hypot(p.pos.x - HK.gateFront.x, p.pos.z - HK.gateFront.z) > 16) {
      this.abortGateRite();
      return this.ui.showMessage('The Hollow Gate', '"The Ember!" Ondine\'s voice cracks. The carved lights over the Gate go dark one after another. "Keep it UP. Come back and we\'ll begin again."');
    }
    const t = this.clockT - R.start;
    while (R.i < R.steps.length && R.steps[R.i][0] <= t) R.steps[R.i++][1]();
  },
  abortGateRite() {
    this.gateRite = null;
    const st = this.cells.world?.state.hollowGate;
    for (const m of st?.founderOrbs || []) m.material.emissiveIntensity = 0;
    const ond = this.cell.actors.find((a) => a.uid === 'ondine_follow');
    if (ond) { ond.following = true; ond.def.stationary = false; }
    this.audio.setMusic(this.cell.music);
  },
  openHollowGate() {
    const st = this.cells.world?.state.hollowGate;
    this.gateRite = null;
    this.flags.hollowGateOpen = true;
    this.audio.play('gateClose', 1);
    this.audio.play('portal', 0.6);
    const door = st?.gateDoor;
    if (door) {
      const y0 = door.position.y;
      door.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; } });
      this.magic.add(null, 3, (e, dt, k) => {
        door.position.y = y0 - k * 2;
        door.traverse((o) => { if (o.isMesh) o.material.opacity = 1 - k; });
        if (k >= 0.99) door.visible = false;
      });
      this.particles.burst(door.getWorldPosition(new THREE.Vector3()), 'smoke', 30);
    }
    if (st?.gateLight) st.gateLight.on = true;
    this.applyPersistentState(this.cells.world);
    const ond = this.cell.actors.find((a) => a.uid === 'ondine_follow');
    if (ond) { ond.following = true; ond.def.stationary = false; ond.say('...It worked. Gods. It actually worked.', true); }
    this.quests.set('sq_mg4', 20, this.day());
    this.audio.setMusic(this.cell.music);
    this.ui.showMessage('The Hollow Gate', 'The three carved lights blaze. The black ice of the Gate goes grey, then white, then simply isn\'t there any more: it sinks into the snow as steam with a sound like a long-held breath let go.\n\nBeyond it a stair runs down into the mountain. From far below comes a cold blue light, and a smell like a library that has been shut for four hundred years.');
  },
  /** World-side state of the Gate, every time the overworld is entered. */
  applyHollowGateWorld() {
    const ward = this.cells.world?.state.guildWard;
    if (ward) ward.visible = !this.flags.guildOpen;
    const st = this.cells.world?.state.hollowGate;
    if (!st) return;
    const open = !!this.flags.hollowGateOpen;
    if (st.gateDoor) st.gateDoor.visible = !open;
    for (const m of st.founderOrbs || []) m.material.emissiveIntensity = open ? 3 : 0;
    if (st.gateLight) st.gateLight.on = open;
  },

  // ----------------------------------------------------------------- the Bone Stair
  spawnBastien(cell) {
    if (this.flags.bastienSaved || this.flags.bastienDead || this.mgQ('sq_mg4') < 20 || !cell.meta?.bastien) return;
    if (cell.actors.some((a) => a.uid === 'bastien')) return;
    const npc = NPCS.find((n) => n.id === 'bastien');
    const B = cell.meta.bastien;
    const a = this.spawnNpc(cell, npc, B.x, 0, B.z, 0);
    if (a) { a.noFacePlayer = false; a.anim.idleAnim = null; }
  },
  bastienRedeemed(npc, keeps) {
    const f = this.flags;
    f.bastienSaved = true;
    f.bastienKeepsHeart = keeps;
    f.bastienFollowing = true;
    this.takeItem('bastien_letter', 1);
    // he comes with you as a friend now
    const at = npc.pos.clone();
    this.removeActor(npc);
    const b = this.makeBastienFollower(at.x, at.y, at.z);
    this.addActor(b);
    this.particles.burst(b.center(), 'magic', 20, 0xcfe4ff);
    if (!keeps) {
      if (this.emberLit()) { this.giveItem('ashgrave_heart', 1, true); this.useAshgraveHeart('ashgrave_heart'); }
      else { this.giveItem('ashgrave_heart', 1); this.ui.notify('Break the last Heart in the Ember\'s light.'); }
    } else this.ui.notify('Bastien keeps the last Heart. He means to break it in front of his master.');
    this.quests.set('sq_mg4', 70, this.day());
  },
  bastienFights(npc) {
    npc.faction = 'monster';
    npc.hostileToPlayer = true;
    npc.def.stationary = false;
    npc.setTarget(this.player);
    this.flags.bastienFought = true;
    npc.say('I\'m sorry! I\'m SORRY!', true);
    for (let i = 0; i < 2; i++) {
      const a = (i ? 1 : -1) * 2;
      const t = this.spawnCreature(this.cell, 'hollow_thrall', npc.pos.x + Math.cos(a) * 2.5, 0, npc.pos.z + Math.sin(a) * 2.5);
      t.setTarget(this.player);
      this.particles.burst(t.center(), 'magic', 16, 0x9ad8ff);
    }
  },
  useThroneDoor(t) {
    if (this.flags.hollowThroneOpen) return;
    const st = this.mgQ('sq_mg4');
    const desc = 'Two doors of black ice, each the height of three men, carved with a single crown. Cold comes off them in waves.';
    if (st < 60) return this.ui.showMessage(t.name, desc + '\n\nThey do not move. Somewhere above you on the stair, the boy with the Heart is still waiting.');
    if (!this.emberLit()) return this.ui.showMessage(t.name, desc + '\n\n(Hold up the Founders\' Ember.)');
    this.flags.hollowThroneOpen = true;
    this.applyPersistentState(this.cell);
    this.audio.play('gateClose', 1);
    this.particles.burst(t.pos.clone(), 'smoke', 30);
    this.quests.set('sq_mg4', 100, this.day());
    this.quests.set('sq_mg5', 10, this.day());
    this.ui.notify('The black ice of the doors goes to steam in the Ember\'s light.');
  },

  // ----------------------------------------------------------------- the Hollow King
  /** While any ward-pillar stands, the lich takes only half harm. */
  hollowShielded() {
    const P = this.cell.meta?.pillars;
    return !!P && P.some((p) => !this.flags['ashPillar' + p.n]);
  },
  /** The Hollow King's presence: a cold glow about him, frost-mist at his feet, a light of his own. */
  hollowAura(cell) {
    const k = cell.actors.find((a) => a.uid === 'hollow_king' && !a.dead);
    if (!k || k.aura) return;
    const T = magicTextures();
    const mat = (map, color, opacity) => new THREE.SpriteMaterial({ map, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    // sprites ride on his model, whose root is scaled: place them in its local units
    const sc = k.group.scale.x || 1;
    const glow = new THREE.Sprite(mat(T.glow, 0x4a8aff, 0.2)); glow.scale.setScalar(3.4 / sc); glow.position.y = (k.height * 0.55) / sc;
    const crown = new THREE.Sprite(mat(T.star, 0xbfe4ff, 0.8)); crown.scale.setScalar(1.1 / sc); crown.position.y = (k.height + 0.25) / sc;
    k.group.add(glow, crown);
    const light = { color: new THREE.Color(0x7ab8ff), intensity: 22, distance: 14, pos: k.pos.clone(), flicker: true, night: false, on: true, priority: true };
    cell.lights.push(light);
    k.aura = { glow, crown, light };
  },
  tickHollowAura(cell, dt) {
    const k = cell.actors.find((a) => a.uid === 'hollow_king');
    if (!k?.aura) return;
    const A = k.aura;
    if (k.dead) { A.glow.visible = A.crown.visible = false; A.light.on = false; return; }
    A.light.pos.set(k.pos.x, k.pos.y + k.height * 0.7, k.pos.z + 0.8);
    A.crown.material.rotation += dt * 0.8;
    A.glow.material.opacity = 0.17 + Math.sin(this.clockT * 2) * 0.04;
    // frost-mist rolling off him, and slow pixel motes rising like breath
    for (let i = 0; i < 3; i++) this.particles.emit({ x: k.pos.x + (Math.random() - 0.5) * 1.4, y: k.pos.y + 0.2, z: k.pos.z + (Math.random() - 0.5) * 1.4, vx: (Math.random() - 0.5) * 0.8, vy: 0.15, vz: (Math.random() - 0.5) * 0.8, drag: 0.5, life: 2.4, size: 0.9, grow: 1.4, color: _mist.setRGB(0.55, 0.7, 0.95), alpha: 0.18 }, false);
    for (let i = 0; i < 2; i++) this.particles.emit({ x: k.pos.x + (Math.random() - 0.5) * 1.2, y: k.pos.y + 0.6 + Math.random() * 2, z: k.pos.z + (Math.random() - 0.5) * 1.2, vx: 0, vy: 0.5, vz: 0, life: 1.6, size: 0.1, color: _mist.setRGB(0.75, 0.88, 1), shape: Math.random() < 0.3 ? 'star' : 'pixel' });
  },
  applyThroneState(cell) {
    this.hollowAura(cell);
    for (const P of cell.meta?.pillars || []) {
      const gone = !!this.flags['ashPillar' + P.n];
      if (P.mesh) P.mesh.visible = !gone;
      if (P.light) P.light.on = !gone;
      if (P.it) P.it.disabled = gone;
    }
    if (cell.meta?.daylight) cell.meta.daylight.visible = !!this.flags.ashgraveDead;
    if (cell.meta?.daylightLight) cell.meta.daylightLight.on = !!this.flags.ashgraveDead;
    if (this.flags.ashgraveDead && cell.meta?.npcs?.['1']) {
      const D = cell.meta.npcs['1'];
      this.placeOnce(cell, 'hollow_crown', { x: D.x, z: D.z + 1.2 }, 'hollow_crown_pickup');
    }
  },
  useShieldPillar(t) {
    const P = this.cell.meta.pillars.find((p) => p.n === t.n), p = this.player;
    if (this.flags['ashPillar' + t.n]) return;
    let how;
    if (this.emberLit()) how = 'You thrust the Founders\' Ember against the crystal.';
    else if (p.spells.includes('sunbolt') && p.magicka >= 22) { p.magicka -= 22; how = 'You drive a Sunbolt into the crystal point-blank.'; this.audio.play('fireCast', 0.7); }
    else return this.ui.showMessage(t.name, 'A pillar of blue welkynd light, humming. A thread of the same light runs from it to the Hollow King. You need fire the dead hate to break it: the Founders\' Ember, or a Sunbolt.');
    this.flags['ashPillar' + t.n] = true;
    this.audio.play('explode', 0.8);
    this.audio.play('lockBreak', 0.8);
    this.particles.burst(v3(P.x, 2, P.z), 'magic', 50, 0x9ad8ff);
    this.applyThroneState(this.cell);
    const left = this.cell.meta.pillars.filter((q) => !this.flags['ashPillar' + q.n]).length;
    this.ui.notify(`${how} It shatters into falling light.${left ? ` (${left} left)` : ' The Hollow King\'s ward is broken!'}`);
    const k = this.cell.actors.find((a) => a.uid === 'hollow_king' && !a.dead);
    if (k && !left) k.say('My wards! Four hundred years of— you CHILD!', true);
  },
  hollowKingFights(npc, cursed) {
    if (this.flags.hollowKingFighting) return;
    this.flags.hollowKingFighting = true;
    if (cursed) { this.player.silenceT = 30; this.ui.notify('You have been silenced for 30 seconds.'); this.audio.play('frostCast', 1); }
    npc.faction = 'monster';
    npc.hostileToPlayer = true;
    npc.def.stationary = false;
    npc.setTarget(this.player);
    this.hk = { ringT: this.clockT + 8, tpT: this.clockT + 15, phase: 1 };
    this.quests.set('sq_mg5', 20, this.day());
    this.audio.setMusic('combat');
    const ond = this.cell.actors.find((a) => a.uid === 'ondine_follow');
    setTimeout(() => ond?.say('The pillars! Break the pillars, they\'re feeding his ward!', true), 3500);
  },
  /** He cannot die while his last Heart beats: he kneels, re-forms, and rises again. */
  preventDeath(a) {
    if (a.uid !== 'hollow_king' || this.flags.lastHeartBroken) return false;
    a.health = Math.round(a.maxHealth * 0.5);
    a.calmT = 6;
    a.setTarget(null);
    this.particles.burst(a.center(), 'magic', 40, 0x9ad8ff);
    this.audio.play('roar', 0.8);
    a.say('I. Do. Not. DIE.', true);
    this.ui.showMessage('The Hollow King', 'He falls — and the black ice runs back over his bones like water uphill, and he begins to stand.\n\nSomewhere, the last Heart is still beating.\n\n(Break it in the Founders\' Ember\'s light: use it from your pack.)');
    setTimeout(() => { if (!a.dead) a.setTarget(this.player); }, 6000);
    return true;
  },
  tickThrone() {
    const c = this.cell, p = this.player, H = this.hk;
    this.tickHollowAura(c, 0.25);
    const k = c.actors.find((a) => a.uid === 'hollow_king' && !a.dead);
    if (!k || !H || !this.flags.hollowKingFighting) return;
    const frac = k.health / k.maxHealth;
    // a ring of frost bursts out from him every twelve seconds
    if (this.clockT > H.ringT) {
      H.ringT = this.clockT + 12;
      for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; this.particles.burst(v3(k.pos.x + Math.cos(a) * 3, k.pos.y + 0.4, k.pos.z + Math.sin(a) * 3), 'magic', 3, 0xbfe8ff); }
      this.audio.play('frostCast', 0.9);
      if (p.pos.distanceTo(k.pos) < 5) { p.health -= 15; p.slowT = 3; this.ui.notify('The cold bites to the bone.'); }
    }
    // phase two: he rises, calls his knights, and the boy breaks the last Heart in front of him
    if (H.phase === 1 && frac < 0.6) {
      H.phase = 2;
      k.say('RISE. All of you. RISE.', true);
      this.hkSummon(k, 2);
      const b = c.actors.find((a) => a.uid === 'bastien_follow' && !a.dead);
      if (this.flags.bastienKeepsHeart && !this.flags.lastHeartBroken && b) {
        setTimeout(() => {
          this.flags.lastHeartBroken = true;
          b.say('You never taught me ANYTHING!', true);
          this.particles.burst(b.center().add(v3(0, 0.6, 0)), 'magic', 50, 0xcfe4ff);
          this.audio.play('explode', 0.6);
          k.say('NO— my HEART—', true);
          this.ui.notify('Bastien holds the last Heart up into the light of your Ember, and it shatters in his hands. The Hollow King can die now.');
        }, 2500);
      }
    }
    if (H.phase === 2 && frac < 0.3) { H.phase = 3; k.say('You are clever. You are SO clever. Stay with me for ever.', true); this.hkSummon(k, 2); }
    // and in the second half of the fight, he flickers from pillar to pillar
    if (H.phase >= 2 && this.clockT > H.tpT && c.meta?.pillars?.length) {
      H.tpT = this.clockT + 15;
      const P = c.meta.pillars[Math.floor(Math.random() * c.meta.pillars.length)];
      const d = c.meta.npcs?.['1'] || { x: 0, z: 0 };
      this.particles.burst(k.center(), 'magic', 30, 0x9ad8ff);
      k.pos.set(P.x + (d.x - P.x) * 0.25, k.pos.y, P.z + (d.z - P.z) * 0.25);
      this.particles.burst(k.center(), 'magic', 30, 0x9ad8ff);
      this.audio.play('portal', 0.4);
    }
  },
  hkSummon(k, n) {
    this.audio.play('conjure', 0.8);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random();
      const x = k.pos.x + Math.cos(a) * 4, z = k.pos.z + Math.sin(a) * 4;
      const s = this.spawnCreature(this.cell, 'bone_knight', x, 0, z);
      s.setTarget(this.player);
      this.particles.burst(s.center(), 'magic', 25, 0x9ad8ff);
    }
  },
  ashgraveFalls(k) {
    this.flags.ashgraveDead = true;
    this.flags.hollowKingFighting = false;
    this.hk = null;
    this.quests.set('sq_mg5', 30, this.day());
    this.audio.setMusic(this.cell.music);
    this.audio.play('gateClose', 0.8);
    for (let i = 0; i < 5; i++) setTimeout(() => this.particles.burst(k.center().add(v3(0, i * 0.3, 0)), 'magic', 30, 0xcfe4ff), i * 200);
    // his knights fall with him
    for (const a of [...this.cell.actors]) if (!a.dead && a.def.tplId === 'bone_knight') a.die(null);
    this.applyThroneState(this.cell);
    this.ui.showMessage('The Hollow King', 'Severin Ashgrave falls to his knees on the steps of his throne. The crown of black ice cracks down the middle with a sound like a bell, and the blue fire in his eyes goes out — not all at once, but slowly, the way a lamp goes out when the oil is gone.\n\n"I have not forgotten one thing," he says, very quietly, to no one. "Not one."\n\nThen there is only a heap of old bones and a rotted robe, and the whole mountain sighs. Somewhere high in the wall of the hall a crack opens, and a thin blade of daylight comes down through four hundred years of dark and lies across the floor.');
  },

  // ----------------------------------------------------------------- cell and quest hooks
  guildOnEnter(id) {
    const c = this.cell, Q = (q) => this.mgQ(q), d = this.day();
    if (id === 'world') this.applyHollowGateWorld();
    if (id === 'mages_guild') {
      if (Q('sq_mg1') === 10) {
        this.quests.set('sq_mg1', 20, d);
        if (this.player.inventory.has('guild_supplies')) { this.takeItem('guild_supplies', 1); this.ui.notify('You hand the crate of supplies to the nearest frozen apprentice, who bursts into tears.'); }
      }
      this.applyGuildHall(c);
    }
    if (id === 'starfall_observatory') {
      if (Q('sq_mg2') === 10) this.quests.set('sq_mg2', 20, d);
      if (Q('sq_mg2') >= 10) this.placeOnce(c, 'bastien_notes', c.meta?.notes, 'bastien_notes_pickup');
    }
    if (id === 'rime_spire' || id === 'vilverin') this.applyPersistentState(c);
    if (id === 'hollow_gate_hall') {
      if (Q('sq_mg4') >= 10 && Q('sq_mg4') < 20 && this.flags.hollowGateOpen) this.quests.set('sq_mg4', 20, d);
      this.placeOnce(c, 'corve_journal', c.meta?.journal, 'corve_journal_pickup');
    }
    if (id === 'bone_stair') { this.spawnBastien(c); this.applyPersistentState(c); }
    if (id === 'ashgrave_throne') {
      if (Q('sq_mg5') < 10 && Q('sq_mg4') >= 100) this.quests.set('sq_mg5', 10, d);
      this.applyThroneState(c);
      if (this.flags.hollowKingFighting && !this.flags.ashgraveDead) this.flags.hollowKingFighting = false; // a fight abandoned starts over
    }
  },
  /** Leaving the throne hall once he is dead: your companions go home to the hall ahead of you. */
  guildOnLeave(from, to) {
    if (from !== 'ashgrave_throne' || !this.flags.ashgraveDead) return;
    for (const uid of ['ondine_follow', 'bastien_follow']) { const a = this.cell.actors.find((x) => x.uid === uid); if (a) { a.following = false; this.removeActor(a); } }
    this.flags.ondineFollowing = false;
    if (this.flags.bastienFollowing) { this.flags.bastienFollowing = false; this.flags.bastienHome = true; }
  },
  guildOnItem(id) {
    const Q = (q) => this.mgQ(q), d = this.day();
    if (id === 'guild_charter' && Q('sq_mg1') >= 20 && Q('sq_mg1') < 40) { if (Q('sq_mg1') < 30) this.quests.set('sq_mg1', 30, d); this.quests.set('sq_mg1', 40, d); }
    if (id === 'bastien_notes' && Q('sq_mg2') >= 10 && Q('sq_mg2') < 40) { if (Q('sq_mg2') < 30) this.quests.set('sq_mg2', 30, d); this.quests.set('sq_mg2', 40, d); }
    if (id === 'bastien_receipt' && Q('sq_mg3') >= 10) { this.flags.heartFrostfang = true; this.mgHeartStage(); }
    if (id === 'corve_journal' && Q('sq_mg4') >= 20 && Q('sq_mg4') < 30) this.quests.set('sq_mg4', 30, d);
    if (id === 'hollow_crown' && Q('sq_mg5') === 30) this.quests.set('sq_mg5', 40, d);
  },
  guildOnDeath(actor) {
    if (actor.uid === 'bastien') {
      this.flags.bastienDead = true;
      if (this.mgQ('sq_mg4') < 60) this.quests.set('sq_mg4', 60, this.day());
      const o = this.cell.actors.find((a) => a.uid === 'ondine_follow');
      o?.say('...No. Oh, no.', true);
    }
    if (actor.uid === 'hollow_king') this.ashgraveFalls(actor);
  },
  tickGuild() {
    const c = this.cell, p = this.player;
    if (this.gateRite) this.tickGateRite();
    if (c.id === 'bone_stair' && this.mgQ('sq_mg4') >= 20 && this.mgQ('sq_mg4') < 40) {
      const b = c.actors.find((a) => a.uid === 'bastien' && !a.dead);
      if (b && b.pos.distanceTo(p.pos) < 12) { this.quests.set('sq_mg4', 40, this.day()); b.say('He said you\'d come.', true); }
    }
    if (c.id === 'ashgrave_throne') this.tickThrone();
  },
};
