// The Admiral: the Brinewhistle Cove questline (sq_cat1–sq_cat5). Mixed into `game`, so `this` is the game.
// Where the Admiral is at each point of the story, the Captain's three trials, the night the Dread Meringue
// came out of the fog, the ghost ship itself, and Naming Night.
import * as THREE from 'three';
import { Actor, makeActorDef } from './actors/actor.js';
import { NPCS } from './data/actors.js';
import { ITEMS } from './data/items.js';
import { INSULTS } from './data/dialogue.js';
import { COVE } from './world/layout.js';
import { smoothstep } from './core/noise.js';

const PI = Math.PI;
const hourOf = (g) => ((g.time.hours % 24) + 24) % 24;
const between = (h, a, b) => (a <= b ? h >= a && h < b : h >= a || h < b);
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
// the litter: [name in the log, fur, white sock]
const KITTENS = [['orange', 0xe0923c, false], ['sock', 0xe8a050, true], ['black', 0x2a2628, false], ['grey', 0x8a8a90, false]];
const _fogCol = new THREE.Color();

export const ADMIRAL = {
  // ----------------------------------------------------------------- where everyone is
  /** Where the Admiral should be when she isn't trotting after you. */
  admiralSpot() {
    const Q = (q) => this.quests.stage(q), f = this.flags;
    if (f.admiralFollowing) return null;
    if (f.namingNightDone) return { cell: 'cove', rail: true };
    if (Q('sq_cat5') >= 10) return { cell: 'herring', chest: true };
    if (Q('sq_cat4') >= 100) return null;
    if (Q('sq_cat3') >= 30) return { cell: 'meringue' };
    if (Q('sq_cat3') === 20) return { cell: 'herring', cushion: true };
    if (Q('sq_cat1') >= 60) return { cell: 'cove', rail: true };
    return { cell: 'cove', nook: true };
  },
  /** The Captain is out on the pier waiting for the dark, or aboard the Meringue with you. */
  captainAway() {
    if (this.flags.gallowglassFollowing) return true;
    const st = this.quests.stage('sq_cat4');
    return st >= 10 && st < 100 && between(hourOf(this), 20, 4);
  },
  captainFollowing() { return !!this.flags.gallowglassFollowing; },

  makeAdmiral(x, y, z) {
    const a = new Actor('admiral', x, y, z, { uid: 'admiral', yaw: Math.random() * 6.28 });
    a.following = !!this.flags.admiralFollowing;
    return a;
  },
  makeKitten(i, x, y, z, uid) {
    const [, color, sock] = KITTENS[i];
    const def = makeActorDef('kitten');
    def.body = { ...def.body, color, sock };
    return new Actor(def, x, y, z, { uid: uid || `kitten_${i}`, yaw: Math.random() * 6.28 });
  },
  /** Sit an animal on something that isn't ground (the Herring's rail, a lap). */
  perch(a, x, y, z, yaw) {
    a.perch = y;
    a.pos.set(x, y, z);
    a.home.set(x, y, z);
    a.def = { ...a.def, stationary: true, wander: 0 };
    if (yaw !== undefined) { a.yaw = yaw; a.homeYaw = yaw; }
  },

  /** Put the Admiral, her kittens, Fennick, Crumpet and the soggy note wherever the story says, in `cell`. */
  syncCove(cell = this.cell) {
    if (!['cove', 'herring', 'meringue', 'drowned_grotto'].includes(cell.id)) return;
    const f = this.flags, Q = (q) => this.quests.stage(q);
    const H = (x, z, y = 500) => cell.collision.groundHeight(x, z, y);
    // the Admiral
    const want = this.admiralSpot();
    let adm = cell.actors.find((a) => a.uid === 'admiral');
    if (!adm?.following) {
      const key = want && want.cell === cell.id ? JSON.stringify(want) : null;
      if (adm && adm.spotKey !== key) { this.removeActor(adm); adm = null; }
      if (key && !adm) {
        let x = 0, z = 0, y;
        if (want.rail) { x = COVE.rail.x; z = COVE.rail.z; y = COVE.rail.y; }
        else if (want.nook) { x = COVE.nook.x; z = COVE.nook.z; }
        else if (want.chest && cell.meta?.seaChest) { x = cell.meta.seaChest.x + 0.6; z = cell.meta.seaChest.z; }
        else if (want.cushion && cell.meta?.cushion) { x = cell.meta.cushion.x; z = cell.meta.cushion.z; }
        else if (cell.id === 'meringue' && cell.meta?.npcs['1']) { x = cell.meta.npcs['1'].x + 1.1; z = cell.meta.npcs['1'].z + 0.4; }
        adm = this.makeAdmiral(x, y ?? H(x, z), z);
        adm.spotKey = key;
        if (y !== undefined || cell.id === 'meringue') this.perch(adm, x, y ?? H(x, z), z);
        if (want.chest) this.perch(adm, x, H(x, z), z);
        this.addActor(adm, cell);
      }
    }
    // the kittens: four in the sea chest, then three on the rail once you've chosen yours
    const litter = cell.actors.filter((a) => a.uid?.startsWith('kitten_'));
    const wantKits = cell.id === 'herring' && Q('sq_cat5') >= 10 && !f.namingNightDone ? [0, 1, 2, 3]
      : cell.id === 'cove' && f.namingNightDone && !this.namingNight ? [0, 1, 2, 3].filter((i) => i !== f.kittenColor) : [];
    for (const k of litter) if (!wantKits.includes(+k.uid.slice(7))) this.removeActor(k);
    wantKits.forEach((i, n) => {
      if (litter.some((k) => k.uid === `kitten_${i}` && cell.actors.includes(k))) return;
      let x, y, z;
      if (cell.id === 'herring' && cell.meta?.seaChest) { x = cell.meta.seaChest.x + (n % 2 ? 0.25 : -0.25); z = cell.meta.seaChest.z + (n < 2 ? 0.2 : -0.2); y = H(x, z) + 0.35; }
      else { x = COVE.rail.x + (n - 1) * 0.55; z = COVE.rail.z + 0.3; y = COVE.rail.y; }
      const k = this.makeKitten(i, x, y, z);
      this.perch(k, x, y, z);
      this.addActor(k, cell);
    });
    // the sea chest stands open once she's moved in
    if (cell.id === 'herring' && cell.meta?.seaChest?.lid) cell.meta.seaChest.lid.rotation.x = Q('sq_cat5') >= 10 ? -1.2 : 0;
    // Fennick, in his barrel
    if (cell.id === 'cove' && f.fennickAshore && !cell.actors.some((a) => a.uid === 'fennick')) {
      const npc = NPCS.find((n) => n.id === 'fennick');
      this.spawnNpc(cell, npc, npc.x, H(npc.x, npc.z), npc.z, 0);
    }
    // the soggy note on the Admiral's cushion
    if (cell.id === 'herring' && Q('sq_cat3') >= 30 && !this.taken.brisk_note_pickup && !cell._notePlaced && cell.meta?.cushion) {
      cell._notePlaced = true;
      const b = { add: (o) => cell.group.add(o), interact: (d) => { cell.interactables.push(d); return d; } };
      this.placeItem(b, 'brisk_note', cell.meta.cushion.x, (cell.meta.cushion.y ?? 0.24) + 0.12, cell.meta.cushion.z, 'brisk_note_pickup');
    }
    // the ghost-lantern on its rock, beside a lady of some size
    if (cell.id === 'drowned_grotto' && !this.taken.ghost_lantern_pickup && !cell._lanternPlaced && cell.meta?.lanternRock && !this.player.inventory.has('ghost_lantern')) {
      cell._lanternPlaced = true;
      const L = cell.meta.lanternRock;
      const b = { add: (o) => cell.group.add(o), interact: (d) => { cell.interactables.push(d); return d; } };
      this.placeItem(b, 'ghost_lantern', L.x, (L.y ?? H(L.x, L.z, 4)) + 0.05, L.z, 'ghost_lantern_pickup');
      cell.lights.push({ color: new THREE.Color(0x7affc0), intensity: 10, distance: 9, pos: new THREE.Vector3(L.x, 1.6, L.z), flicker: true, night: false, on: true });
    }
    // aboard the Meringue: Crumpet in the hold, and the Bosun if you never took his key
    if (cell.id === 'meringue') {
      if (!f.briskRested && cell.meta?.crumpet && !cell.actors.some((a) => a.uid === 'crumpet')) {
        const C = cell.meta.crumpet;
        const c = this.spawnCreature(cell, 'crumpet', C.x, 0, C.z, { uid: 'crumpet' });
        c.home.set(C.x, c.pos.y, C.z);
        if (f.crumpetFound) { c.following = true; c.pos.copy(this.player.pos).add(new THREE.Vector3(1, 0, 1)); }
      }
      if (!this.player.inventory.has('brisk_key') && !f.briskDoor && !cell.actors.some((a) => a.uid === 'bosun_meringue') && cell.meta?.enemies?.length) {
        const e = cell.meta.enemies[Math.floor(cell.meta.enemies.length / 2)];
        this.spawnCreature(cell, 'drowned_bosun', e.x, 0, e.z, { uid: 'bosun_meringue' });
      }
    }
  },
  /** World-side switches: the prints in the sand. */
  applyCoveWorld() {
    const st = this.cells.cove?.state;
    if (!st) return;
    const Q = (q) => this.quests.stage(q);
    if (st.pawPrints) st.pawPrints.visible = Q('sq_cat1') >= 30 && Q('sq_cat1') < 50;
    if (st.wetPrints) st.wetPrints.visible = (Q('sq_cat3') >= 30 && Q('sq_cat3') < 40) || (Q('sq_cat5') >= 10 && Q('sq_cat5') < 30);
    if (this.cell?.id === 'cove' || this.cell?.id === 'herring' || this.cell?.id === 'meringue') this.syncCove(this.cell);
  },
  /** Just outside the cove door that leads into interior `id` (for a save loaded indoors). */
  coveDoorFor(id) {
    const cove = this.getCell('cove');
    const d = cove.interactables.find((t) => t.kind === 'door' && t.cell === id);
    return d ? this.exitPointFor(d, cove) : null;
  },
  /** Called as you arrive in any cell. */
  coveOnEnter(id) {
    if (id === 'cove' && this.quests.stage('sq_cat1') < 10) this.quests.set('sq_cat1', 10, this.day());
    if (id === 'meringue' && this.quests.stage('sq_cat4') >= 10 && this.quests.stage('sq_cat4') < 20) this.quests.set('sq_cat4', 20, this.day());
    this.applyCoveWorld();
    this.syncCove(this.cell);
  },
  /** Called as you leave a cell: Crumpet is bound to her ship, and the Captain goes home if you row back early. */
  coveOnLeave(from, to) {
    if (from !== 'meringue') return;
    for (const a of this.cell.actors) if (a.uid === 'crumpet') a.following = false;
    const cap = this.cell.actors.find((a) => a.uid === 'gallowglass_follow');
    if (cap) { cap.following = false; this.removeActor(cap); }
    this.flags.gallowglassFollowing = false;
  },
  coveOnStage(q, st) {
    if (!q.startsWith('sq_cat')) return;
    if (q === 'sq_cat2' && st === 10) this.catTrialStage();
    this.applyCoveWorld();
  },
  coveOnItem(id) {
    const Q = (q) => this.quests.stage(q), d = this.day();
    if (id === 'brisk_note' && Q('sq_cat3') >= 30 && Q('sq_cat3') < 35) this.quests.set('sq_cat3', 35, d);
    if (id === 'ghost_lantern' && Q('sq_cat3') >= 50 && Q('sq_cat3') < 70) { if (Q('sq_cat3') < 60) this.quests.set('sq_cat3', 60, d); this.quests.set('sq_cat3', 70, d); }
  },
  coveOnDeath(actor) {
    if (actor.uid === 'brisk') {
      this.flags.briskGone = true;
      this.flags.briskFought = true;
      if (this.quests.stage('sq_cat4') < 60) this.quests.set('sq_cat4', 60, this.day());
      this.particles.burst(actor.center(), 'magic', 40, 0x9affc8);
      this.audio.play('shipBell', 0.6);
      const adm = this.cell.actors.find((a) => a.uid === 'admiral');
      if (adm) { adm.def = { ...adm.def, stationary: false }; adm.perch = undefined; }
    }
  },

  // ----------------------------------------------------------------- the animals
  /** E on the Admiral, a kitten or Crumpet. Returns true if handled. */
  petCoveAnimal(a) {
    const Q = (q) => this.quests.stage(q), p = this.player, d = this.day();
    if (a.uid === 'crumpet') {
      if (this.flags.crumpetFound) return this.ui.notify('Crumpet butts her cold little head against your hand.'), true;
      this.flags.crumpetFound = true;
      a.following = true;
      this.audio.play('meow', 0.6);
      this.particles.burst(a.center(), 'magic', 20, 0x9affc8);
      this.ui.showMessage('Crumpet', 'You crouch very still, and hold out your hand, and wait.\n\nThe ghost-cat looks at you for a long time with eyes like two green lamps. Then she walks up, sniffs your fingers — her nose is cold as the sea — and butts her head against your knuckles, once, hard.\n\nShe has one white sock. When you stand up, she follows.');
      return true;
    }
    if (a.uid === 'admiral') {
      // the nook: a smoked herring is the only argument she listens to
      if (Q('sq_cat1') >= 10 && Q('sq_cat1') < 50 && !this.flags.admiralFollowing) {
        if (!p.inventory.has('smoked_herring')) return this.ui.showMessage('Admiral Marmalade', 'A very fat orange cat in a small admiral\'s hat sits in the rotten rowboat on a heap of stolen wool. She looks at you as if YOU were the one who was lost.\n\n(She won\'t come for nothing. Something fishy might change her mind.)'), true;
        this.takeItem('smoked_herring', 1);
        this.flags.admiralFollowing = true;
        a.following = true;
        a.perch = undefined;
        a.def = { ...a.def, stationary: false };
        this.giveItem('crumpet_collar', 1, true);
        if (Q('sq_cat1') < 40) this.quests.set('sq_cat1', 40, d);
        this.quests.set('sq_cat1', 50, d);
        this.audio.play('purr', 0.8);
        this.ui.showMessage('Admiral Marmalade', 'You hold out the smoked herring. The Admiral regards it. She regards you. She takes the herring, slowly, and eats the whole thing, slowly, while looking you in the eye the entire time.\n\nThen she climbs out of the boat, stretches one back leg at a time, and sits down on your foot.\n\nIn the wool where she was sitting, something glints: an old brass collar with a little bell that doesn\'t ring. Engraved on the buckle: CRUMPET — D. MERINGUE.');
        return true;
      }
      // the Trial of Tribute
      if (Q('sq_cat2') >= 10 && !this.flags.trialSardine && p.inventory.has('golden_sardine')) {
        this.takeItem('golden_sardine', 1);
        this.flags.trialSardine = true;
        this.audio.play('purr', 0.8);
        this.magic.glint(a.center().add(new THREE.Vector3(0, 0.3, 0)), 0xffd060, 1.4, 0.5);
        this.ui.showMessage('The Trial of Tribute', 'You lay the golden sardine before the Admiral. She inspects it from three sides. She inspects YOU from two. Then she eats it with enormous dignity, washes one paw, and closes her eyes, which in cat means "you may live".');
        this.catTrialStage();
        return true;
      }
      // the Meringue: carry her home
      if (this.cell.id === 'meringue' && (Q('sq_cat4') === 60 || Q('sq_cat4') === 70)) { this.finishMeringue(a); return true; }
      this.audio.play(Math.random() < 0.5 ? 'purr' : 'meow', 0.5);
      this.ui.notify(['The Admiral permits one stroke. Exactly one.', 'The Admiral rumbles like a small, fat, distant thunderstorm.', 'The Admiral rolls over to show you her belly. It is a trap. You know it is a trap. You fall for it anyway.', 'The Admiral\'s hat slips over one eye. She does not acknowledge this.'][Math.floor(Math.random() * 4)]);
      if (this.flags.admiralFollowing) a.yaw = Math.atan2(p.pos.x - a.pos.x, p.pos.z - a.pos.z);
      return true;
    }
    if (a.uid?.startsWith('kitten_')) {
      this.audio.play('meow', 0.35);
      this.ui.notify(['The kitten attacks your finger with tremendous seriousness.', 'The kitten falls asleep in the middle of being stroked.', 'The kitten tries to climb your boot and does not succeed.'][Math.floor(Math.random() * 3)]);
      return true;
    }
    return false;
  },

  // ----------------------------------------------------------------- Cat Overboard
  /** The Admiral is delivered: she goes home to her rail. */
  admiralComesHome() {
    this.flags.admiralFollowing = false;
    for (const c of Object.values(this.cells)) for (const a of [...c.actors]) if (a.uid === 'admiral') this.removeActor(a);
    this.giveItem('gold', 50);
    this.quests.set('sq_cat1', 100, this.day());
    this.giveItem('herring_articles', 1);
    this.quests.set('sq_cat2', 10, this.day());
    this.ui.notify('The Admiral pads off to her sunning spot on the rail.');
  },

  // ----------------------------------------------------------------- the three trials
  catTrialStage() {
    const st = this.quests.stage('sq_cat2');
    if (st < 10 || st >= 100) return;
    const n = ['trialSardine', 'trialLap', 'trialTongues'].filter((k) => this.flags[k]).length;
    const want = [10, 20, 30, 40][n];
    if (want > st) this.quests.set('sq_cat2', want, this.day());
  },
  catsPawCeremony() {
    this.quests.set('sq_cat2', 100, this.day());
    this.giveItem('catspaw_bandana', 1);
    this.giveItem('gold', 100);
    this.quests.set('sq_cat3', 10, this.day());
    this.audio.play('purr', 0.8);
    this.ui.showMessage('Cat\'s-Paw', 'Out on the tilted deck of the Herring, with the crew standing in a ragged line — Odette with her ladle at the salute, Grumm in a fresh orange jumper, J\'zhirr pretending to be asleep — the Captain sets the Admiral down in front of you.\n\nShe looks at your boot. She looks at the crew. Then she lifts one fat orange paw and places it on your toe, deliberately, like a seal on a letter.\n\n"Cat\'s-Paw of the Indignant Herring," says the Captain, and Odette ties a red bandana printed with paw-prints round your arm. "Outranks nobody. Welcome aboard."\n\nAfterwards, while the others are arguing about rum, the Captain stands at the rail a long time, looking out toward the Gullstack.\n\n"Fog\'s coming in," he says. "Haven\'t seen fog like that in forty years."');
  },
  /** Fishing off the end of the pier. At dawn, with J'zhirr's hook, the golden sardine bites. */
  useFishSpot(t) {
    const p = this.player, hr = hourOf(this);
    const trial = this.quests.stage('sq_cat2') >= 10 && !this.flags.trialSardine && !p.inventory.has('golden_sardine');
    if (!trial) {
      this.passTime(0.5);
      if (Math.random() < 0.55) { this.giveItem('herring', 1, true); this.audio.play('splash', 0.5); return this.ui.showMessage(t.name, 'You sit with your legs over the end of the pier and fish for half an hour. The sea gives you a herring, looking surprised.'); }
      return this.ui.showMessage(t.name, 'You fish for half an hour. The gulls watch with professional interest. Nothing bites.');
    }
    if (!p.inventory.has('proper_hook')) return this.ui.showMessage(t.name, 'You could drop a line here — but the golden sardine, J\'zhirr says, will not look at a common hook. He has a proper one. He will make a fuss about it.');
    if (!between(hr, 5, 8)) return this.ui.showMessage(t.name, 'You fish off the end of the pier with J\'zhirr\'s brass hook. Herring nose at it; nothing gold comes.\n\n(The golden sardine rises with the sun — between five and eight in the morning.)');
    this.passTime(0.5);
    this.audio.play('splash', 0.6);
    if (Math.random() < 0.6 || (this.flags.sardineTries || 0) >= 2) {
      this.giveItem('golden_sardine', 1);
      this.audio.play('chime', 0.8);
      this.particles.burst(t.pos.clone().setY(t.pos.y + 0.3), 'sparkle', 20);
      return this.ui.showMessage(t.name, 'The sun comes up out of the sea in a long gold line, and something in the shallows comes up with it — a flicker like a dropped coin. It circles the brass hook once, considers, and takes it.\n\nYou lift out a golden sardine, flipping and shining in your palm. Somewhere behind you, on the Herring\'s rail, a fat orange head comes up.');
    }
    this.flags.sardineTries = (this.flags.sardineTries || 0) + 1;
    this.giveItem('herring', 1, true);
    return this.ui.showMessage(t.name, 'Half an hour passes. A gold flicker in the shallows turns away at the last moment, and a common herring takes the hook instead. Patience. Try again.');
  },
  /** The Trial of Patience: sit in the Captain's armchair and let the Admiral choose your lap. */
  useLapChair(t) {
    const p = this.player, m = this.cell.meta?.lapChair;
    if (this.lap || !m) return;
    const trial = this.quests.stage('sq_cat2') >= 10 && !this.flags.trialLap;
    if (!trial) return this.ui.showMessage(t.name, this.flags.trialLap ? 'The Captain\'s armchair, sat into the exact shape of the Captain. There is a warm, cat-shaped dent in the middle of it, and orange hair on every inch.' : 'A great leather armchair, sat into the exact shape of the Captain. Article Seven of the Herring has a footnote about this chair. The footnote says DON\'T.');
    p.seated = { x: m.x, z: m.z, y: this.cell.collision.groundHeight(m.x + 1.2, m.z, 2) };
    p.yaw = m.faceYaw ?? m.rot + PI;
    p.pitch = -0.45;
    p.weaponOut = false;
    // she comes out from wherever she was, in her own time
    const cush = this.cell.meta.cushion || { x: m.x + 2, z: m.z + 2 };
    const cat = this.spawnCreature(this.cell, 'admiral', cush.x, 0, cush.z, { uid: 'admiral_lap' });
    cat.def = { ...cat.def, stationary: true, wander: 0 };
    cat.home.set(m.x, cat.pos.y, m.z);
    this.lap = { cat, start: this.clockT, t0: null };
    this.hudBanner('Sit still. The Admiral is considering you...');
    this.ui.notify('You sit in the Captain\'s armchair. Any movement and she\'ll leave.');
  },
  tickLap() {
    const L = this.lap, p = this.player;
    if (!L) return;
    if (!p.seated || this.cell.id !== 'herring') return this.standUp(false);
    const m = this.cell.meta.lapChair;
    if (!L.t0) {
      if (Math.hypot(L.cat.pos.x - m.x, L.cat.pos.z - m.z) < 1.2 || this.clockT - L.start > 12) {
        // up, round twice, and down
        // curled crosswise over your knees, just below your eyeline
        const fx = -Math.sin(p.yaw) * 0.32, fz = -Math.cos(p.yaw) * 0.32;
        this.perch(L.cat, m.x + fx, p.seated.y + (m.seatY ?? 0.5) - 0.16, m.z + fz, p.yaw + PI / 2); // legs tucked under her
        L.t0 = this.clockT;
        L.purrT = 0;
        this.audio.play('purr', 0.7);
      }
      return;
    }
    const k = Math.min(1, (this.clockT - L.t0) / 45);
    const n = Math.floor(k * 20);
    const bar = '█'.repeat(n) + '░'.repeat(20 - n);
    this.hudBanner(`The Admiral is on your lap. Don't move.   ${bar}`);
    if ((L.purrT -= 1 / 4) <= 0) { L.purrT = 10; this.audio.play('purr', 0.5); }
    if (k >= 1) {
      this.flags.trialLap = true;
      const known = (this.flags.retorts ||= []);
      if (!known.includes(4)) known.push(4);
      this.standUp(false);
      this.ui.showMessage('The Trial of Patience', 'Forty-five seconds becomes a minute. A minute becomes the longest five minutes of your life. Your foot goes to sleep. Your nose itches. Somewhere a gull laughs at you.\n\nThe Admiral sleeps on, a warm orange weight, rumbling like a distant storm. When at last she wakes, she stretches, kneads your knee twice with her claws — on purpose — and hops down as if nothing has happened.\n\nYou have been chosen. You will have orange hair on these trousers until the day you die.\n\n(You have learned a new retort: "She did, this morning. Ask her.")');
      this.catTrialStage();
    }
  },
  /** Up out of the chair. broken: you moved, and she minded. */
  standUp(broken) {
    const L = this.lap, p = this.player;
    p.seated = null;
    this.lap = null;
    this.hudBanner(null);
    if (!L) return;
    if (L.cat && this.cell.actors.includes(L.cat)) this.removeActor(L.cat);
    if (broken && !this.flags.trialLap) {
      this.audio.play('meow', 0.7);
      this.ui.showMessage('The Trial of Patience', L.t0 ? 'You move. The Admiral\'s eyes open instantly. She looks at you with an expression of the deepest betrayal, jumps down, and stalks out of the cabin with her tail straight up like a flagpole.\n\nShe will remember this.\n\n(Sit in the armchair to try again — and this time, keep your hands, feet and weapons to yourself.)' : 'You get up before she has even arrived. Somewhere in the hold, a fat orange cat turns round and goes back to sleep.');
    }
  },
  /** The Trial of Tongues: three of Grumm's insults, answered from whatever retorts you've collected. */
  insultDuel(npc) {
    const order = shuffle([0, 1, 2, 3, 4]).slice(0, 3);
    let round = 0;
    const ask = () => {
      const ins = INSULTS[order[round]];
      const known = shuffle([...(this.flags.retorts || [])]);
      const opts = known.map((i) => ({ label: `"${INSULTS[i].retort}"`, fn: () => answer(i === order[round]) }));
      opts.push({ label: '"...Er."', fn: () => answer(false) });
      this.ui.showChoice(`Insult Duel — round ${round + 1} of 3`, `Grumm leans down until his tusks are level with your nose.\n\n"${ins.insult}"`, opts);
    };
    const answer = (ok) => {
      if (!ok) {
        npc?.say('HA!', true);
        this.audio.play('grunt', 0.6);
        return this.ui.showMessage('Insult Duel', '*Grumm throws back his head and roars with laughter, slapping his knee so hard a ball of wool rolls into the sea.* HA! HA! Is that it? Is that the best you\'ve got? Come back when you\'ve been to school, little Cat\'s-Paw.\n\n(Learn more retorts from the crew, then challenge him again.)');
      }
      this.audio.play('ui', 1);
      if (++round < 3) return ask();
      this.flags.trialTongues = true;
      npc?.say('...Well. Well, well, well.', true);
      this.audio.play('levelUp', 0.6);
      this.ui.showMessage('The Trial of Tongues', '*Grumm opens his mouth. Closes it. Opens it again. Nothing comes out. He sits down on his upturned boat very heavily, picks up his knitting, and stares at it.*\n\n...Nobody\'s done that since the Siege of Anvil Docks. *He sniffs.* Fine. FINE. You win. Go and tell the Captain. I\'ll be here. Knitting my feelings.');
      this.catTrialStage();
    };
    ask();
  },
  hudBanner(text) {
    if (!this._coveHud) {
      const el = document.createElement('div');
      el.style.cssText = 'position:fixed;top:64px;left:50%;transform:translateX(-50%);padding:8px 22px;border-radius:6px;background:rgba(20,30,40,0.8);border:1px solid #c8a060;color:#f4ecc8;font:600 18px "Cinzel", serif;letter-spacing:1px;z-index:40;pointer-events:none;text-shadow:0 1px 3px #000;white-space:pre';
      document.body.appendChild(el);
      this._coveHud = el;
    }
    this._coveHud.style.display = text ? 'block' : 'none';
    if (text) this._coveHud.textContent = text;
  },

  // ----------------------------------------------------------------- The Fog Comes In
  startRaid() {
    const c = this.cell;
    this.quests.set('sq_cat3', 20, this.day());
    this.raid = { wave: 0, actors: [], crew: [], next: this.clockT + 6 };
    this.audio.play('shipBell', 1);
    setTimeout(() => this.audio.play('shipBell', 0.8), 2600);
    setTimeout(() => this.audio.play('shipBell', 0.6), 5200);
    this.audio.setMusic('combat');
    this.ui.notify('A ship\'s bell tolls three times, out in the fog.');
    // Odette and Grumm come down to the waterline with their cutlasses out
    for (const [id, wpn] of [['odette', 'iron_shortsword'], ['grumm', 'iron_waraxe']]) {
      const npc = NPCS.find((n) => n.id === id);
      const x = COVE.fire.x + (id === 'grumm' ? 3 : -3), z = COVE.fire.z + 4;
      const a = this.spawnNpc(c, { ...npc, id: id + '_raid', cell: 'cove', activeHours: undefined, stationary: false, faction: 'ally', ai: 'melee', weapon: wpn, health: 200, essential: true, merchant: undefined }, x, c.collision.groundHeight(x, z, 500), z);
      if (a) { a.faction = 'ally'; a.def.dialogue = undefined; a.home.set(COVE.fire.x, a.pos.y, COVE.fire.z + 6); this.raid.crew.push(a); }
    }
    this.raid.crew[0]?.say('To the waterline! Mind the Herring!', true);
  },
  tickRaid() {
    const R = this.raid, c = this.cell;
    if (c.id !== 'cove') { this.abortRaid(); return; }
    const alive = R.actors.filter((a) => !a.dead);
    if (alive.length) { R.next = this.clockT + 4; return; }
    if (this.clockT < R.next) return;
    if (R.wave >= 3) return this.endRaid();
    const n = [4, 4, 5][R.wave++];
    for (let i = 0; i < n; i++) {
      const [x, z] = COVE.beach[Math.floor(Math.random() * COVE.beach.length)];
      const px = x + (Math.random() - 0.5) * 6, pz = z + 2 + Math.random() * 4;
      const boss = R.wave === 3 && i === 0;
      const a = boss ? this.spawnCreature(c, 'drowned_bosun', px, 0, pz, { uid: 'drowned_bosun' }) : this.spawnLeveled(c, 'drowned', px, 0, pz);
      a.setTarget(Math.random() < 0.7 ? this.player : (R.crew[i % R.crew.length] || this.player));
      this.particles.burst(a.center(), 'smoke', 8);
      R.actors.push(a);
    }
    this.audio.play('splash', 0.8);
    this.ui.notify(R.wave === 3 ? 'The last of them come up out of the surf — and something big is with them.' : 'The drowned come wading out of the sea!');
  },
  abortRaid() {
    const R = this.raid;
    this.raid = null;
    for (const a of [...R.actors, ...R.crew]) this.removeActor(a);
  },
  endRaid() {
    const R = this.raid;
    this.raid = null;
    for (const a of R.crew) { this.particles.burst(a.center(), 'smoke', 6); this.removeActor(a); }
    this.flags.fennickAshore = true;
    this.quests.set('sq_cat3', 30, this.day());
    this.audio.setMusic(this.cell.music);
    this.applyCoveWorld();
    this.ui.showMessage('The Fog Comes In', 'The last of the drowned falls apart in the surf. For a moment the cove is quiet except for the waves and your own breathing.\n\nThen a roar comes from the Indignant Herring — the Captain\'s voice, cracking like a boy\'s:\n\n"SHE\'S GONE! The cushion\'s WET — she\'s GONE!"\n\nA line of wet prints, too big and too bony for a cat\'s, runs from the Herring\'s door down the beach and into the sea. Out in the fog, a green light swings once, and goes out.\n\nBy the pier, a drowned sailor with no legs is sitting in a barrel, looking embarrassed.');
  },

  // ----------------------------------------------------------------- The Dread Meringue
  useJollyBoat(t) {
    const st = this.quests.stage('sq_cat4'), p = this.player;
    if (st < 10 || st >= 100) return this.ui.showMessage(t.name, this.flags.fogLifted ? 'The jolly boat, painted with a small orange cat. It rocks gently against the pier. There is nowhere it needs to go any more.' : 'The Herring\'s jolly boat, painted with a small orange cat, tied up at the end of the pier. The oars are shipped. It isn\'t yours to take.');
    if (!p.inventory.has('ghost_lantern')) return this.ui.showMessage(t.name, 'There\'s nothing out there but fog. Without a drowned light you could row in circles till dawn and never find her.');
    if (!between(hourOf(this), 20, 4)) return this.ui.showMessage(t.name, 'Out past the Gullstack the sea is bright and empty. The Meringue only sails in the night fog. Come back after dark.');
    if (!this.flags.gallowglassFollowing) {
      this.addActor(this.makeCaptainFollower(p.pos.x - 1, p.pos.y, p.pos.z + 1));
      this.flags.gallowglassFollowing = true;
    }
    this.audio.play('splash', 0.7);
    this.doorReturns._cove = { x: COVE.jolly.x - 2, z: COVE.jolly.z - 4, yaw: PI };
    this.enterCell('meringue', null, 'You row out into the fog. The Captain holds the green lantern up, and doesn\'t say a word.');
  },
  useBriskDoor(t) {
    if (this.flags.briskDoor) return;
    if (!this.player.inventory.has('brisk_key')) return this.ui.showMessage(t.name, 'A heavy stern-cabin door, carved with a cat in a tricorn. Locked. The keyhole is shaped like a cat\'s head. The Drowned Bosun carried Brisk\'s key.');
    this.flags.briskDoor = true;
    this.audio.play('unlock');
    this.applyPersistentState(this.cell);
    this.ui.notify('You turn Brisk\'s cat-headed key. The cabin door swings open on a breath of cold green air.');
  },
  briskFights(npc) {
    npc.faction = 'monster';
    npc.hostileToPlayer = true;
    npc.setTarget(this.player);
    npc.def.stationary = false;
    this.flags.briskFought = true;
    npc.say('ALL HANDS! REPEL BOARDERS!', true);
  },
  /** Mother Brisk lets go: with Crumpet back in her arms, or with her cabin boy's apology. */
  briskRests(npc, how) {
    const c = this.cell;
    this.flags.briskRested = true;
    this.flags.briskGone = true;
    this.flags.briskHow = how;
    this.quests.set('sq_cat4', 70, this.day());
    this.giveItem('brisk_tricorn', 1);
    if (how === 'crumpet') this.giveItem('brisk_compass', 1);
    this.audio.play('shipBell', 0.7);
    // her crew lay down their cutlasses and go with her
    for (const a of [...c.actors]) {
      if (a.dead || !(a.def.tplId?.startsWith('drowned'))) continue;
      this.particles.burst(a.center(), 'magic', 14, 0x9affc8);
      this.removeActor(a);
    }
    const crumpet = c.actors.find((a) => a.uid === 'crumpet');
    if (crumpet && how === 'crumpet') { crumpet.following = false; this.perch(crumpet, npc.pos.x, npc.pos.y + 0.75, npc.pos.z + 0.2, npc.yaw); }
    const adm = c.actors.find((a) => a.uid === 'admiral');
    if (adm) { adm.perch = undefined; adm.def = { ...adm.def, stationary: false, wander: 2 }; adm.home.copy(this.player.pos); }
    // she goes like fog goes, all at once and not at all
    const fade = [npc, ...(crumpet ? [crumpet] : [])];
    const mats = [];
    for (const a of fade) a.group.traverse((o) => { if (o.isMesh && o.material) for (const m of [].concat(o.material)) { m.transparent = true; mats.push([m, m.opacity ?? 1]); } });
    setTimeout(() => {
      this.magic.add(null, 4, (e, dt, k) => { for (const [m, o0] of mats) m.opacity = o0 * (1 - k); });
      setTimeout(() => { for (const a of fade) { this.particles.burst(a.center(), 'sparkle', 24); if (c.actors.includes(a)) this.removeActor(a); } }, 4000);
    }, 6000);
    const text = how === 'crumpet'
      ? 'Mother Brisk sits with the ghost of her cat in her arms, and for the first time the green light in her eyes looks like something other than grief.\n\n"Forty years," she says into Crumpet\'s fur. "Forty years, you dreadful animal." Crumpet bites her, gently, on the thumb.\n\nAll through the ship there is a clatter: the drowned are laying down their cutlasses, one by one, and going still, and going out like lamps. Mother Brisk takes off her tricorn and her old brass compass and presses them into your hands. "For the one who found her. The compass points home. Mine always did. I just never looked at it."\n\nThe Admiral is sitting at your feet, very pointedly. It is time to go home.'
      : 'Mother Brisk lets go of the Admiral and sits back in her great chair. The fury goes out of her the way the tide goes out — not all at once, but you can see it going.\n\n"You were twelve," she says again, to the Captain, softly. "Go home, Rourke. Feed your fat cat."\n\nAll through the ship the drowned are laying down their cutlasses and going still, and going out like lamps. The Captain stands holding Mother Brisk\'s tricorn in both hands, and does not say "arr", and does not say anything at all.\n\nThe Admiral is sitting at your feet, very pointedly. It is time to go home.';
    this.ui.showMessage('Mother Brisk', text);
  },
  /** Brisk calls up her crew when she's losing. */
  tickMeringue() {
    const c = this.cell, p = this.player;
    const brisk = c.actors.find((a) => a.uid === 'brisk' && !a.dead);
    if (brisk && this.quests.stage('sq_cat4') === 20 && this.flags.briskDoor && brisk.pos.distanceTo(p.pos) < 10) {
      this.quests.set('sq_cat4', 40, this.day());
      brisk.say('Come to steal my Crumpet back? Over my dead body. My SECOND dead body.', true);
    }
    if (brisk && brisk.hostileToPlayer && !brisk.summoned && brisk.health < brisk.maxHealth * 0.5) {
      brisk.summoned = true;
      brisk.say('All hands! ALL HANDS!', true);
      this.audio.play('shipBell', 0.8);
      for (let i = 0; i < 2; i++) {
        const a = (i ? 1 : -1) * 1.8;
        const at = brisk.pos.clone().add(new THREE.Vector3(Math.cos(a) * 2.5, 0, Math.sin(a) * 2.5));
        this.particles.burst(at.clone().setY(1), 'magic', 20, 0x9affc8);
        this.spawnCreature(c, 'drowned', at.x, 0, at.z).setTarget(p);
      }
    }
  },
  /** Pick the Admiral up and row home: dawn, the fog gone for good. */
  finishMeringue(adm) {
    this.removeActor(adm);
    this.flags.fogLifted = true;
    this.flags.gallowglassFollowing = false;
    const cap = this.cell.actors.find((a) => a.uid === 'gallowglass_follow');
    if (cap) this.removeActor(cap);
    // to the next dawn
    const hr = hourOf(this);
    this.time.hours += ((6 - hr) + 24) % 24 || 24;
    this.audio.play('purr', 0.8);
    const fought = this.flags.briskFought && !this.flags.briskRested;
    this.enterCell('cove', { x: COVE.jolly.x - 2, z: COVE.jolly.z - 4, yaw: PI }, 'You row home through the last of the fog.').then(() => {
      this.quests.set('sq_cat4', 100, this.day());
      this.quests.set('sq_cat5', 10, this.day());
      this.ui.showMessage('Home', `The Admiral allows herself to be picked up. She rides home on the Captain's shoulders like a fur stole with opinions, while you row and the Captain holds the green lantern up into the thinning fog.\n\n${fought ? 'Behind you the Dread Meringue settles into the sea in a great ring of foam, and is gone.' : 'Behind you, as the sun comes up, the Dread Meringue is sailing away from the Gullstack with all her torn sails set — translucent, then thin as a breath, then gone. Someone on her deck is holding a cat.'}\n\nThe moment the boat bumps against the pier, the Admiral launches herself off the Captain's shoulders, hits the boards running, and is gone up the beach.\n\nThe Captain looks at the empty space on his shoulders.\n\n"NOT AGAIN."`);
    });
  },

  // ----------------------------------------------------------------- Naming Night
  useSeaChest(t) {
    const st = this.quests.stage('sq_cat5');
    if (st >= 10 && st < 30) {
      this.quests.set('sq_cat5', 30, this.day());
      this.audio.play('meow', 0.5);
      setTimeout(() => this.audio.play('meow', 0.3), 400);
      return this.ui.showMessage(t.name, 'The lid of the Captain\'s sea chest is propped open on a boot. Inside, on a nest of every scrap of Grumm\'s wool — the orange, the green, the stripy one he was saving — lies the Admiral, enormously pleased with herself.\n\nAnd tucked against her belly, in a row, four kittens: one orange, one orange with a single white sock, one black, one grey. Their eyes are barely open.\n\nShe wasn\'t lost. Either time. She was looking for somewhere safe.');
    }
    return this.ui.showMessage(t.name, this.flags.namingNightDone ? 'The Captain\'s sea chest, lined now with very hairy wool. It has been officially renamed the Nursery.' : 'An iron-bound sea chest with GALLOWGLASS burned into the lid. Locked, and full, by the smell, of old charts and older socks.');
  },
  startNamingNight() {
    const c = this.cell, F = COVE.fire;
    const T = new THREE.Vector3(F.x, 0, F.z);
    const fest = [];
    const ring = ['gallowglass', 'odette', 'grumm', 'jzhirr'];
    ring.forEach((id, i) => {
      const npc = NPCS.find((n) => n.id === id);
      const ang = (i / ring.length) * PI * 2 + 0.4;
      const x = T.x + Math.cos(ang) * 4.2, z = T.z + Math.sin(ang) * 4.2;
      const a = this.spawnNpc(c, { ...npc, id: id + '_fest', cell: 'cove', activeHours: undefined, hideWhen: undefined, stationary: true, wander: 0 }, x, c.collision.groundHeight(x, z, 500), z);
      if (!a) return;
      a.def.dialogue = npc.dialogue;
      a.homeYaw = a.yaw = Math.atan2(T.x - x, T.z - z);
      a.noFacePlayer = true;
      fest.push(a);
    });
    // the Admiral and the litter by the fire
    const cats = [];
    const adm = this.makeAdmiral(T.x + 1.6, 0, T.z + 1.6);
    adm.pos.y = c.collision.groundHeight(adm.pos.x, adm.pos.z, 500);
    adm.uid = 'admiral_fest';
    adm.def = { ...adm.def, stationary: true, wander: 0 };
    this.addActor(adm);
    cats.push(adm);
    for (let i = 0; i < 4; i++) {
      const x = T.x + 1.2 + (i % 2) * 0.5, z = T.z + 2.4 + Math.floor(i / 2) * 0.5;
      const k = this.makeKitten(i, x, c.collision.groundHeight(x, z, 500), z, `fest_kitten_${i}`);
      k.def = { ...k.def, wander: 0.8 };
      this.addActor(k);
      cats.push(k);
    }
    const by = (u) => c.actors.find((a) => a.uid === u);
    const say = (u, txt) => by(u)?.say(txt, true);
    const cannons = () => {
      const pts = c.state?.cannons?.length ? c.state.cannons : [new THREE.Vector3(COVE.herring.x, 6, COVE.herring.z)];
      for (const p of pts) this.spellbook.fireworks({ pos: p.clone() }, {});
    };
    const steps = [
      [0.5, () => say('gallowglass_fest', 'All hands! ALL HANDS! ...Oh, you\'re all here. Good. Arr.')],
      [5, () => { say('odette_fest', 'Stew! One bowl each. Two for the Cat\'s-Paw. Don\'t argue, I\'m holding a ladle.'); this.giveItem('fish_stew', 2); }],
      [11, () => { say('grumm_fest', 'I made jumpers. Five. One for each kitten, and one for the new hand. I guessed your size.'); this.giveItem('tiny_jumper', 1); }],
      [17, () => say('jzhirr_fest', '...J\'zhirr would like to name the black one. "Also-A-Cat." Because she is. Also. A cat.')],
      [23, () => say('gallowglass_fest', 'Granted! Also-A-Cat, Cat\'s-Paw Third Class!')],
      [27, () => say('fennick', 'Ahem. If I may. A shanty.')],
      [30, () => say('fennick', 'Oh, the Meringue went down in the fog and the dark, with a crew and a cat and a captain...')],
      [36, () => { say('odette_fest', '...AND A CAPTAIN!'); say('grumm_fest', 'AND A CAPTAIN!'); }],
      [41, () => say('gallowglass_fest', 'And this one — with the white sock — is Crumpet. For Mother.')],
      [47, () => { say('gallowglass_fest', 'Gunners! ...That\'s me. FIRE!'); cannons(); }],
      [50, () => cannons()],
      [56, () => say('gallowglass_fest', 'And the last one, Cat\'s-Paw. She\'s been sitting on your boot this whole time. I think she\'s chosen.')],
      [62, () => this.finishNamingNight()],
    ];
    this.namingNight = { start: this.clockT, steps, i: 0, fest, cats };
    this.audio.setMusic('none');
    this.ui.notify('Naming Night begins.');
  },
  tickNamingNight() {
    const N = this.namingNight;
    const t = this.clockT - N.start;
    while (N.i < N.steps.length && N.steps[N.i][0] <= t) N.steps[N.i++][1]();
    // closed the choice without picking? the kitten is still asleep on your boot
    if (N.i >= N.steps.length && !this.flags.namingNightDone && this.clockT - (N.askT || 0) > 5) this.finishNamingNight();
  },
  finishNamingNight() {
    const names = ['Kipper', 'Mizzen', 'Bilge', 'Captain Fluffbeard'];
    const done = (name, color) => {
      this.flags.kittenName = name;
      this.flags.kittenColor = color;
      this.flags.namingNightDone = true;
      this.giveItem('purrsuit', 1);
      this.giveItem('gold', 300);
      this.quests.set('sq_cat5', 100, this.day());
      this.audio.setMusic(this.cell.music);
      // your kitten comes with you; the rest of the litter go up on the rail with their mother
      const fk = this.cell.actors.find((a) => a.uid === `fest_kitten_${color}`);
      const at = fk ? fk.pos.clone() : this.player.pos.clone().add(new THREE.Vector3(1, 0, 1));
      this.adoptPet('kitten', at);
      this.particles.burst(at.clone().setY(at.y + 0.3), 'magic', 24, 0xffc060);
      this.ui.showMessage(name, `"${name}," says the Captain, trying it out, and the kitten sneezes, which the whole crew agrees is approval.\n\nHe unbuckles the old cutlass from his belt — a short sea-green blade with a gold cat's-head pommel — and holds it out hilt-first. "Purrsuit. Carried it forty years. Never once used it on anything but rope and a very rude crab. Take it, Cat's-Paw. You'll need something to defend that kitten with."\n\n(${name} will follow you everywhere, and can't be hurt for long. Pet ${name} with E to tell them to stay or come along.)`);
    };
    const nameIt = (i) => this.ui.showChoice('Name your kitten', 'What will you call them?', names.map((n) => ({ label: n, fn: () => done(n, i) })));
    if (this.namingNight) this.namingNight.askT = this.clockT;
    // Crumpet (the white sock) stays with the Captain; the black one already has a name
    this.ui.showChoice('Pick of the Litter', 'Four kittens tumble about in the firelight. One of them has climbed your boot and gone to sleep on it. Which one is yours?', [
      { label: 'The orange one', fn: () => nameIt(0) },
      { label: 'The grey one', fn: () => nameIt(3) },
      { label: 'Also-A-Cat (the black one)', fn: () => done('Also-A-Cat', 2) },
    ]);
  },
  /** Once you are well away, the party breaks up. */
  endNamingNightCrowd() {
    const N = this.namingNight;
    this.namingNight = null;
    for (const a of [...N.fest, ...N.cats]) if (this.cell.actors.includes(a) || Object.values(this.cells).some((c) => c.actors.includes(a))) this.removeActor(a);
    this.syncCove(this.cells.cove);
  },

  // ----------------------------------------------------------------- per tick
  tickCove() {
    const q = this.quests, p = this.player, c = this.cell, d = this.day();
    if (this.lap) this.tickLap();
    if (c.id === 'meringue') return this.tickMeringue();
    if (c.id === 'herring') {
      // the Admiral is home: the Captain will want to know
      const adm = c.actors.find((a) => a.uid === 'admiral' && a.following);
      const cap = c.actors.find((a) => a.uid === 'gallowglass');
      if (adm && cap && q.stage('sq_cat1') === 50 && adm.pos.distanceTo(cap.pos) < 10) q.set('sq_cat1', 60, d);
      return;
    }
    if (c.id !== 'cove') {
      if (this.raid) this.abortRaid();
      return;
    }
    const near = (L, r) => Math.hypot(p.pos.x - L.x, p.pos.z - L.z) < r;
    const hr = hourOf(this);
    if (q.stage('sq_cat1') === 30 && near(COVE.nook, 12)) q.set('sq_cat1', 40, d);
    if (q.stage('sq_cat3') === 10 && !this.raid && between(hr, 21, 3)) this.startRaid();
    if (q.stage('sq_cat3') === 20 && !this.raid && between(hr, 21, 3)) this.startRaid();
    if (this.raid) this.tickRaid();
    if (q.stage('sq_cat5') === 40 && !this.namingNight && between(hr, 19, 23) && near(COVE.fire, 14)) this.startNamingNight();
    if (this.namingNight) {
      this.tickNamingNight();
      if (this.flags.namingNightDone && !near(COVE.fire, 35)) this.endNamingNightCrowd();
    }
  },
  /** Fog off the Gullstack, the Meringue's green lanterns in it, and the bonfire at night. */
  updateCoveEnv(dt, s) {
    const c = this.cell, st = c.state, Q = (q) => this.quests.stage(q);
    const night = smoothstep(0.2, 0.7, s.night);
    const haunted = Q('sq_cat3') >= 10 && !this.flags.fogLifted;
    const want = this.raid ? 1 : haunted ? night : 0;
    this._coveFog = (this._coveFog ?? want) + (want - (this._coveFog ?? want)) * Math.min(1, dt * 0.4);
    const k = this._coveFog;
    // salt air: a little haze over the sea even on clear days
    this.scene.fog.color.lerp(_fogCol.setRGB(0.62, 0.7, 0.74).multiplyScalar(0.3 + (1 - s.night) * 0.7), 0.25);
    if (k > 0.001) {
      this.scene.fog.color.lerp(_fogCol.setRGB(0.3, 0.38, 0.36), k * 0.85);
      this.scene.fog.near *= 1 - k * 0.8;
      this.scene.fog.far = this.scene.fog.far * (1 - k) + 160 * k;
    }
    st?.wall?.color.copy(this.scene.fog.color);
    // the Meringue: only in the fog, only once she's come for the cat
    if (st?.meringue) {
      const show = (Q('sq_cat3') >= 20 || this.raid) && !this.flags.fogLifted ? k : 0;
      st.meringue.visible = show > 0.05;
      // she glows through the fog rather than being swallowed by it
      for (const m of st.meringueMats || []) { if (m.fog) { m.fog = false; m.needsUpdate = true; } m.opacity = (m.userData.baseOpacity ?? 1) * show; }
      for (const l of st.meringueLights || []) l.on = show > 0.3;
      if (st.meringue.visible) st.meringue.position.y = Math.sin(this.clockT * 0.4) * 0.25;
    }
    // the bonfire burns on the beach after dark
    const fire = s.night > 0.4 || !!this.namingNight;
    if (st?.fireLight) st.fireLight.on = fire;
    if (st?.fireEmitter) st.fireEmitter.rate = fire ? (st.fireEmitter.baseRate ??= 18) : 0;
    if (st?.fireMesh) st.fireMesh.visible = fire;
  },
};
