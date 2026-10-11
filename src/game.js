// The game singleton: owns the renderer, the current cell, time, and every system.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { GradeShader, createSunFlare } from './fx/grade.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadPhotoTextures } from './world/photoTextures.js';
import { loadCharacterKit } from './actors/characterKit.js';
import { loadProps, updateScatter } from './world/props.js';
import { itemMesh } from './world/itemMesh.js';
import { Weather } from './world/weather.js';
import { Input } from './core/input.js';
import { Audio } from './audio.js';
import { Sky } from './world/sky.js';
import { Particles } from './fx/particles.js';
import { MagicFX } from './fx/magic.js';
import { Spellbook } from './fx/spellbook.js';
import { buildFirelight, buildCarriedFlame } from './fx/flames.js';
import { Projectiles, isHostile } from './combat.js';
import { Player } from './player.js';
import { ViewModel } from './viewmodel.js';
import { Actor } from './actors/actor.js';
import { pickLeveled, NPCS } from './data/actors.js';
import { ITEMS, Inventory, rollLoot } from './data/items.js';
import { QuestLog, QUESTS } from './data/quests.js';
import { createWorldCell, createInteriorCell, createOblivionCell } from './world/cells.js';
import { LOCATIONS, snowCover } from './world/layout.js';
import { setWindowGlow } from './world/builder.js';
import { canLevelUp, detectChance, SKILL_IDS } from './data/stats.js';
import { UI } from './ui/ui.js';
import { buildWeaponMesh } from './actors/models.js';
import { smoothstep } from './core/noise.js';
import { CarriedTorch, buildLanternMesh } from './fx/torch.js';
import { updateBladeFx, bladeLightColor } from './fx/bladefx.js';
import { updateArmorFx } from './actors/armorSets.js';
import { updateLegendary } from './world/legendary.js';

const _emitPos = new THREE.Vector3();
const _torchTip = new THREE.Vector3();
const _snowFog = new THREE.Color();
const _whiteFlake = new THREE.Color(0.95, 0.97, 1.0);
const _ghostV = new THREE.Vector3(), _ghostQ = new THREE.Quaternion(), _ghostE = new THREE.Euler(), tmpV = new THREE.Vector3();
export const TIMESCALE = 30; // game seconds per real second
const SAVE_PREFIX = 'oblivion_clone_save_';
const LIGHT_POOL = 8;

export const FAST_TRAVEL = {
  sewer: null, // filled from world state
  imperial_city: { x: 2, z: 252, yaw: -Math.PI / 2 },
  chorrol: { x: -380, z: -228, yaw: 0 },
  priory: { x: -250, z: -128, yaw: 0 },
  kvatch: { x: -350, z: 228, yaw: 0.9 },
  gate: { x: -350, z: 228, yaw: 0.9 },
  vilverin: { x: 150, z: -30, yaw: Math.PI },
  bandit_camp: { x: 310, z: -330, yaw: -2.4 },
  wayshrine_akatosh: { x: -104, z: -62, yaw: 0 },
  wayshrine_dibella: { x: -244, z: 148, yaw: 0 },
  roxey_inn: { x: 66, z: 46, yaw: 0 },
  wintersmeet: { x: -182, z: -514, yaw: 0 },
  hobs_wagon: { x: 570, z: 236, yaw: -1.2 },
};

class Crime {
  constructor(game) { this.game = game; this.bounty = 0; this.resisting = false; this.stolen = {}; }
  report(amount, what) {
    this.bounty += amount;
    this.game.ui.notify(`${what} Your bounty is now ${this.bounty} gold.`, 'crime');
    this.game.audio.play('crime');
    // word spreads: nearby guards come running
    const pp = this.game.player.pos;
    for (const a of this.game.cell.actors) {
      if (a.def.ai === 'guard' && !a.dead && !this.resisting && a.pos.distanceTo(pp) < 120) a.state = 'arrest';
    }
  }
  witnessed(radius = 18) {
    const g = this.game;
    for (const a of g.cell.actors) {
      if (a.dead || a.faction !== 'town' || a.def.summon) continue;
      const d = a.pos.distanceTo(g.player.pos);
      if (d > radius) continue;
      if (!a.canSee(g.player)) continue;
      const p = g.player;
      const chance = detectChance(p.ch.skills.sneak, p.ch.attrs.agility, d, p.sneaking, p.moving, p.lightLevel(), p.invisible > 0);
      if (Math.random() < chance) return a;
    }
    return null;
  }
  theft(itemId, count, owner) {
    const witness = this.witnessed();
    const value = (ITEMS[itemId]?.value || 1) * count;
    this.stolen[itemId] = (this.stolen[itemId] || 0) + count;
    if (witness) {
      this.report(Math.max(5, Math.round(value / 2)), `${witness.name} saw you steal!`);
      return true;
    }
    this.game.player.exercise('sneak', 0.5);
    return false;
  }
  assault(npc) {
    npc.hostileToPlayer = true;
    this.report(40, 'Assault!');
  }
  murder(npc) {
    this.report(1000, 'Murder!');
  }
  arrest(guard) {
    const g = this.game;
    if (g.state !== 'playing') return;
    g.ui.openArrest(guard, this.bounty);
  }
  payFine() {
    const p = this.game.player;
    p.removeItem('gold', this.bounty);
    for (const [id, n] of Object.entries(this.stolen)) p.removeItem(id, n);
    this.clear();
    this.game.ui.notify('You paid your fine. Your stolen goods have been confiscated.');
  }
  jail() {
    const g = this.game, p = g.player;
    const days = Math.max(1, Math.ceil(this.bounty / 100));
    const lost = [];
    for (let i = 0; i < days; i++) {
      const s = SKILL_IDS[Math.floor(Math.random() * SKILL_IDS.length)];
      if (p.ch.skills[s] > 5) { p.ch.skills[s] -= 1; lost.push(s); }
    }
    for (const [id, n] of Object.entries(this.stolen)) p.removeItem(id, n);
    this.clear();
    g.time.hours += days * 24;
    p.recalc(true);
    g.enterCell('world', { x: -380, z: -228, yaw: 0 }, `You served ${days} day${days > 1 ? 's' : ''} in the Chorrol jail.${lost.length ? ' Your skills have suffered from disuse.' : ''}`);
  }
  resist() {
    this.resisting = true;
    for (const a of this.game.cell.actors) if (a.def.ai === 'guard') a.setTarget(this.game.player);
    this.game.ui.notify('You resist arrest! The guards will attack on sight.');
  }
  clear() {
    this.bounty = 0;
    this.resisting = false;
    this.stolen = {};
    for (const a of this.game.cell?.actors || []) {
      if (a.faction === 'town') { a.hostileToPlayer = false; if (a.target === this.game.player) a.setTarget(null); }
    }
  }
}

class Interaction {
  constructor(game) { this.game = game; this.target = null; }
  update() {
    const g = this.game, p = g.player;
    const eye = p.eye(), dir = p.lookDir();
    let best = null, bestT = 6;
    const maxFor = (it) => (it.radius > 2.5 ? 6 : 3.6);
    const test = (pos, radius, obj) => {
      const toX = pos.x - eye.x, toY = pos.y - eye.y, toZ = pos.z - eye.z;
      const t = toX * dir.x + toY * dir.y + toZ * dir.z;
      if (t < 0 || t > Math.min(bestT, obj.isActor ? 3.6 : maxFor(obj))) return;
      const cx = eye.x + dir.x * t - pos.x, cy = eye.y + dir.y * t - pos.y, cz = eye.z + dir.z * t - pos.z;
      if (cx * cx + cy * cy + cz * cz < radius * radius) { best = obj; bestT = t; }
    };
    for (const it of g.cell.interactables) {
      if (it.disabled) continue;
      if (Math.abs(it.pos.x - eye.x) > 8 || Math.abs(it.pos.z - eye.z) > 8) continue;
      test(it.pos, it.radius > 2.5 ? it.radius : Math.min(it.radius, 1.2) * 0.85, it);
    }
    const c = new THREE.Vector3();
    for (const a of g.cell.actors) {
      if (a.pos.distanceTo(p.pos) > 5) continue;
      if (a.dead) { if (a.group.visible) test(a.center(c).setY(a.pos.y + 0.3), 0.9, a); continue; }
      if (a.canTalk()) for (const k of [0.4, 0.65, 0.9]) test(c.set(a.pos.x, a.pos.y + a.height * k, a.pos.z), 0.5, a);
      else if (a.def.pettable) test(c.set(a.pos.x, a.pos.y + a.height * 0.6, a.pos.z), 0.6, a);
    }
    this.target = best;
    return best;
  }
  describe(t) {
    if (!t) return null;
    if (t.isActor) {
      if (t.dead) return { verb: 'Search', name: t.name };
      if (t.def.pettable && !t.canTalk()) return { verb: 'Pet', name: t.name };
      return { verb: 'Talk', name: t.name };
    }
    let name = t.name;
    if (t.kind === 'item') { const it = ITEMS[t.item.id]; name = it.name + (t.item.count > 1 ? ` (${t.item.count})` : ''); }
    return { verb: t.verb, name, owned: !!t.owner && !(t.rentable && this.game.rentedUntil > this.game.time.hours), locked: t.lock ? t.lock.level : 0, door: t.kind === 'door' && t.cell };
  }
}

export const game = {
  state: 'boot',
  cells: {},
  cell: null,
  time: { hours: 9 },
  clockT: 0,
  flags: { killed: {} },
  taken: {},
  harvested: {},
  containers: {},
  unlocked: {},
  discovered: {},
  shrines: {},
  doorReturns: {},
  rentedUntil: -1,
  settings: { fov: 70, sensitivity: 1, viewDist: 650, shadows: true, bloom: true, volume: 0.8, music: 0.45, quality: 'high', dynamicRes: true },
  renderScale: 2,

  init(container) {
    this.loadSettings();
    const renderer = (this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }));
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.autoClear = false;
    container.appendChild(renderer.domElement);
    this.canvas = renderer.domElement;

    this.scene = new THREE.Scene();
    this.scene.matrixWorldAutoUpdate = false;
    this.scene.matrixAutoUpdate = false;
    this.scene.fog = new THREE.Fog(0xb0c4d8, 120, 650);
    this.camera = new THREE.PerspectiveCamera(this.settings.fov, window.innerWidth / window.innerHeight, 0.1, 2600);
    this.scene.add(this.camera);

    // lights
    this.sunLight = new THREE.DirectionalLight(0xffffff, 3);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    const sc = this.sunLight.shadow.camera;
    sc.left = -70; sc.right = 70; sc.top = 70; sc.bottom = -70; sc.near = 1; sc.far = 400;
    this.sunLight.shadow.bias = -0.0004;
    this.sunLight.shadow.normalBias = 0.04;
    this.scene.add(this.sunLight, this.sunLight.target);
    this.hemi = new THREE.HemisphereLight(0xaaccff, 0x403020, 1);
    this.scene.add(this.hemi);
    this.lightPool = [];
    for (let i = 0; i < LIGHT_POOL; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 10, 2);
      this.scene.add(l);
      this.lightPool.push(l);
    }
    this.playerLight = new THREE.PointLight(0xfff0d0, 0, 22, 1.5);
    this.scene.add(this.playerLight);
    this.carriedTorch = new CarriedTorch(this.scene);
    // the glow of a conjured elemental blade on the world around you
    this.bladeLight = new THREE.PointLight(0xff8030, 0, 11, 1.8);
    this.scene.add(this.bladeLight);

    this.sky = new Sky();
    this.weather = new Weather(this.scene);
    this.scene.add(this.sky.mesh);
    // image-based lighting: the sky is re-captured into an environment map every few seconds
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.envScene = new THREE.Scene();
    this.envSky = new THREE.Mesh(this.sky.mesh.geometry, this.sky.mesh.material);
    this.envScene.add(this.envSky);
    this.roomEnv = this.pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.envTimer = 0;
    this.particles = new Particles(this.scene);
    this.particles.setViewport(window.innerHeight);
    this.magic = new MagicFX(this);
    this.spellbook = new Spellbook(this);
    this.projectiles = new Projectiles();
    this.projectiles.attach(this.scene);

    // post
    // multisampled HDR target: the renderer's own antialiasing does not apply once post-processing is on
    const rt = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(renderer, rt);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2), 0.42, 0.7, 0.88);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.grade = new ShaderPass(GradeShader);
    this.composer.addPass(this.grade);
    // sun lens flare rides on an invisible anchor placed along the light direction
    this.sunFlare = createSunFlare();
    this.sunAnchor = new THREE.Object3D();
    this.sunAnchor.add(this.sunFlare);
    this.scene.add(this.sunAnchor);
    this.scene.add(this.sunFlare.userData.ghosts);

    this.audio = new Audio();
    this.input = new Input(this.canvas);
    this.input.sensitivity = 0.0022 * this.settings.sensitivity;
    this.crime = new Crime(this);
    this.quests = new QuestLog();
    this.quests.listeners.push((q, st) => this.onQuestStage(q, st));
    this.interaction = new Interaction(this);
    this.player = new Player();
    this.viewmodel = new ViewModel();
    this.ui = new UI(this);

    window.addEventListener('resize', () => this.onResize());
    this.input.onKey((e) => this.ui.onKey(e));
    this.input.onLockChange = (locked) => {
      if (!locked && this.state === 'playing' && !this.ui.suppressPause) this.ui.openPause();
      this.ui.suppressPause = false;
    };
    this.lastFrame = performance.now();
    this.applySettings();
    this.fpsAcc = 0; this.fpsN = 0; this.fps = 60;
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
    this.ui.showTitle();
    loadCharacterKit();
    loadProps();
    loadPhotoTextures(); // start fetching while the player reads the title screen
  },

  loadSettings() {
    try { Object.assign(this.settings, JSON.parse(localStorage.getItem('oblivion_clone_settings') || '{}')); } catch { /* defaults */ }
  },
  saveSettings() {
    try { localStorage.setItem('oblivion_clone_settings', JSON.stringify(this.settings)); } catch { /* ignore */ }
    this.applySettings();
  },
  applySettings() {
    const s = this.settings;
    this.camera.fov = s.fov;
    this.camera.updateProjectionMatrix();
    this.input.sensitivity = 0.0022 * s.sensitivity;
    this.audio.setVolumes({ master: s.volume, music: s.music });
    // quality presets: shadow resolution, reflections, grass density, bloom, resolution ceiling
    const Q = {
      low: { shadow: 1024, shadows: false, reflections: false, grass: 0.35, bloom: false, maxScale: 0.85, view: 450, msaa: 0 },
      medium: { shadow: 1024, shadows: true, reflections: false, grass: 0.6, bloom: true, maxScale: 1.25, view: 550, msaa: 2 },
      high: { shadow: 2048, shadows: true, reflections: true, grass: 1.0, bloom: true, maxScale: 1.6, view: 650, msaa: 2 },
      ultra: { shadow: 4096, shadows: true, reflections: true, grass: 1.3, bloom: true, maxScale: 2.0, view: 850, msaa: 4 },
    }[s.quality] || {};
    this.quality = Q;
    const shadowsOn = s.shadows && Q.shadows !== false;
    this.renderer.shadowMap.enabled = shadowsOn;
    this.sunLight.castShadow = shadowsOn;
    if (this.sunLight.shadow.mapSize.x !== Q.shadow) {
      this.sunLight.shadow.mapSize.set(Q.shadow, Q.shadow);
      this.sunLight.shadow.map?.dispose();
      this.sunLight.shadow.map = null;
    }
    this.bloom.enabled = s.bloom && Q.bloom !== false;
    // multisampling on the post-processing targets (the renderer's own antialias does not reach them)
    for (const t of [this.composer.renderTarget1, this.composer.renderTarget2]) {
      if (t.samples !== (Q.msaa ?? 2)) { t.samples = Q.msaa ?? 2; t.dispose(); }
    }
    this.reflectionsOn = Q.reflections !== false;
    this.grassDensity = Q.grass ?? 1;
    this.maxRenderScale = Math.min(Q.maxScale ?? 1.6, window.devicePixelRatio || 1);
    // dynamic resolution never drops far enough to smear the image
    this.minRenderScale = Math.min(this.maxRenderScale, Math.max(0.7, this.maxRenderScale * 0.72));
    if (!s.dynamicRes) this.setRenderScale(this.maxRenderScale);
    else this.setRenderScale(Math.min(this.renderScale, this.maxRenderScale));
  },

  setRenderScale(scale) {
    scale = Math.max(this.minRenderScale ?? 0.7, Math.min(this.maxRenderScale ?? 1, scale));
    if (Math.abs(scale - (this._appliedScale ?? 0)) < 0.01) return;
    this._appliedScale = scale;
    this.renderScale = scale;
    this.renderer.setPixelRatio(scale);
    this.composer.setPixelRatio(scale);
    this.composer.setSize(window.innerWidth, window.innerHeight);
    this.bloom.resolution.set(window.innerWidth / 2, window.innerHeight / 2);
    this.particles?.setViewport(window.innerHeight * scale);
    this.updateSharpen();
  },

  /** Contrast-adaptive sharpening: a light touch at native resolution, more when upscaling. */
  updateSharpen() {
    const u = this.grade?.uniforms;
    if (!u) return;
    const w = Math.max(1, Math.round(window.innerWidth * this.renderScale)), h = Math.max(1, Math.round(window.innerHeight * this.renderScale));
    u.uTexel.value.set(1 / w, 1 / h);
    const upscale = Math.max(0, Math.min(1, 1 - this.renderScale / (window.devicePixelRatio || 1)));
    u.uSharpen.value = 0.32 + upscale * 0.45;
  },

  /** Keep the frame rate near 60 by adjusting render resolution. */
  adaptResolution(dt) {
    if (!this.settings.dynamicRes || this.state !== 'playing') return;
    this._frameAvg = (this._frameAvg ?? 16) * 0.95 + dt * 1000 * 0.05;
    this._resCooldown = (this._resCooldown ?? 0) - dt;
    if (this._resCooldown > 0) return;
    if (this._frameAvg > 19.5 && this.renderScale > (this.minRenderScale ?? 0.7)) { this.setRenderScale(this.renderScale - 0.06); this._resCooldown = 0.8; }
    else if (this._frameAvg < 13 && this.renderScale < (this.maxRenderScale ?? 1)) { this.setRenderScale(this.renderScale + 0.05); this._resCooldown = 1.5; }
  },

  onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.bloom.resolution.set(w / 2, h / 2);
    this.particles.setViewport(h * this.renderScale);
    this.updateSharpen();
  },

  // ----------------------------------------------------------------- world lifecycle
  async buildWorld(progress) {
    if (this.cells.world) return this.cells.world;
    progress?.('Shaping the land...');
    await Promise.all([loadPhotoTextures(), loadCharacterKit(), loadProps()]);
    await nextFrame();
    const w = createWorldCell(this);
    this.attachFirelight(w);
    this.freezeStatic(w);
    this.cells.world = w;
    FAST_TRAVEL.sewer = { x: w.state.sewerSpawn.x, z: w.state.sewerSpawn.z, yaw: w.state.sewerSpawn.yaw };
    this.applyWorldFlags();
    return w;
  },

  /**
   * World geometry never moves, so compute its matrices once instead of every frame (thousands of
   * objects, twice a frame with the lake reflection). Spinning crystals keep updating.
   */
  attachFirelight(cell) {
    cell.firelight = buildFirelight(cell);
    if (cell.firelight) cell.group.add(cell.firelight.group);
  },

  freezeStatic(cell) {
    const dyn = new Set(cell.spin);
    cell.group.traverse((o) => {
      o.updateMatrix();
      o.matrixAutoUpdate = dyn.has(o);
    });
    cell.group.updateMatrixWorld(true);
  },

  getCell(id) {
    if (this.cells[id]) return this.cells[id];
    let c;
    if (id === 'world') throw new Error('world not built');
    if (id === 'oblivion') c = createOblivionCell(this);
    else c = createInteriorCell(this, id);
    this.attachFirelight(c);
    this.freezeStatic(c);
    this.cells[id] = c;
    this.applyPersistentState(c);
    this.applyGloamState(c);
    this.applyRimeState(c);
    return c;
  },

  /** Switch the active cell. at: {x,z,yaw} or null for the cell default arrival. */
  async enterCell(id, at = null, message = null) {
    const prevState = this.state;
    this.state = 'loading';
    this.ui.showLoading(id, message);
    await nextFrame();
    await nextFrame();
    if (this.corwynScene) this.abortCorwynScene();
    if (this.cell) {
      this.scene.remove(this.cell.group);
      for (const a of this.cell.actors) this.scene.remove(a.group);
      if (this.player.summon && !this.player.summon.dead) {
        // summons follow through doors
        const s = this.player.summon;
        this.cell.actors = this.cell.actors.filter((a) => a !== s);
        this._carrySummon = s;
      }
      // so do companions
      this._carryFollowers = this.cell.actors.filter((a) => a.following && !a.dead);
      this.cell.actors = this.cell.actors.filter((a) => !this._carryFollowers.includes(a));
    }
    this.projectiles.clear(this.scene);
    this.particles.clear();
    this.magic.clear();
    this.spellbook.clear();
    await Promise.all([loadPhotoTextures(), loadCharacterKit(), loadProps()]);
    const cell = id === 'world' ? await this.buildWorld() : this.getCell(id);
    this.cell = cell;
    this.scene.add(cell.group);
    for (const a of cell.actors) this.scene.add(a.group);
    this.player.attachModel(this.scene);

    // place player
    let p = at;
    if (!p) {
      if (id === 'world') p = this.doorReturns._last || FAST_TRAVEL.sewer;
      else if (id === 'oblivion') p = this.oblivionReturn || cell.arrival;
      else p = cell.meta.doorArrival || cell.meta.arrival;
    }
    const y = cell.collision.groundHeight(p.x, p.z, 1000);
    this.player.pos.set(p.x, y + 0.05, p.z);
    this.player.vel.set(0, 0, 0);
    this.player.fallStartY = null;
    if (p.yaw !== undefined && p.yaw !== null) this.player.yaw = p.yaw;
    this.player.pitch = 0;
    this.player.camY = undefined;
    if (this._carrySummon) {
      const s = this._carrySummon;
      s.pos.set(p.x + 1, y, p.z + 1);
      cell.actors.push(s);
      this.scene.add(s.group);
      this._carrySummon = null;
    }
    const followers = this._carryFollowers || [];
    this._carryFollowers = null;
    // a companion from a loaded save is re-created next to the player
    for (const [flag, fid] of [['corvinFollowing', 'corvin'], ['martinFollowing', 'martin'], ['tamFollowing', 'inn_patron']]) {
      if (!this.flags[flag] || followers.some((a) => a.uid === fid) || cell.actors.some((a) => a.uid === fid)) continue;
      const npc = NPCS.find((n) => n.id === fid);
      const c = new Actor(npc, p.x - 1, y, p.z + 1, { uid: fid });
      c.def.dialogue = npc.dialogue;
      c.def.stationary = false;
      c.following = true;
      followers.push(c);
    }
    // your dog comes with you everywhere (and is rebuilt from a save)
    if (this.flags.dogFollowing && !followers.some((a) => a.uid === 'dog') && !cell.actors.some((a) => a.uid === 'dog')) followers.push(this.makeDog(p.x - 1.5, y, p.z + 1.2));
    if (this.flags.dogStaying && this.flags.dogStayCell === id && this.flags.dogStayPos && !cell.actors.some((a) => a.uid === 'dog')) {
      const [sx, sy, sz] = this.flags.dogStayPos;
      const d = this.makeDog(sx, sy, sz);
      d.home.set(sx, sy, sz);
      this.addActor(d, cell);
    }
    this.dawnExposedCell = null;
    this.silentTheft = false;
    this.sermon = null;
    this.bardShow = null;
    this.spellbook.placeMarkRune();
    if (id === 'kvatch_chapel' && this.quests.stage('mq_heir') === 10) this.quests.set('mq_heir', 20, this.day());
    if (id === 'fort_sutch') {
      const d = this.quests.stage('mq_dawn');
      if (d >= 10 && d < 40) this.quests.set('mq_dawn', 40, this.day());
      if (d >= 10 && d < 100) this.quests.set('mq_dawn', 100, this.day());
      if (this.quests.stage('mq_shrine') < 10) this.quests.set('mq_shrine', 10, this.day());
    }
    if (id === 'world' && this.quests.stage('mq_shrine') === 30 && p.x !== undefined) this.quests.set('mq_shrine', 40, this.day());
    followers.forEach((f, i) => {
      f.pos.set(p.x - 1 - i * 0.8, y, p.z + 1);
      if (!cell.actors.includes(f)) cell.actors.push(f);
      this.scene.add(f.group);
    });
    if (id === 'nenalatha' && this.quests.stage('sq_map') >= 50 && this.quests.stage('sq_map') < 60) this.quests.set('sq_map', 60, this.day());
    if (id === 'gloam_barrow' && this.quests.stage('sq_gloam') === 10) this.quests.set('sq_gloam', 20, this.day());
    // after the reunion Tam is back in his chair at the Grey Mare
    if (id === 'inn' && this.flags.tamHome && !cell.actors.some((a) => a.uid === 'inn_patron') && cell.meta.npcs['2']) {
      const sp = cell.meta.npcs['2'];
      this.spawnNpc(cell, NPCS.find((n) => n.id === 'inn_patron'), sp.x, 0, sp.z, Math.PI);
    }
    if (id === 'world') { this.applyCorwynWorld(); this.applyWhiteHareWorld(); this.applyRabbitWorld(); }
    if (id === 'rime_spire' && this.quests.stage('sq_hare4') >= 10 && this.quests.stage('sq_hare4') < 30) this.quests.set('sq_hare4', 30, this.day());
    if (id === 'snow_hare' && this.flags.cassiusHome && !cell.actors.some((a) => a.uid === 'cassius_home') && cell.meta.npcs['3']) {
      const sp = cell.meta.npcs['3'];
      this.spawnNpc(cell, NPCS.find((n) => n.id === 'cassius_home'), sp.x, 0, sp.z, Math.PI);
    }
    // a scene abandoned halfway (you walked off, or loaded) can start again later
    if (this.lightwatch && id !== 'world') this.lightwatch = null;

    // environment
    this.sky.mesh.visible = cell.hasSky;
    this.sunLight.visible = true;
    if (cell.interior) {
      this.scene.fog.color.copy(cell.fog.color);
      this.scene.fog.near = cell.fog.near;
      this.scene.fog.far = cell.fog.far;
      this.hemi.color.copy(cell.ambient.sky);
      this.hemi.groundColor.copy(cell.ambient.ground);
      this.hemi.intensity = cell.ambient.intensity;
      this.sunLight.intensity = 0;
      this.scene.background = cell.fog.color;
    } else {
      this.scene.background = null;
    }
    this.audio.setMusic(cell.music);
    this.setLightPoolSize(cell.interior ? 8 : 4);
    this.updateLights(0);
    await nextFrame();
    this.state = prevState === 'loading' || prevState === 'boot' || prevState === 'chargen' ? 'playing' : prevState;
    if (this.state !== 'playing') this.state = 'playing';
    this.ui.hideLoading();
    if (message) this.ui.notify(message);
    if (id !== 'oblivion' && this.cells.oblivion && this.flags.gateClosed) {
      delete this.cells.oblivion;
    }
    this.autosave();
  },

  applyWorldFlags() {
    const w = this.cells.world;
    if (!w) return;
    const s = w.state;
    const closed = !!this.flags.gateClosed;
    s.gate.group.visible = !closed;
    if (s.gateInteract) s.gateInteract.disabled = closed;
    if (s.gateLight) s.gateLight.on = !closed;
    if (s.gateEmitter) s.gateEmitter.rate = closed ? 0 : 14;
    if (closed && !s.ruinBuilt) {
      s.ruinBuilt = true;
      // scorched rubble where the gate stood
      const G = LOCATIONS.gate;
      const h = w.terrain.heightAt(G.x, G.z);
      for (let i = 0; i < 9; i++) {
        const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6 + Math.random() * 1.2, 0), new THREE.MeshStandardMaterial({ color: 0x2a1410, roughness: 1 }));
        r.position.set(G.x + (Math.random() - 0.5) * 16, h, G.z + (Math.random() - 0.5) * 16);
        r.rotation.set(Math.random() * 3, Math.random() * 3, 0);
        w.group.add(r);
      }
    }
  },

  /** Apply taken items, unlocked locks and container contents to a cell's interactables. */
  applyPersistentState(cell) {
    for (const it of cell.interactables) {
      if (it.lockOrig === undefined) it.lockOrig = it.lock || null;
      if (it.id && this.unlocked[it.id]) it.lock = null; else it.lock = it.lockOrig;
      if (it.kind === 'gatebars') {
        const open = !it.lock;
        if (it.mesh) it.mesh.visible = !open;
        if (it.collider) it.collider.disabled = open;
        it.disabled = open;
      }
      if (it.kind === 'item' && it.id) {
        const gone = !!this.taken[it.id];
        it.disabled = gone;
        if (it.mesh) it.mesh.visible = !gone;
      }
      if (it.requireFlag) {
        const on = !!this.flags[it.requireFlag];
        it.disabled = !on;
        if (it.mesh) it.mesh.visible = on;
        if (it.light) it.light.on = on;
      }
      if (it.requireNoFlag) it.disabled = !!this.flags[it.requireNoFlag];
      if (it.openFlag) {
        const open = !!this.flags[it.openFlag];
        if (it.mesh) it.mesh.visible = !open;
        if (it.collider) it.collider.disabled = open;
        it.disabled = open;
      }
      if (it.kind === 'harvest') {
        const h = this.harvested[it.id];
        const gone = h !== undefined && this.time.hours - h < 24 * (it.respawnDays || 3);
        it.disabled = gone;
        if (it.mesh) it.mesh.visible = !gone;
      }
      if (it.kind === 'container' && it.id) it.inventory = this.containers[it.id] ? Inventory.fromJSON(this.containers[it.id]) : null;
      if (it.legend) {
        const gone = !!this.taken[it.id];
        it.disabled = gone;
        if (it.mesh) it.mesh.visible = !gone;
        for (const o of it.extra || []) o.visible = !gone;
        if (it.light) it.light.on = !gone;
      }
    }
  },

  // ----------------------------------------------------------------- spawning
  addActor(a, cell = this.cell) {
    cell.actors.push(a);
    if (cell === this.cell) this.scene.add(a.group);
    return a;
  },
  removeActor(a) {
    for (const c of Object.values(this.cells)) {
      const i = c.actors.indexOf(a);
      if (i >= 0) c.actors.splice(i, 1);
    }
    this.scene.remove(a.group);
  },
  spawnNpc(cell, npc, x, y, z, yaw) {
    if (this.flags.killed?.[npc.id]) return null;
    const a = new Actor(npc, x, y, z, { uid: npc.id, yaw });
    if (npc.merchant) a.merchant = npc.merchant;
    a.def.dialogue = npc.dialogue || (a.def.ai === 'guard' ? 'guard' : 'citizen');
    cell.actors.push(a);
    if (cell === this.cell) this.scene.add(a.group);
    return a;
  },
  spawnCreature(cell, tpl, x, y, z, opts = {}) {
    const g = cell.collision.groundHeight(x, z, y + 2);
    const a = new Actor(tpl, x, g, z, opts);
    cell.actors.push(a);
    if (cell === this.cell) this.scene.add(a.group);
    return a;
  },
  spawnLeveled(cell, list, x, y, z) {
    return this.spawnCreature(cell, pickLeveled(list, this.player.ch.level), x, y, z);
  },
  placeItem(b, id, x, y, z, cid, o = {}) {
    const mesh = itemMesh(id);
    mesh.position.set(x, y, z);
    mesh.rotation.y = o.rot ?? Math.random() * Math.PI * 2;
    b.add(mesh);
    return b.interact({ kind: 'item', id: cid, item: { id, count: 1 }, owner: o.owner || null, pos: new THREE.Vector3(x, y + 0.1, z), radius: o.radius ?? 0.5, verb: 'Take', mesh });
  },

  // ----------------------------------------------------------------- items
  giveItem(id, n = 1, silent = false) {
    this.player.inventory.add(id, n);
    if (!silent) this.ui.notify(id === 'gold' ? `${n} gold added.` : `${ITEMS[id].name}${n > 1 ? ` (${n})` : ''} added.`);
    this.audio.play(id === 'gold' ? 'gold' : 'pickup', 0.7);
    this.onItemGained(id);
  },
  takeItem(id, n = 1) {
    const r = this.player.removeItem(id, n);
    if (r) this.ui.notify(`${ITEMS[id].name}${r > 1 ? ` (${r})` : ''} removed.`);
    return r;
  },
  onItemGained(id) {
    if (id === 'brugo_head' && this.quests.stage('ms_bounty') < 20) this.quests.set('ms_bounty', 20, this.day());
    if (id === 'jemane_blade' && this.quests.stage('ms_heirloom') < 20) this.quests.set('ms_heirloom', 20, this.day());
    const map = this.quests.stage('sq_map');
    if (id === 'corvin_waymark' && map >= 10 && map < 20) this.quests.set('sq_map', 20, this.day());
    if (id === 'tuning_fork' && map >= 10 && map < 30) this.quests.set('sq_map', 30, this.day());
    if (id === 'commentaries_1' && this.quests.stage('mq_dawn') >= 10 && this.quests.stage('mq_dawn') < 20) this.quests.set('mq_dawn', 20, this.day());
    if (id === 'mysterium_xarxes') this.onXarxesTaken();
    if (id === 'lady_plucksworth' && this.quests.stage('sq_bard') === 10) this.quests.set('sq_bard', 20, this.day());
    if (id.startsWith('libram_page')) this.countLibramPages();
    if ((id === 'hare_fur' || id === 'trap_tag') && this.quests.stage('sq_hare1') >= 20 && this.quests.stage('sq_hare1') < 40 && this.player.inventory.has('hare_fur') && this.player.inventory.has('trap_tag')) {
      if (this.quests.stage('sq_hare1') < 30) this.quests.set('sq_hare1', 30, this.day());
      this.quests.set('sq_hare1', 40, this.day());
    }
    if (id === 'varn_ledger') { this.flags.varnTold = true; if (this.quests.stage('sq_hare2') >= 10 && this.quests.stage('sq_hare2') < 30) this.quests.set('sq_hare2', 30, this.day()); }
    if (['fir_heartwood', 'glimmerfin', 'kynareth_loaf'].includes(id)) this.whGiftStage();
    if (id === 'starflower') this.countStarflowers();
    if (id === 'tams_slate' && this.quests.stage('sq_ashes') >= 10 && this.quests.stage('sq_ashes') < 20) this.quests.set('sq_ashes', 20, this.day());
    if (id === 'maela_lantern' && this.quests.stage('sq_gloam') >= 10 && this.quests.stage('sq_gloam') < 30) this.quests.set('sq_gloam', 30, this.day());
  },
  /** Ensure a container has rolled loot. */
  containerInventory(it) {
    if (!it.inventory) {
      it.inventory = new Inventory();
      if (it.loot) for (const [id, n] of rollLoot(it.loot, Math.random, this.player.ch.level)) it.inventory.add(id, n);
      for (const spec of it.items || []) it.inventory.add(spec, 1);
      if (it.id) this.containers[it.id] = it.inventory.toJSON();
    }
    return it.inventory;
  },
  persistContainer(it) {
    if (it.id && it.inventory) this.containers[it.id] = it.inventory.toJSON();
  },

  day() { return Math.floor(this.time.hours / 24) + 1; },

  // ----------------------------------------------------------------- events
  playAt(name, pos, vol = 1) {
    if (!this.player) return;
    const d = pos.distanceTo(this.player.pos);
    if (d > 45) return;
    this.audio.play(name, vol * Math.min(1, 6 / Math.max(1, d)) );
  },
  onPlayerAttacked() {
    this.lastCombat = this.clockT;
  },
  onActorDeath(actor, killer) {
    if (actor.unique || actor.def.unique) this.flags.killed[actor.def.tplId] = true;
    if (actor.def.id) this.flags.killed[actor.def.id] = true;
    if (killer?.isPlayer && actor.faction === 'town' && !actor.def.summon) {
      if (this.crime.witnessed(30) || actor.def.ai === 'guard') this.crime.murder(actor);
    }
    if (killer?.isPlayer || killer?.faction === 'ally') this.ui.notify(`${actor.name} has been slain.`);
    if (actor.uid === 'aurelian') this.flags.recruiterGone = true;
    if (actor.def.tplId === 'wisp') {
      // the wisp bursts, and the page it was playing with flutters down
      const at = actor.pos.clone();
      this.audio.play('chime', 0.9);
      this.particles.burst(at.clone().setY(at.y + 1.3), 'magic', 50, 0x80e0ff);
      this.removeActor(actor);
      if (!this.taken.libram_page_wisp_pickup && !this.player.inventory.has('libram_page_wisp')) {
        const c = this.cell;
        const b = { add: (o) => c.group.add(o), interact: (d) => { c.interactables.push(d); return d; } };
        const y = c.collision.groundHeight(at.x, at.z, at.y + 2);
        const it = this.placeItem(b, 'libram_page_wisp', at.x, y + 0.05, at.z, 'libram_page_wisp_pickup');
        const m = it.mesh, top = y + 1.6;
        this.magic.add(null, 1.6, (e, dt, k) => { m.position.y = top + (y + 0.05 - top) * k; m.rotation.y += dt * 3; m.position.x = at.x + Math.sin(e.t * 5) * 0.3 * (1 - k); });
      }
      this.ui.notify('The wisp bursts into harmless sparkles. A page flutters to the ground.');
      return;
    }
    if (actor.def.tplId === 'ilvaine') {
      if (this.quests.stage('sq_gloam') >= 10 && this.quests.stage('sq_gloam') < 25) this.quests.set('sq_gloam', 25, this.day());
      if (this.cell.id === 'gloam_barrow') this.freeBarrowSouls(); else this.flags.lamplighterDead = true;
    }
    if (actor.def.tplId === 'ashen_dead') this.particles.burst(actor.center(), 'smoke', 12);
    if (actor.uid === 'snikkit' && !this.flags.rabbitsFreed && this.quests.stage('sq_bunnies') < 60) this.quests.set('sq_bunnies', 60, this.day());
    if (actor.uid === 'gorbag') {
      this.flags.frostfangHostile = true;
      const st = this.quests.stage('sq_bunnies');
      if (st >= 20 && st < 50 && !this.flags.rabbitsFreed && this.flags.killed?.snikkit !== true) this.quests.set('sq_bunnies', 55, this.day());
    }
    if (actor.uid === 'cassius') {
      if (this.quests.stage('sq_hare4') >= 10 && this.quests.stage('sq_hare4') < 60) this.quests.set('sq_hare4', 60, this.day());
      const cg = this.cell.meta?.cage;
      if (cg) { cg.frost.material.opacity = 0.25; cg.frost.material.emissiveIntensity = 0.15; this.particles.burst(new THREE.Vector3(cg.x, 1.2, cg.z), 'magic', 30, 0xbfe0ff); }
    }
    if (actor.def.tplId === 'archivist' && this.quests.stage('sq_map') < 75) {
      if (this.quests.stage('sq_map') < 70) this.quests.set('sq_map', 70, this.day());
      this.quests.set('sq_map', 75, this.day());
      this.ui.notify('The light in the hall steadies. Something hums at its heart.');
    }
  },

  // ----------------------------------------------------------------- main quest, act two
  /** Is `p` (the player) passing as one of the faithful among `cultist`'s kind? */
  disguisedAmong(cultist, p) {
    if (!cultist?.def?.cultist || !p?.isPlayer) return false;
    if (this.player.equipped.chest !== 'mythic_dawn_robe') return false;
    if (this.dawnExposedCell === this.cell?.id) return false;
    if (this.flags.xarxesStolen && !this.silentTheft) return false;
    return true;
  },
  exposeDisguise(by) {
    if (this.dawnExposedCell === this.cell.id) return;
    this.dawnExposedCell = this.cell.id;
    this.silentTheft = false;
    if (this.player.equipped.chest === 'mythic_dawn_robe') this.ui.notify('Your disguise has been seen through!');
    for (const a of this.cell.actors) {
      if (!a.def.cultist || a.dead) continue;
      if (a.pos.distanceTo(this.player.pos) < 45) a.setTarget(this.player);
    }
    const ruma = this.cell.actors.find((a) => a.uid === 'ruma_camoran' && !a.dead);
    if (ruma && !this.flags.rumaSummoned) {
      this.flags.rumaSummoned = true;
      ruma.say('My father has already carried the Amulet into Paradise! Lord Dagon, send me your servants!', true);
      for (let i = 0; i < 2; i++) {
        const d = this.spawnCreature(this.cell, 'dremora', ruma.pos.x + (i ? 2.5 : -2.5), 0, ruma.pos.z + 1.5);
        d.setTarget(this.player);
        this.particles.burst(d.pos, 'magic', 30, 0xff4010);
      }
      this.audio.play('portal', 0.5);
    }
  },
  onXarxesTaken() {
    this.flags.xarxesStolen = true;
    if (this.quests.stage('mq_shrine') < 20) this.quests.set('mq_shrine', 20, this.day());
    this.quests.set('mq_shrine', 30, this.day());
    if (this.cell.id !== 'fort_sutch') return;
    // a thief who is sneaking, unseen, gets away with it — for now
    const p = this.player;
    const to = new THREE.Vector3();
    const seen = this.cell.actors.some((a) => {
      if (!a.def.cultist || a.dead) return false;
      const d = a.pos.distanceTo(p.pos);
      if (d > 12) return false;
      to.copy(p.pos).sub(a.pos).setY(0).normalize();
      const facing = a.forward(new THREE.Vector3()).dot(to) > 0.25;
      return (facing || d < 2.5) && a.canSee(p);
    });
    if (p.sneaking && !seen && this.disguisedAmongAny()) {
      this.silentTheft = true;
      this.ui.notify('No one saw you take it. Walk, don\'t run.');
    } else this.exposeDisguise();
  },
  disguisedAmongAny() {
    return this.player.equipped.chest === 'mythic_dawn_robe' && this.dawnExposedCell !== this.cell.id;
  },
  /** NPCs who only appear at certain hours or quest stages. */
  npcActive(a) {
    const d = a.def;
    if (d.activeHours) {
      const [h0, h1] = d.activeHours;
      const hr = ((this.time.hours % 24) + 24) % 24;
      const inside = h0 <= h1 ? hr >= h0 && hr < h1 : hr >= h0 || hr < h1;
      if (!inside && !a.target) return false;
    }
    if (d.activeQuest) {
      const [q, lo, hi] = d.activeQuest;
      const st = this.quests.stage(q);
      if ((st < lo || st > hi) && !a.target) return false;
    }
    return true;
  },
  /** Scripted beats of the main quest that depend on where the player is. Runs a few times a second. */
  updateQuestTriggers() {
    const q = this.quests, p = this.player, c = this.cell;
    if (!c || this.state !== 'playing') return;
    // the attack on Weynon Priory begins as Martin arrives
    if (c.id === 'world' && q.stage('mq_heir') === 40) {
      const P0 = LOCATIONS.priory;
      if (Math.hypot(p.pos.x - P0.x, p.pos.z - P0.z) < 95) this.startPrioryAttack();
    }
    if (c.id === 'world' && q.stage('mq_priory') === 10) {
      const alive = c.actors.filter((a) => a.prioryAssassin && !a.dead);
      if (!alive.length) {
        q.set('mq_priory', 20, this.day());
        this.ui.notify('The last of the assassins falls. Jauffre — the Amulet!');
      }
    }
    // the chapel is cleared
    if (c.id === 'kvatch_chapel' && q.stage('mq_heir') === 20) {
      if (!c.actors.some((a) => a.faction === 'monster' && !a.dead)) {
        q.set('mq_heir', 30, this.day());
        c.actors.find((a) => a.uid === 'martin')?.say('Is it... is it over? Who are you?', true);
      }
    }
    if (this.bardShow && c.id === 'inn') this.tickBardPerformance();
    this.tickCorwyn();
    this.tickWhiteHare();
    this.tickDog();
    this.tickBunnies();
    // Henrietta glows, and can be caught if you get right up close
    if (c.id === 'world' && this.flags.wizardQuest && !this.flags.henCaught) {
      const hen = c.actors.find((a) => a.uid === 'henrietta' && !a.dead);
      if (!hen) this.spawnHenrietta();
      else {
        this.particles.burst(hen.pos.clone().setY(hen.pos.y + 0.6), 'sparkle', 1);
        if (hen.pos.distanceTo(p.pos) < 1.5) {
          this.flags.henCaught = true;
          this.giveItem('libram_page_hen', 1);
          this.audio.play('chime', 0.8);
          this.particles.burst(hen.pos.clone().setY(hen.pos.y + 0.5), 'magic', 30, 0xd8c8ff);
          this.ui.notify('You scoop up Henrietta. She coughs up the rest of a glowing page, looks extremely pleased with herself, and stops glowing.');
          hen.name = 'Henrietta';
          hen.def = { ...hen.def, name: 'Henrietta' };
        }
      }
    }
    // Ruma's sermon, if the player arrives disguised
    if (c.id === 'fort_sutch') {
      const ruma = c.actors.find((a) => a.uid === 'ruma_camoran' && !a.dead);
      if (ruma && !this.sermon && !this.flags.sermonDone && this.disguisedAmong(ruma, p) && ruma.pos.distanceTo(p.pos) < 11) this.startSermon(ruma);
      if (this.sermon) this.tickSermon();
      if (q.stage('mq_shrine') === 10 && ruma && ruma.pos.distanceTo(p.pos) < 9 && !this.disguisedAmong(ruma, p)) q.set('mq_shrine', 20, this.day());
    }
    // cultists greet a robed visitor
    if (c.id === 'fort_sutch' || c.id === 'world') {
      for (const a of c.actors) {
        if (!a.def.cultist || a.dead || a.target || a.uid === 'ruma_camoran') continue;
        if (a.pos.distanceTo(p.pos) < 4 && this.disguisedAmong(a, p) && Math.random() < 0.02) a.say(['Dawn\'s beauty, brother.', 'Dawn\'s beauty, sister.', 'Have you heard? The Master has the chain.', 'Soon. So very soon.', 'Pray with us at the altar, initiate.'][Math.floor(Math.random() * 5)]);
      }
    }
  },
  startPrioryAttack() {
    const q = this.quests, c = this.cell;
    q.set('mq_heir', 100, this.day());
    q.set('mq_priory', 10, this.day());
    const P0 = LOCATIONS.priory;
    const spots = [[-6, 8], [8, 6], [14, -4], [-12, -2]];
    spots.forEach(([dx, dz], i) => {
      const a = this.spawnCreature(c, 'dawn_assassin', P0.x + dx, 0, P0.z + dz);
      a.prioryAssassin = true;
      if (i === 0) a.inventory.add('dawn_orders', 1);
      const monk = c.actors.find((x) => x.uid === 'maborel');
      a.setTarget(i % 2 && monk ? monk : this.player);
    });
    // the chapel burns
    const h = c.collision.groundHeight(P0.x + 18, P0.z - 6, 500);
    c.emitters.push({ kind: 'flame', pos: new THREE.Vector3(P0.x + 18, h + 1, P0.z - 2), rate: 18, acc: 0, color: 0xff6010, range: 160 });
    c.emitters.push({ kind: 'smoke', pos: new THREE.Vector3(P0.x + 18, h + 6, P0.z - 6), rate: 4, acc: 0, range: 300 });
    c.lights.push({ color: new THREE.Color(0xff6020), intensity: 26, distance: 22, pos: new THREE.Vector3(P0.x + 18, h + 2, P0.z - 2), flicker: true, night: false, on: true });
    c.actors.find((a) => a.uid === 'martin')?.say('Gods — the priory is burning! Those are Mythic Dawn robes!', true);
    this.audio.play('crime', 0.5);
  },
  startSermon(ruma) {
    this.sermon = { ruma, t: 0, i: -1 };
    ruma.anim.idleAnim = 'Idle_Talking_Loop';
    ruma.yaw = Math.atan2(this.player.pos.x - ruma.pos.x, this.player.pos.z - ruma.pos.z);
  },
  tickSermon() {
    const S = this.sermon;
    const lines = [
      'Brothers. Sisters. Be still, and hear me, for I speak with the voice of my father, Mankar Camoran.',
      'The Septim line is broken. Uriel lies cold beneath his city, and his sons rot beside him.',
      'And the Amulet of Kings — the chain that bound Lord Dagon from this world — has been carried into Paradise by my father\'s own hand.',
      'Soon the Dragonfires will gutter and die. The Gates will open not at Kvatch alone, but at every city in Tamriel.',
      'Do not mourn the world that burns. Mourn only that you were born into it. In Paradise, the faithful are made new.',
      this.flags.dawnInitiate ? 'Go now, and pray. Read the Master\'s words. The Dawn is coming.' : '...But one among us wears Aurelian\'s robe — and Aurelian\'s blood is still on the hem. SEIZE THEM!',
    ];
    S.t += 0.25;
    const idx = Math.floor(S.t / 6.5);
    if (idx !== S.i && idx < lines.length) {
      S.i = idx;
      S.ruma.say(lines[idx], true);
    }
    if (S.t > lines.length * 6.5 || S.ruma.dead || S.ruma.target) {
      this.sermon = null;
      this.flags.sermonDone = true;
      S.ruma.anim.idleAnim = null;
      if (this.quests.stage('mq_shrine') < 20) this.quests.set('mq_shrine', 20, this.day());
      if (!this.flags.dawnInitiate && !S.ruma.dead) this.exposeDisguise();
      else if (!S.ruma.dead) {
        // the faithful file out to their beds; Ruma kneels before the statue
        const beds = this.cell.interactables.filter((i) => i.kind === 'bed');
        let k = 0;
        for (const a of this.cell.actors) {
          if (!a.def.cultist || a.dead || a === S.ruma || a.target || a.def.tplId !== 'dawn_acolyte' || !beds.length) continue;
          const bd = beds[k++ % beds.length].pos;
          a.def.stationary = false;
          a.def.patrol = [[bd.x + (Math.random() - 0.5) * 2, bd.z + 1.2]];
        }
        const st = this.cell.meta?.statue;
        if (st) { S.ruma.yaw = Math.atan2(st.x - S.ruma.pos.x, st.z - S.ruma.pos.z); S.ruma.homeYaw = S.ruma.yaw; }
        S.ruma.say('Leave me. I would pray alone.', true);
      }
    }
  },

  // ----------------------------------------------------------------- The Libram of Lesser Wonders
  countLibramPages() {
    const n = ['libram_page_oak', 'libram_page_hen', 'libram_page_wisp'].filter((id) => this.player.inventory.has(id)).length;
    const st = this.quests.stage('sq_wizard');
    if (st >= 10 && st < 50) {
      const want = n >= 3 ? 40 : n === 2 ? 30 : n === 1 ? 20 : 10;
      if (want > st) this.quests.set('sq_wizard', want, this.day());
    }
    return n;
  },
  /** Henrietta the glowing hen, loose in the coop yard, until caught. */
  spawnHenrietta() {
    const w = this.cells.world;
    if (!w || this.flags.henCaught || w.actors.some((a) => a.uid === 'henrietta')) return;
    const x = LOCATIONS.chorrol.x - 46, z = LOCATIONS.chorrol.z - 27;
    this.spawnCreature(w, 'henrietta', x, w.collision.groundHeight(x, z, 500), z, { uid: 'henrietta' });
  },
  startWizardRitual(npc) {
    const c = this.cell;
    const o = c.meta?.orrery || { x: npc.pos.x, z: npc.pos.z - 1.5 };
    const centre = new THREE.Vector3(o.x, 2.6, o.z);
    npc.anim.idleAnim = 'Spell_Simple_Idle_Loop';
    npc.yaw = Math.atan2(o.x - npc.pos.x, o.z - npc.pos.z);
    this.audio.play('portal', 0.4);
    this.magic.runeCircle(new THREE.Vector3(o.x, 0, o.z), 0xc8a0ff, { radius: 2.2, dur: 7.5, spin: 1.5 });
    // the book rises; the three pages circle it, closer and closer, then fly home
    const book = new THREE.Group();
    const cover = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.38), new THREE.MeshStandardMaterial({ color: 0x5a2a7a, roughness: 0.6, emissive: 0x3a1050, emissiveIntensity: 0.6 }));
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), new THREE.MeshStandardMaterial({ color: 0xffd860, emissive: 0xffb020, emissiveIntensity: 2 }));
    star.position.y = 0.08; star.scale.y = 0.4;
    book.add(cover, star);
    const pages = [0, 1, 2].map((i) => { const m = itemMesh('libram_page_oak'); book.add(m); return m; });
    this.magic.add(book, 7.5, (e, dt, k) => {
      const t = e.t;
      book.position.set(o.x, 1.2 + Math.min(1, t / 1.5) * 1.4 + Math.sin(t * 2) * 0.08, o.z);
      cover.rotation.y += dt * (1 + t);
      pages.forEach((m, i) => {
        const a = t * (2 + t * 0.6) + (i * Math.PI * 2) / 3;
        const rad = Math.max(0, 1.6 - Math.max(0, t - 1.5) * 0.4);
        m.position.set(Math.cos(a) * rad, Math.sin(t * 3 + i) * 0.3, Math.sin(a) * rad);
        m.visible = t < 5.6;
      });
      if (Math.random() < dt * 30) this.particles.burst(book.position, 'sparkle', 1);
    });
    const lines = [[0.2, 'Pages of the Libram, hear me! Come home!'], [2.4, 'Leaf, and nibble, and cold wind — you are forgiven. Come home!'], [4.6, 'Steady... steady...'], [6.0, '...HA!']];
    for (const [t, line] of lines) setTimeout(() => npc.say(line, true), t * 1000);
    setTimeout(() => this.audio.play('chime', 1), 4800);
    setTimeout(() => {
      // the binding: a flash of light and a shower of colour
      this.magic.flash(centre, 0xe0c0ff, 120, 18, 1.4);
      this.ui.screenFlash(0xc8a0ff);
      this.audio.play('portal', 0.6);
      const col = new THREE.Color();
      for (let i = 0; i < 160; i++) {
        const a = Math.random() * Math.PI * 2, b = Math.acos(2 * Math.random() - 1), s = 2 + Math.random() * 3;
        col.setHSL(Math.random(), 0.85, 0.65);
        this.particles.emit({ x: centre.x, y: centre.y, z: centre.z, vx: Math.cos(a) * Math.sin(b) * s, vy: Math.cos(b) * s, vz: Math.sin(a) * Math.sin(b) * s, drag: 1.6, gravity: 1.2, life: 1.6 + Math.random(), size: 0.18, color: col });
      }
    }, 5600);
    setTimeout(() => {
      npc.anim.idleAnim = 'Idle_Talking_Loop';
      this.quests.set('sq_wizard', 100, this.day());
      this.flags.wizardShop = true;
      this.giveItem('gold', 150);
      if (!this.player.spells.includes('fireworks')) { this.player.spells.push('fireworks'); this.ui.notify('You learned Festival Fireworks.'); }
      npc.say('The Libram is whole! Thank you, my friend. Take Festival Fireworks with my compliments — and the rest of my wonders are yours to buy.', true);
    }, 7600);
  },

  // ----------------------------------------------------------------- The Ballad of the Hero
  bardRhymeCount() { return ['rhymeMaiq', 'rhymeGlarthir', 'rhymeMirabelle'].filter((f) => this.flags[f]).length; },
  bardRhymeFound() {
    const n = this.bardRhymeCount();
    if (n >= 3 && this.quests.stage('sq_bard') === 30) this.quests.set('sq_bard', 40, this.day());
    else this.ui.notify(`Rhymes for "Oblivion": ${n} of 3.`);
  },
  bardInviteCount() { return ['reynald', 'laythe', 'valus', 'dar_jee', 'teekeeus'].filter((id) => this.flags['invited_' + id]).length; },
  bardInvited() {
    const n = this.bardInviteCount();
    if (n >= 3 && this.quests.stage('sq_bard') === 50) {
      this.quests.set('sq_bard', 60, this.day());
      this.bardMoveToInn();
    } else this.ui.notify(`Guests for the premiere: ${n} of 3.`);
  },
  /** Tillmon packs up at the Roxey Inn and turns up at the Grey Mare. */
  bardMoveToInn() {
    this.flags.bardAtInn = true;
    const w = this.cells.world;
    const t = w?.actors.find((a) => a.uid === 'tillmon');
    if (t) this.removeActor(t);
    const inn = this.cells.inn;
    if (inn && !inn.actors.some((a) => a.uid === 'tillmon_inn')) {
      const p = inn.meta.npcs['5'];
      this.spawnNpc(inn, NPCS.find((n) => n.id === 'tillmon_inn'), p.x, 0, p.z, Math.PI);
    }
  },
  startBardPerformance() {
    const c = this.cell;
    const bard = c.actors.find((a) => a.uid === 'tillmon_inn');
    if (!bard) return;
    this.quests.set('sq_bard', 70, this.day());
    bard.anim.idleAnim = 'Dance_Loop';
    // the guests find seats facing the stage
    const guests = ['reynald', 'laythe', 'valus', 'dar_jee', 'teekeeus'].filter((id) => this.flags['invited_' + id]).slice(0, 3);
    const toCentre = new THREE.Vector3(-bard.pos.x, 0, -bard.pos.z).normalize();
    const side = new THREE.Vector3(-toCentre.z, 0, toCentre.x);
    const audience = guests.map((id, i) => {
      const npc = NPCS.find((n) => n.id === id);
      const at = bard.pos.clone().addScaledVector(toCentre, 3 + (i % 2) * 0.6).addScaledVector(side, (i - 1) * 1.6);
      const a = new Actor(npc, at.x, 0, at.z, { uid: 'aud_' + id, yaw: Math.atan2(bard.pos.x - at.x, bard.pos.z - at.z) });
      a.def.dialogue = npc.dialogue;
      a.def.stationary = true;
      a.anim.idleAnim = i === 1 ? 'Idle_FoldArms_Loop' : null;
      this.addActor(a);
      return a;
    });
    const player = this.player;
    player.pos.copy(bard.pos).addScaledVector(toCentre, 4.6).addScaledVector(side, 1.8);
    player.yaw = Math.atan2(-(bard.pos.x - player.pos.x), -(bard.pos.z - player.pos.z));
    this.bardShow = { bard, audience, t: 0, i: -1 };
  },
  tickBardPerformance() {
    const S = this.bardShow;
    const A = (k) => S.audience[k] || S.audience[0];
    const lines = [
      [S.bard, 'THE BALLAD OF THE HERO OF KVATCH! Verse the third — the first two were lost in a puddle.', 'lute'],
      [S.bard, '♪ Oh, there came from the sewers a hero so bold, who was damp, and confused, and a little bit cold! ♪', 'lute'],
      [A(0), '...Is the whole thing going to rhyme like that?', null],
      [S.bard, '♪ They were handed an amulet, told not to lose it, and wandered off wondering whom they could... choose it... to... ♪', 'luteBad'],
      [S.bard, '♪ Sing HEY for the hero! Sing HO for the sword! Sing anything rhyming with KVATCH, my lord! ♪', 'lute'],
      [A(1), 'Nothing rhymes with Kvatch.', null],
      [S.bard, '♪ They strode through a gate to the realm of Oblivion — which rhymes, as we know, with a small trivial bun! ♪', 'lute'],
      [A(2), 'Was that... was that M\'aiq\'s?', null],
      [S.bard, '♪ And also grim Vivian! And one sad civilian! And nothing, my friends, when you think of it, EVER... ♪', 'luteBad'],
      [S.bard, '♪ ...EXCEPT — ha! HA! — except for... ME!!! ♪', 'lute'],
    ];
    S.t += 0.25;
    const idx = Math.floor(S.t / 5.2);
    if (idx !== S.i && idx < lines.length) {
      S.i = idx;
      const [who, text, snd] = lines[idx];
      who?.say(text, true);
      if (snd) this.audio.play(snd, 0.9);
    }
    if (S.t > lines.length * 5.2 - 1) { this.bardShow = null; this.bardReveal(S); }
  },
  /** The surprise. */
  bardReveal(S) {
    const c = this.cell, bard = S.bard;
    const at = bard.pos.clone();
    this.flags.bardRevealed = true;
    this.quests.set('sq_bard', 80, this.day());
    this.audio.play('portal', 0.6);
    this.audio.play('chime', 1);
    this.magic.summon(at, 0xa040ff);
    this.magic.flash(at.clone().setY(2), 0xc070ff, 80, 20, 1.6);
    this.ui.screenFlash(0xa040ff);
    // butterflies everywhere
    const P = this.particles, col = new THREE.Color();
    for (let i = 0; i < 160; i++) {
      col.setHSL(Math.random(), 0.8, 0.65);
      P.emit({ x: at.x + (Math.random() - 0.5) * 2, y: 1 + Math.random() * 2, z: at.z + (Math.random() - 0.5) * 2, vx: (Math.random() - 0.5) * 6, vy: Math.random() * 3, vz: (Math.random() - 0.5) * 6, drag: 0.8, gravity: -0.3, life: 3 + Math.random() * 3, size: 0.12, color: col });
    }
    this.removeActor(bard);
    const sheo = this.spawnNpc(c, NPCS.find((n) => n.id === 'sheogorath'), at.x, 0, at.z, Math.atan2(this.player.pos.x - at.x, this.player.pos.z - at.z));
    sheo.anim.idleAnim = 'Dance_Loop';
    setTimeout(() => sheo.say('CHEESE FOR EVERYONE!', true), 600);
    setTimeout(() => S.audience[0]?.say('Is that... part of the show?', true), 3400);
    setTimeout(() => (S.audience.find((a) => a.uid === 'aud_dar_jee') || S.audience[1])?.say('This one would like a refund.', true), 6200);
    setTimeout(() => { sheo.anim.idleAnim = 'Idle_Talking_Loop'; }, 7000);
    this.rainCheese(at, 12, 5);
  },
  /** Wheels of cheese tumble out of nowhere and can be picked up. */
  rainCheese(centre, n, spread) {
    const c = this.cell;
    const b = { add: (o) => c.group.add(o), interact: (d) => { c.interactables.push(d); return d; } };
    const [x0, z0, x1, z1] = c.bounds || [-1e9, -1e9, 1e9, 1e9];
    for (let i = 0; i < n; i++) {
      const x = Math.min(x1 - 1, Math.max(x0 + 1, centre.x + (Math.random() - 0.5) * spread * 2));
      const z = Math.min(z1 - 1, Math.max(z0 + 1, centre.z + (Math.random() - 0.5) * spread * 2));
      const y = c.collision.groundHeight(x, z, centre.y + 3);
      const it = this.placeItem(b, 'cheese_wheel', x, y, z, `cheese_rain_${Date.now()}_${i}`);
      const m = it.mesh, startY = y + 3 + Math.random() * 2, delay = Math.random() * 0.8;
      m.position.y = startY;
      this.magic.add(null, 1.2 + delay, (e) => {
        const k = Math.max(0, (e.t - delay) / 1.2);
        m.position.y = startY + (y - startY) * Math.min(1, k * k);
        m.rotation.x = (1 - Math.min(1, k)) * 6;
      });
    }
  },
  sheogorathDeparts() {
    const c = this.cell;
    const sheo = c.actors.find((a) => a.uid === 'sheogorath');
    this.flags.sheoGone = true;
    if (sheo) {
      this.magic.summon(sheo.pos.clone(), 0xa040ff);
      this.audio.play('portal', 0.5);
      const P = this.particles, col = new THREE.Color();
      for (let i = 0; i < 90; i++) { col.setHSL(Math.random(), 0.8, 0.65); P.emit({ x: sheo.pos.x, y: 1.2, z: sheo.pos.z, vx: (Math.random() - 0.5) * 5, vy: Math.random() * 4, vz: (Math.random() - 0.5) * 5, drag: 0.8, life: 3, size: 0.12, color: col }); }
      this.removeActor(sheo);
    }
    // the audience drifts home, arguing about it
    for (const a of [...c.actors]) if (a.uid.startsWith('aud_')) setTimeout(() => this.removeActor(a), 2500 + Math.random() * 2000);
  },
  /** The Lute of the Mad God: one random blessing (or nuisance) per hour. */
  playMadLute() {
    const p = this.player;
    if (this.flags.madluteAt !== undefined && this.time.hours - this.flags.madluteAt < 1) return this.ui.notify('The lute refuses to play. It appears to be sulking.');
    this.flags.madluteAt = this.time.hours;
    this.audio.play('lute', 1);
    const roll = Math.floor(Math.random() * 5);
    const col = new THREE.Color();
    const sparkle = (n) => { for (let i = 0; i < n; i++) { col.setHSL(Math.random(), 0.8, 0.65); this.particles.emit({ x: p.pos.x, y: p.pos.y + 1.4, z: p.pos.z, vx: (Math.random() - 0.5) * 5, vy: Math.random() * 3, vz: (Math.random() - 0.5) * 5, drag: 0.8, life: 2.5, size: 0.12, color: col }); } };
    if (roll === 0) { this.rainCheese(p.pos.clone().addScaledVector(p.lookDir(), 2), 4, 2); this.ui.notify('It is raining cheese. Of course it is.'); }
    else if (roll === 1) { p.health = p.maxHealth; p.fatigue = p.maxFatigue; sparkle(60); this.ui.notify('You feel unaccountably, suspiciously wonderful.'); }
    else if (roll === 2) {
      const at = p.pos.clone().addScaledVector(p.forward(new THREE.Vector3()), 2.5);
      at.y = this.cell.collision.groundHeight(at.x, at.z, p.pos.y + 1);
      const a = new Actor('scamp_summon', at.x, at.y, at.z, { duration: 30 });
      a.name = 'Bob the Scamp';
      this.addActor(a);
      this.magic.summon(at, 0xa040ff);
      setTimeout(() => a.say(['Bob is here! Bob is helping!', 'Bob was in the middle of a sandwich.', 'Who are we stabbing? Bob loves stabbing.'][Math.floor(Math.random() * 3)], true), 700);
      this.ui.notify('Bob the Scamp has answered the call. Nobody called Bob.');
    } else if (roll === 3) {
      let n = 0;
      for (const a of this.cell.actors) if (!a.dead && a.hostileToPlayer && a.pos.distanceTo(p.pos) < 25) { a.fleeFrom = p; a.fleeT = 8; n++; }
      sparkle(30);
      this.ui.notify(n ? 'Everyone nearby suddenly remembers an urgent appointment.' : 'Somewhere, a goat sneezes. You feel this was your doing.');
    } else { this.giveItem('gold', 1); sparkle(40); this.ui.notify('A single gold coin falls out of the lute, along with a note that says "IOU".'); }
  },

  // ----------------------------------------------------------------- The Unfinished Map
  hourIsMidnight() {
    const hr = ((this.time.hours % 24) + 24) % 24;
    return hr >= 23 || hr < 1;
  },
  useHollowAltar() {
    const p = this.player;
    const glyphs = 'Ayleid glyphs circle the rim of the altar stone, worn almost smooth: a crescent moon, a scatter of stars, a rayed sun.';
    if (this.flags.nenalathaOpen) return this.ui.showMessage('Altar of the Hollow Stones', 'The fork\'s note still hangs in the air. North of the altar, between the tallest stones, the door of light stands open.');
    if (!p.inventory.has('tuning_fork')) {
      return this.ui.showMessage('Altar of the Hollow Stones', `${glyphs}\n\nThere is a shallow groove in the centre of the stone, about the length of a hand, as if something long and thin once rested there.`);
    }
    this.audio.play('chime', 1);
    if (!this.hourIsMidnight()) {
      return this.ui.showMessage('Altar of the Hollow Stones', 'You strike the tuning fork against the altar. A pure note rings out across the hills — and dies against the stones. Nothing answers.\n\n(It is not yet the hour that belongs to no day.)');
    }
    this.flags.nenalathaOpen = true;
    this.applyPersistentState(this.cell);
    this.audio.play('portal', 0.5);
    if (this.quests.stage('sq_map') < 50) this.quests.set('sq_map', 50, this.day());
    this.ui.showMessage('Altar of the Hollow Stones', 'You strike the tuning fork against the altar. The note rings out — and does not stop. It goes on after the fork falls silent in your hand, passing from stone to stone around the ring, nine voices, then one.\n\nBetween the two tallest stones to the north, the air folds open like the page of a book. Behind it, a stair of pale stone descends into blue light.');
  },
  touchPedestal(t) {
    if (this.flags.nenGate) return this.ui.notify('The pedestal is silent now.');
    const seq = (this.flags.nenSeq ||= []);
    if (seq.includes(t.sym)) return this.ui.notify(`The ${t.sym} glyph is already lit.`);
    const want = ['moon', 'star', 'sun'];
    seq.push(t.sym);
    t.glyphMat.emissiveIntensity = 3;
    this.audio.play('chime', 0.8);
    if (seq[seq.length - 1] !== want[seq.length - 1]) {
      // wrong order: the glyphs gutter out and the hall wakes its guardians
      this.flags.nenSeq = [];
      setTimeout(() => {
        for (const it of this.cell.interactables) if (it.kind === 'pedestal') it.glyphMat.emissiveIntensity = 0.15;
      }, 700);
      this.audio.play('crime', 0.6);
      this.ui.notify('The light gutters out. Something stirs in the dark...');
      for (let i = 0; i < 2; i++) {
        const a = this.spawnCreature(this.cell, 'ghost', t.pos.x + (i ? 3 : -3), 0, t.pos.z + 2);
        a.setTarget(this.player);
      }
      return;
    }
    if (seq.length === 3) {
      this.flags.nenGate = true;
      this.applyPersistentState(this.cell);
      this.audio.play('portal', 0.6);
      if (this.quests.stage('sq_map') < 70) this.quests.set('sq_map', 70, this.day());
      this.ui.showMessage('The Sealed Gate', 'Moon, stars, sun — the night counted the way the elves counted it. The three glyphs blaze together, and with a sound like a long-held breath let go, the bars of light sink into the floor.');
    } else this.ui.notify(`The ${t.sym} glyph kindles.`);
  },
  archivistAlive() {
    return this.cell.actors.some((a) => a.def.tplId === 'archivist' && !a.dead);
  },
  examineCrystal() {
    if (this.archivistAlive()) return this.ui.showMessage('Welkynd Crystal', 'A shape stands inside the crystal, but you cannot get near it — the Archivist\'s will binds the hall.');
    if (this.flags.corvinFreed) return this.ui.showMessage('Welkynd Crystal', 'Shards of welkynd glass crunch underfoot. The pedestal is empty.');
    if (this.flags.atlasTaken) return this.ui.showMessage('Welkynd Crystal', 'The crystal is dark and cold. You can no longer see what is inside it, and you find you do not want to.');
    this.ui.showChoice('Welkynd Crystal', 'Inside the crystal, caught mid-step, stands a man in a faded surveyor\'s coat with ink on his cuffs. Corvin Ashby. His eyes are open.\n\nThe crystal hums with the same note as the tuning fork — and with the light that pours into it from the Atlas on its lectern. Strike it with the fork, and the Atlas\'s hoarded hours will flood into him. The book will not survive it.', [
      { label: 'Strike the crystal (free Corvin)', fn: () => this.freeCorvin() },
      { label: 'Step away' },
    ]);
  },
  examineAtlas(t) {
    if (this.archivistAlive()) return this.ui.showMessage('The Atlas of Hours', 'A book of silver light rests on the lectern. The Archivist will not let you near it.');
    if (this.flags.corvinFreed) return this.ui.showMessage('The Atlas of Hours', 'A heap of fine silver ash on the lectern, still warm.');
    if (this.flags.atlasTaken) return;
    this.ui.showChoice('The Atlas of Hours', 'A book of silver pages, each a map of this same hall at a different hour. In the earliest pages the hall is full of Ayleids. In the last ones a man stands in the middle of it and does not move from page to page.\n\nLight flows from the book into the crystal in a slow, patient stream. If you lift the Atlas from its lectern, the stream will stop.', [
      { label: 'Take the Atlas (Corvin stays sealed)', fn: () => this.takeAtlas(t) },
      { label: 'Leave it' },
    ]);
  },
  freeCorvin() {
    const h = this.cell.hall;
    this.flags.corvinFreed = true;
    this.audio.play('hitMetal', 1);
    this.audio.play('portal', 0.5);
    this.particles.burst(h.crystal.pos, 'heal', 60, 0x9ad0ff);
    this.applyHallState(this.cell);
    const c = h.crystal.pos;
    const corvin = this.spawnNpc(this.cell, NPCS.find((n) => n.id === 'corvin'), c.x + 0.5, 0, c.z, -Math.PI / 2);
    corvin.following = true;
    this.flags.corvinFollowing = true;
    this.quests.set('sq_map', 80, this.day());
    setTimeout(() => corvin.say('...Ysa? No. Who are you? How long— no. Don\'t tell me. Tell me on the way.', true), 900);
    this.ui.showMessage('Welkynd Crystal', 'You strike the crystal with the fork. The note climbs and climbs until you feel it in your teeth — and the crystal comes apart into a thousand slow-falling flakes of light. On the lectern, the Atlas of Hours curls into silver ash.\n\nCorvin Ashby finishes the step he started forty years ago, and nearly falls.');
  },
  takeAtlas() {
    this.flags.atlasTaken = true;
    this.giveItem('atlas_of_hours', 1);
    this.applyHallState(this.cell);
    this.audio.play('gateClose', 0.4);
    this.quests.set('sq_map', 85, this.day());
    this.ui.showMessage('The Atlas of Hours', 'You lift the Atlas from the lectern. The stream of light thins to a thread, and breaks. Behind you the crystal dims from blue to grey to nothing, and the hum you had stopped noticing goes quiet.\n\nThe book is warm in your hands.');
  },
  /** Reflect the crystal/atlas choice in the Hall of Hours. */
  applyHallState(cell) {
    const h = cell.hall;
    if (!h) return;
    const freed = !!this.flags.corvinFreed, taken = !!this.flags.atlasTaken;
    h.beam.visible = !freed && !taken;
    h.book.visible = !freed && !taken;
    h.shell.visible = !freed;
    if (h.holder.userData.figure) h.holder.userData.figure.root.visible = !freed;
    if (taken) { h.shell.material.emissiveIntensity = 0; h.shell.material.opacity = 0.85; h.shell.material.color.setHex(0x20242a); }
    h.atlas.disabled = taken;
  },
  /** The last scene with Ysolde. kind: 'reunion' | 'lie' | 'truth' */
  finishUnfinishedMap(kind) {
    const ys = this.cell.actors.find((a) => a.uid === 'ysolde');
    const after = () => {
      if (ys) this.removeActor(ys);
      this.flags.ysoldeGone = true;
    };
    if (kind === 'reunion') {
      this.quests.set('sq_map', 100, this.day());
      const corvin = this.cell.actors.find((a) => a.uid === 'corvin');
      if (corvin) { corvin.following = false; corvin.state = 'idle'; corvin.def.stationary = true; }
      this.flags.corvinFollowing = false;
      this.flags.corvinHome = true;
      this.giveItem('corvins_ring', 1);
      this.giveItem('finished_map', 1);
      this.giveItem('gold', 400);
      for (const L of Object.keys(LOCATIONS)) this.discovered[L] = true;
      this.ui.queueAfterDialogue = () => this.ui.showChoice('Before Dawn', 'They talk until the candles gutter — about coastlines, and rain, and a hill in the west where nine stones stand in a ring. You leave them to it.\n\nYsolde Vane dies a little before dawn, with Corvin Ashby holding her hand.\n\nIn the morning he finds you in the common room and presses something into your palm: a silver ring engraved with a compass rose, and his map — finished at last, in two hands. "She did all the lettering," he says. "Every stream. Every shrine. Forty years of it." He smiles, and it nearly works.\n\n(Your map has been completed: every location is now marked.)', [{ label: 'Close', fn: after }]);
    } else {
      this.quests.set('sq_map', 110, this.day());
      if (kind === 'lie') this.giveItem('gold', 500);
      this.ui.queueAfterDialogue = () => this.ui.showChoice('Before Dawn', kind === 'lie'
        ? 'Ysolde presses her purse into your hands and will not take it back. Then she asks Emfrid for a candle, and her ink, and a fresh sheet of vellum.\n\nShe is found in the morning, slumped over the table, the candle burned down to nothing. On the vellum is a map of nine stones in a ring, drawn very carefully, and labelled in a small neat hand: HERE.'
        : 'Ysolde does not speak to you again. She sits by the fire with her hands folded, looking at nothing, until Emfrid helps her to bed.\n\nShe dies in the night. The Atlas of Hours is warm against your side. You do not open it for a long time.', [{ label: 'Close', fn: after }]);
    }
  },
  // ----------------------------------------------------------------- The Lantern in the Wood
  /** Stage changes that pull the Corwyn questline forward on their own. */
  corwynOnStage(q, st) {
    const Q = this.quests, inv = this.player.inventory, d = this.day();
    if (q === 'sq_lantern' && st >= 20) this.flags.ashenWalk = true;
    if (q === 'sq_ashes' && st === 10 && inv.has('tams_slate')) Q.set('sq_ashes', 20, d);
    if (q === 'sq_gloam' && st === 10 && this.flags.lamplighterDead) Q.set('sq_gloam', inv.has('maela_lantern') ? 30 : 25, d);
  },
  /** Lights and souls in the barrow (and its lamp outside) go out once the Lamplighter is dead. */
  applyGloamState(cell) {
    if (!this.flags.lamplighterDead) return;
    if (cell.id === 'gloam_barrow') {
      for (const s of cell.meta.souls || []) { s.mesh.visible = false; s.light.on = false; }
      const r = cell.meta.ritual;
      if (r) { r.ring.visible = false; r.glyphs.visible = false; r.light.on = false; }
    }
    const lamp = this.cells.world?.state.corwyn?.greenLamp;
    if (lamp) { lamp.mesh.visible = false; lamp.light.on = false; }
  },
  applyCorwynWorld() {
    const st = this.cells.world?.state.corwyn;
    if (!st) return;
    if (st.embers) st.embers.rate = this.flags.maelaAtRest ? 0 : 2.5;
    this.applyGloamState(this.cells.world);
  },
  freeBarrowSouls() {
    const c = this.cell;
    this.flags.lamplighterDead = true;
    (c.meta.souls || []).forEach((s, i) => setTimeout(() => {
      s.mesh.visible = false;
      s.light.on = false;
      this.particles.burst(new THREE.Vector3(s.x, 1.9, s.z), 'heal', 18, 0x9affc0);
      this.audio.play('chime', 0.35);
    }, 250 + i * 220));
    const r = c.meta.ritual;
    if (r) setTimeout(() => { r.ring.visible = false; r.glyphs.visible = false; r.light.on = false; this.particles.burst(new THREE.Vector3(r.x, 0.5, r.z), 'smoke', 20); }, 600);
    const lamp = this.cells.world?.state.corwyn?.greenLamp;
    if (lamp) { lamp.mesh.visible = false; lamp.light.on = false; }
    setTimeout(() => this.ui.showMessage('The Green Lanterns', 'One by one, the green lanterns go out. Something rushes past you toward the barrow door — many somethings, thirty-one of them, though you could not say how you know the number — and for a moment the air smells of pine resin and rain.\n\nThe Lamplighter lies where she fell. Her satchel of black stones has gone grey and cracked. Beside her, still burning a stubborn, kindly gold, is a charcoal-burner\'s lantern on a carrying pole.'), 2600);
  },
  /** The Lamplighter: a speech as you come in, and the ash-dead raised as she weakens. */
  tickLamplighter() {
    const c = this.cell, p = this.player;
    const il = c.actors.find((a) => a.uid === 'ilvaine' && !a.dead);
    if (!il) return;
    const d = il.pos.distanceTo(p.pos);
    if (!this.flags.ilvaineSpoke && d < 17) {
      this.flags.ilvaineSpoke = true;
      il.calmT = 12;
      il.faceTo?.(p.pos, 1);
      const lines = ['Another moth. They do keep coming to my lights.', 'Do you know what a forest is, little moth? A kiln — if you are patient with it.', 'Thirty-one souls from one autumn night. And the mother, who would not go into the gem. Eighty-four years she has been my lamp.', 'You will make such a bright little light.'];
      lines.forEach((l, i) => setTimeout(() => { if (!il.dead) il.say(l, true); }, i * 2900));
      setTimeout(() => { if (!il.dead) { il.calmT = 0; il.setTarget(p); } }, lines.length * 2900);
    }
    // strike first and she stops talking
    if (il.calmT > 0 && il.health < il.maxHealth) { il.calmT = 0; il.setTarget(p); }
    for (const [k, frac] of [['raised1', 0.66], ['raised2', 0.33]]) {
      if (il[k] || il.health > il.maxHealth * frac) continue;
      il[k] = true;
      il.say(frac > 0.5 ? 'Up, my lovelies. Up out of the ash!' : 'Burn for me! All of you, BURN for me!', true);
      this.audio.play('conjure', 0.7);
      const r = c.meta.ritual || il.pos;
      for (let i = 0; i < 2; i++) {
        const a = Math.random() * Math.PI * 2;
        const x = r.x + Math.cos(a) * 2.2, z = r.z + Math.sin(a) * 2.2;
        this.particles.burst(new THREE.Vector3(x, 0.4, z), 'smoke', 14);
        this.particles.burst(new THREE.Vector3(x, 0.6, z), 'magic', 20, 0x60ff90);
        const z1 = this.spawnCreature(c, 'ashen_dead', x, 0, z);
        z1.setTarget(p);
      }
    }
  },
  /** Maela's lantern: spectral while she is bound, warm gold once it is hers again. Runs every frame. */
  updateGhostLantern() {
    const c = this.cell;
    const m = c?.id === 'world' ? c.actors.find((a) => a.uid === 'maela' && !a.dead) : null;
    const G = (this._ghostLamp ||= {});
    if (!m || m.hiddenNow || !m.group.visible) {
      if (G.flame) G.flame.visible = false;
      if (G.light) G.light.on = false;
      return;
    }
    const freed = !!this.flags.maelaFreed;
    if (G.actor !== m || G.freed !== freed) {
      // (re)build her lantern and its flame
      G.actor = m; G.freed = freed;
      G.mesh?.parent?.remove(G.mesh);
      if (G.flame) this.scene.remove(G.flame);
      const rig = m.rig;
      rig.holdTorch = true;
      G.mesh = buildLanternMesh();
      if (!freed) G.mesh.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.45; o.material.depthWrite = false; o.material.color?.lerp(new THREE.Color(0x9ab8ff), 0.6); } });
      (rig.bowSlot ?? rig.L?.hand ?? m.group).add(G.mesh);
      G.flame = buildCarriedFlame(0.05, { halo: 8, color: freed ? 0xffc27a : 0x9ab8ff, ghost: freed ? 0 : 1 });
      this.scene.add(G.flame);
      if (!G.light) { G.light = { color: new THREE.Color(), intensity: 10, distance: 13, pos: new THREE.Vector3(), flicker: true, night: false, on: true }; }
      if (!c.lights.includes(G.light)) c.lights.push(G.light);
      G.light.color.setHex(freed ? 0xffc27a : 0x9ab8ff);
      G.light.intensity = freed ? 12 : 9;
    }
    // keep the lantern upright in her raised hand
    const t = G.mesh;
    t.parent.updateWorldMatrix(true, false);
    t.quaternion.setFromEuler(_ghostE.set(-0.2, m.yaw, 0, 'YXZ')).premultiply(t.parent.getWorldQuaternion(_ghostQ).invert());
    const tip = t.userData.tip.getWorldPosition(_ghostV);
    G.flame.visible = true;
    G.flame.position.copy(tip);
    G.flame.userData.uniforms.uTime.value = this.clockT;
    G.light.on = true;
    G.light.pos.copy(tip).y += 0.15;
    // the reunion's last moments: the light swells, then goes
    if (this.corwynScene?.glow !== undefined) G.light.intensity = (freed ? 12 : 9) * this.corwynScene.glow;
  },
  /** The lantern is back in her hands: it turns real, and warm. */
  maelaLanternReturned(m) {
    this.audio.play('chime', 0.9);
    this.particles.burst(m.center(), 'heal', 40, 0xffd08a);
    this.ui.showMessage('Maela\'s Lantern', 'The moment the lantern is in her hands, its flame turns from cold blue to gold, and the light she casts on the grass is warm. For the first time she looks down at it and sees it.\n\nThe embers drifting through the clearing are gone. Only the fireflies are left.');
  },
  /** The last scene: a very old man walks into the clearing, and his mother knows him. */
  startCorwynReunion(maela) {
    if (this.corwynScene) return;
    const tam = this.cell.actors.find((a) => a.uid === 'inn_patron' && !a.dead);
    if (!tam || !maela) return;
    const toT = tmpV.copy(tam.pos).sub(maela.pos).setY(0);
    if (toT.lengthSq() < 0.01) toT.set(1, 0, 0);
    toT.normalize();
    tam.following = false;
    tam.def.stationary = true;
    tam.home = maela.pos.clone().addScaledVector(toT, 1.8);
    tam.homeYaw = Math.atan2(-toT.x, -toT.z);
    tam.noFacePlayer = true;
    maela.def.wander = 0;
    maela.def.stationary = true;
    maela.home = maela.pos.clone();
    maela.homeYaw = Math.atan2(toT.x, toT.z);
    maela.noFacePlayer = true;
    // her own materials, so she can fade without fading every ghost in Cyrodiil
    maela.group.traverse((o) => { if (o.isMesh && o.material) o.material = Array.isArray(o.material) ? o.material.map((x) => x.clone()) : o.material.clone(); });
    const T = (txt) => tam.say(txt, true), Mm = (txt) => maela.say(txt, true);
    const steps = [
      [0.5, () => Mm('Who\'s there? Who is that, at the edge of the trees?')],
      [4, () => T('It\'s me, Ma.')],
      [7.5, () => Mm('No. No, you\'re not my Tam. My Tam is small. My Tam has a wooden fox, and he\'s only—')],
      [13, () => { T('This fox? Pa carved it. One ear\'s shorter. He said it was listening for me.'); this.particles.burst(tam.center(), 'sparkle', 10); }],
      [19.5, () => Mm('...Tam?')],
      [22.5, () => T('Little fox, little fox, curl up tight...')],
      [27, () => { Mm('...the dark is just the day with its eyes shut at night.'); this.corwynScene.glow = 1.6; this.audio.play('chime', 0.5); }],
      [32, () => T('I went for help, Ma. I wrote it on my slate, like you taught me. I\'m sorry I was so long.')],
      [38.5, () => Mm('You went for help. Oh, my love. You were such a good boy. You were always such a good boy.')],
      [45, () => Mm('Look at you. You got old. Did you have a good life? Tell me you had a good life.')],
      [51, () => T('I did, Ma. A long one. I married a girl from Bruma who laughed like you. There are grandchildren. Great-grandchildren.')],
      [58, () => Mm('Then I can stop looking now.')],
      [61.5, () => this.corwynFarewell(maela)],
      [68.5, () => T('She was warm. At the very end. Did you feel it? She was warm.')],
      [74, () => this.corwynEpilogue(tam)],
    ];
    this.corwynScene = { start: this.clockT, steps, i: 0, maela, tam, glow: 1 };
    this.audio.setMusic('none');
  },
  tickCorwynScene() {
    const S = this.corwynScene;
    const t = this.clockT - S.start;
    while (S.i < S.steps.length && S.steps[S.i][0] <= t) S.steps[S.i++][1]();
    if (S.i >= S.steps.length) this.corwynScene = null;
  },
  corwynFarewell(maela) {
    const at = maela.pos.clone();
    this.audio.play('chime', 1);
    this.audio.play('heal', 0.6);
    this.corwynScene.glow = 2.4;
    // she rises into motes of gold, and fades
    const mats = [];
    maela.group.traverse((o) => { if (o.isMesh && o.material) for (const m of [].concat(o.material)) { m.transparent = true; mats.push([m, m.opacity ?? 1]); } });
    const y0 = maela.group.position.y;
    this.magic.add(null, 4.5, (e, dt, k) => {
      for (const [m, o0] of mats) m.opacity = o0 * (1 - k);
      maela.group.position.y = y0 + k * 0.8;
      if (this.corwynScene) this.corwynScene.glow = 2.4 * (1 - k) + 0.01;
      if (Math.random() < 0.6) this.particles.burst(at.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.8, 0.4 + Math.random() * 1.6, (Math.random() - 0.5) * 0.8)), 'sparkle', 2);
    });
    for (let i = 0; i < 3; i++) setTimeout(() => this.particles.burst(at.clone().setY(at.y + 1.2), 'heal', 24, 0xffd890), i * 700);
    setTimeout(() => {
      this.flags.maelaAtRest = true;
      this.removeActor(maela);
      this._ghostLamp && (this._ghostLamp.actor = null);
      const G = this._ghostLamp;
      if (G?.flame) G.flame.visible = false;
      if (G?.light) G.light.on = false;
      this.applyCorwynWorld();
      // she leaves her lantern in the grass, still burning
      const c = this.cell;
      const b = { add: (o) => c.group.add(o), interact: (d) => { c.interactables.push(d); return d; } };
      const y = c.collision.groundHeight(at.x, at.z, at.y + 2);
      const it = this.placeItem(b, 'maela_lantern', at.x, y, at.z, 'maela_lantern_rest');
      this.particles.burst(new THREE.Vector3(at.x, y + 0.3, at.z), 'sparkle', 16);
      this.quests.set('sq_home', 100, this.day());
    }, 4600);
  },
  corwynEpilogue(tam) {
    this.flags.tamFollowing = false;
    this.flags.tamHome = true;
    tam.noFacePlayer = false;
    this.audio.setMusic(this.cell.music);
    this.ui.showMessage('Come Home', 'Tam Corwyn sits down on his mother\'s cairn, very slowly, and puts his father\'s fox on the stones between his hands. He does not cry. He looks, if anything, like a man who has finally put down something he has been carrying uphill his whole life.\n\n"Leave me a bit," he says. "I\'ll find my own way back. I know the road now."\n\nIn the grass where she stood, her lantern is still burning.');
  },
  abortCorwynScene() {
    const S = this.corwynScene;
    this.corwynScene = null;
    if (!S || this.flags.maelaAtRest) return;
    if (S.tam && !S.tam.dead) { S.tam.following = true; S.tam.def.stationary = false; S.tam.noFacePlayer = false; }
    if (S.maela) S.maela.noFacePlayer = false;
  },
  /** Quest beats around the clearing, the barrow and the Grey Mare. Runs four times a second. */
  tickCorwyn() {
    const q = this.quests, p = this.player, c = this.cell;
    if (c.id === 'gloam_barrow') this.tickLamplighter();
    if (c.id !== 'world') return;
    const C = LOCATIONS.corwyn_clearing;
    const dC = Math.hypot(p.pos.x - C.x, p.pos.z - C.z);
    if (q.stage('sq_lantern') === 20 && dC < 24) q.set('sq_lantern', 30, this.day());
    const m = c.actors.find((a) => a.uid === 'maela' && !a.dead);
    if (m && this.flags.maelaNamed && m.name !== 'Maela Corwyn') m.name = 'Maela Corwyn';
    if (this.corwynScene) this.tickCorwynScene();
    else if (m && !m.hiddenNow && q.stage('sq_home') === 20) {
      const tam = c.actors.find((a) => a.uid === 'inn_patron' && !a.dead);
      if (tam && tam.pos.distanceTo(m.pos) < 9) this.startCorwynReunion(m);
    }
    // once he has said his goodbyes, Tam walks home on his own when you are gone
    if (this.flags.tamHome && !this.corwynScene) {
      const tam = c.actors.find((a) => a.uid === 'inn_patron' && !a.following);
      if (tam && tam.pos.distanceTo(p.pos) > 70) this.removeActor(tam);
    }
  },

  // ----------------------------------------------------------------- The White Hare
  /** Stage changes that pull the White Hare questline forward on their own. */
  whOnStage(q, st) {
    const Q = this.quests, d = this.day();
    if (q === 'sq_hare1' && st === 20 && this.player.inventory.has('hare_fur') && this.player.inventory.has('trap_tag')) { Q.set('sq_hare1', 30, d); Q.set('sq_hare1', 40, d); }
    if (q === 'sq_hare2' && st === 10 && this.flags.varnTold) Q.set('sq_hare2', 30, d);
    if (q === 'sq_hare3' && st === 10) this.whGiftStage();
    if (q === 'sq_hare4' && st === 10 && this.flags.windCalmed) Q.set('sq_hare4', 20, d);
    if (q.startsWith('sq_hare')) this.applyWhiteHareWorld();
  },
  whGiftStage() {
    const st = this.quests.stage('sq_hare3');
    if (st < 10 || st >= 100) return;
    const n = ['fir_heartwood', 'glimmerfin', 'kynareth_loaf'].filter((id) => this.player.inventory.has(id)).length;
    const want = [10, 20, 30, 40][n];
    if (want > st) this.quests.set('sq_hare3', want, this.day());
  },
  /** Varn gives up his buyer (bought, persuaded or shamed into it). Returns his words. */
  varnTalks() {
    this.flags.varnTold = true;
    if (!this.player.inventory.has('varn_ledger')) this.giveItem('varn_ledger', 1);
    if (this.quests.stage('sq_hare2') < 30) this.quests.set('sq_hare2', 30, this.day());
    return '*He tosses you a greasy little ledger.* It\'s all in there. Old man in a grey Legion cloak, waiting at the bottom of the shrine path the morning after first snow, like he knew she\'d be in my snare. Paid three hundred in Imperial silver — three hundred! — and said to bring her up to the Rime Spire. The old watchtower on the mountain, north-east of the village. Nobody\'s lived in it since the Akaviri wars.\n\nHe said a strange thing, paying me. He said, "Winter is the only wall the Daedra can\'t burn." Then he took the cage and went up the mountain, and the snow\'s been coming down ever since.\n\n*He doesn\'t look at you.* Didn\'t know what she was. That\'s the truth.';
  },
  /** World-side state of the questline: the glowing tracks, the wind wall, the hare on the roof. */
  applyWhiteHareWorld() {
    const st = this.cells.world?.state.whiteHare;
    if (!st) return;
    st.tracks.visible = this.quests.stage('sq_hare2') >= 10 && !this.flags.hareFreed;
    for (const e of st.trackSparkles || []) e.rate = st.tracks.visible ? 1.5 : 0;
    st.windWall.visible = !this.flags.windCalmed;
    const home = !!this.flags.lightwatchDone || !!this.flags.hareOnRoof;
    st.roofHare.visible = home;
    st.roofLight.on = home;
  },
  /** Lit braziers, melted ice and the open cage inside the Rime Spire. */
  applyRimeState(cell) {
    if (cell.id !== 'rime_spire') return;
    for (const br of cell.meta.braziers || []) if (this.flags[`rimeBrazier${br.n}`]) this.kindleRimeBrazier(cell, br, true);
    const cg = cell.meta.cage;
    if (cg && this.flags.hareFreed) { cg.hare.visible = false; cg.frost.visible = false; cg.lid.position.y = 3.2; cg.light.on = false; }
    else if (cg && (this.flags.cassiusSpared || this.flags.killed?.cassius)) { cg.frost.material.opacity = 0.25; cg.frost.material.emissiveIntensity = 0.15; }
  },
  kindleRimeBrazier(cell, br, quiet = false) {
    if (br.fire) return;
    const f = buildCarriedFlame(0.24, { halo: 4.5 });
    f.position.set(br.x, 1.22, br.z);
    f.userData.uniforms.uNight.value = 1;
    cell.group.add(f);
    br.fire = f;
    const l = { color: new THREE.Color(0xff8a3a), intensity: 26, distance: 16, pos: new THREE.Vector3(br.x, 2.2, br.z), flicker: true, night: false, on: true };
    cell.lights.push(l);
    br.light = l;
    (cell.rimeFires ||= []).push(f);
    if (!quiet) {
      this.audio.play('torch', 0.9);
      this.particles.burst(new THREE.Vector3(br.x, 1.4, br.z), 'torchspark', 14);
    }
  },
  useColdBrazier(t) {
    const c = this.cell, p = this.player;
    const br = c.meta.braziers.find((x) => x.n === t.n);
    if (this.flags[`rimeBrazier${t.n}`]) return this.ui.notify('The brazier burns steadily. Meltwater drips somewhere nearby.');
    let how;
    if (p.torchLit) how = 'You hold your flame to the coals.';
    else if (p.spells.includes('flare') && p.magicka >= 9) { p.magicka -= 9; how = 'You spark a Flare into the coals.'; this.audio.play('fireCast', 0.6); }
    else return this.ui.showMessage('Cold Brazier', 'An iron brazier heaped with old coals, rimed white. It would take a flame to wake it: a lit torch (L), or a spell of fire.');
    this.flags[`rimeBrazier${t.n}`] = true;
    this.flags[`rimeIce${t.n}`] = true;
    this.kindleRimeBrazier(c, br);
    const gate = c.meta.iceGates.find((x) => x.n === t.n);
    if (gate) {
      for (let i = 0; i < 4; i++) setTimeout(() => { this.particles.burst(new THREE.Vector3(gate.x, 1 + i * 0.8, gate.z), 'smoke', 10); }, i * 200);
      this.audio.play('splash', 0.6);
    }
    this.applyPersistentState(c);
    this.ui.notify(`${how} The coals catch with a roar, and somewhere ahead a wall of ice groans and slumps into steaming water.`);
    const both = (c.meta.iceGates || []).every((g) => this.flags[`rimeIce${g.n}`]);
    if (both && this.quests.stage('sq_hare4') < 40 && this.quests.stage('sq_hare4') >= 10) this.quests.set('sq_hare4', 40, this.day());
  },
  /** Ice fishing at Erlend's hole: only at night, only with his lure, and only with patience. */
  useIceHole(t) {
    const p = this.player, q = this.quests.stage('sq_hare3');
    const want = q >= 10 && q < 100 && !p.inventory.has('glimmerfin');
    if (!want) return this.ui.showMessage(t.name, t.text);
    if (!p.inventory.has('lucky_lure')) return this.ui.showMessage(t.name, `${t.text}\n\nYou could drop a line here — but Glimmerfins are fussy, and a bare hook won't tempt them. Erlend will have something better.`);
    const hr = ((this.time.hours % 24) + 24) % 24;
    if (hr >= 4 && hr < 20) return this.ui.showMessage(t.name, 'You drop Erlend\'s lure through the ice and wait. And wait. Small dark fish nose at it and drift away. Nothing silver comes.\n\n(Glimmerfins only rise after dark — between eight in the evening and four in the morning.)');
    this.passTime(1);
    if (Math.random() < 0.75 || this.flags.glimmerTries >= 1) {
      this.giveItem('glimmerfin', 1);
      this.audio.play('chime', 0.8);
      this.particles.burst(t.pos.clone().setY(t.pos.y + 0.3), 'sparkle', 20);
      return this.ui.showMessage(t.name, 'An hour passes. The cold climbs up through your boots and settles in. Then, far down in the black water, a light — a little silver flame, rising. It circles the lure twice, considering, and takes it.\n\nYou draw up a Glimmerfin, bright as a new septim, cupped in your hands. It looks at you with a round, unbothered eye, and does not seem to mind the air at all.');
    }
    this.flags.glimmerTries = (this.flags.glimmerTries || 0) + 1;
    return this.ui.showMessage(t.name, 'An hour passes. Once, deep down, you see a flicker of silver — but it turns away from the lure. Patience. Try again.');
  },
  /** The Grandfather Fir's lightning-split branch. The wolves under its roots don't like visitors. */
  useHeartwood(t) {
    const q = this.quests.stage('sq_hare3');
    if (q < 10 || q >= 100) return this.ui.showMessage(t.name, 'A great branch the Grandfather Fir threw down in a storm long ago, half buried in snow. The wood at the split is red as a fox and smells of resin. You have no reason to take any.');
    this.flags.heartwoodTaken = true;
    t.disabled = true;
    this.giveItem('fir_heartwood', 1);
    this.audio.play('swingHeavy', 0.7);
    this.ui.showMessage(t.name, 'You work a spar of heartwood loose from the split. It comes away clean, red and fragrant, warm in your hand as if it had been lying in the sun.\n\nBehind you, under the roots of the Grandfather Fir, something growls.');
    const p = this.player.pos;
    for (let i = 0; i < 2; i++) {
      const a = Math.random() * Math.PI * 2;
      const w = this.spawnCreature(this.cell, i ? 'timber_wolf' : 'wolf', p.x + Math.cos(a) * 11, 0, p.z + Math.sin(a) * 11);
      w.setTarget(this.player);
    }
  },
  cassiusRelents(npc) {
    this.flags.cassiusSpared = true;
    if (this.quests.stage('sq_hare4') < 70) this.quests.set('sq_hare4', 70, this.day());
    const cg = this.cell.meta?.cage;
    if (cg) {
      cg.frost.material.opacity = 0.2;
      cg.frost.material.emissiveIntensity = 0.1;
      this.particles.burst(new THREE.Vector3(cg.x, 1.2, cg.z), 'magic', 30, 0xbfe0ff);
    }
    this.giveItem('frostward_ring', 1);
    npc.home = npc.pos.clone().add(new THREE.Vector3(2.2, 0, -1.5));
    this.audio.play('chime', 0.6);
    this.ui.showMessage('Cassius Frey', 'The old Battlemage lifts his hand from the cage, and the frost on the bars softens into dew. He pulls a ring of pale silver from his finger and presses it on you.\n\n"Take it. I wore it at Kvatch. I find I don\'t want to look at it any more." He steps back. "Open the cage. I can\'t. I don\'t think she would come to me. I would not, in her place."');
  },
  cassiusFights(npc) {
    npc.faction = 'monster';
    npc.hostileToPlayer = true;
    npc.def.stationary = false;
    npc.setTarget(this.player);
    this.audio.play('frostCast', 0.8);
  },
  /** The cage opens: the hare looks at you, and goes up through the roof like a star going the wrong way. */
  freeHare() {
    const c = this.cell, cg = c.meta.cage;
    const cas = c.actors.find((a) => a.uid === 'cassius' && !a.dead);
    if (this.flags.hareFreed) return this.ui.notify('The cage is empty, and the frost inside it has melted.');
    if (cas && !this.flags.cassiusSpared) return this.ui.showMessage('The Frost Cage', 'The frost around the cage is hard as iron and humming with Cassius Frey\'s will. While he holds it, it will not open.');
    this.flags.hareFreed = true;
    this.audio.play('hitMetal', 0.8);
    this.audio.play('chime', 1);
    cg.lid.position.y = 3.2;
    cg.frost.visible = false;
    this.particles.burst(new THREE.Vector3(cg.x, 1.0, cg.z), 'magic', 60, 0xd8eeff);
    const fur = cg.hare.userData.fur;
    const start = cg.hare.position.y;
    this.magic.add(null, 5.5, (e, dt, k) => {
      fur.emissiveIntensity = 0.3 + k * 2.4;
      if (k < 0.35) cg.hare.position.y = start + Math.abs(Math.sin(k * 30)) * 0.25;
      else cg.hare.position.y = start + (k - 0.35) ** 2 * 40;
      cg.hare.rotation.y += dt * (k > 0.35 ? 6 : 0.4);
      if (Math.random() < 0.7) this.particles.burst(new THREE.Vector3(cg.x, cg.hare.position.y + 0.3, cg.z), 'sparkle', 2);
      cg.light.intensity = 14 + k * 30;
    });
    setTimeout(() => {
      cg.hare.visible = false;
      cg.light.on = false;
      this.quests.set('sq_hare4', 100, this.day());
      this.quests.set('sq_hare5', 10, this.day());
      if (this.flags.cassiusSpared) { this.flags.cassiusLeft = true; this.flags.cassiusHome = true; }
      this.ui.showMessage('The White Hare', 'For a long moment the hare sits in the open cage and looks at you, nose working, ears turning. Then she begins to glow — softly, then brightly, then too brightly to look at — and with one enormous bound she goes straight up through the roof of the Rime Spire without breaking a single stone, a streak of white light climbing into the sky like a star going the wrong way.\n\nThe tower goes quiet. Far below, for the first time in nine days, the snow over Wintersmeet stops falling.' + (this.flags.cassiusSpared ? '\n\nCassius Frey lets out a long breath. "I will go down to the village," he says. "I owe them an apology. And a very great deal of firewood."' : ''));
      if (this.flags.cassiusSpared && cas) setTimeout(() => this.removeActor(cas), 1500);
    }, 5400);
  },
  /** Kynareth's wind around the Rime Spire: it throws you back, unless you carry the charm. Every frame. */
  updateWhiteHareFx(dt) {
    const c = this.cell;
    if (c?.rimeFires) for (const f of c.rimeFires) f.userData.uniforms.uTime.value = this.clockT;
    if (c?.id !== 'world') return;
    const st = c.state.whiteHare;
    if (!st) return;
    for (const m of st.windWall.userData.mats) m.uniforms.uTime.value = this.clockT;
    if (this.flags.windCalmed || !st.windWall.visible) return;
    const S = st.spire, p = this.player;
    const dx = p.pos.x - S.x, dz = p.pos.z - S.z, d = Math.hypot(dx, dz);
    if (d < 40 && Math.random() < 0.9) {
      // snow whirling round the tower
      for (let i = 0; i < 3; i++) {
        const a = Math.random() * Math.PI * 2, rr = 13 + Math.random() * 3;
        this.particles.emit({ x: S.x + Math.cos(a) * rr, y: S.h0 + Math.random() * 18, z: S.z + Math.sin(a) * rr, vx: -Math.sin(a) * 14, vy: (Math.random() - 0.5) * 2, vz: Math.cos(a) * 14, drag: 0.3, life: 1.4, size: 0.12, color: _whiteFlake }, false);
      }
    }
    if (d > 16.5) return;
    if (p.inventory.has('wind_charm')) {
      this.flags.windCalmed = true;
      this.applyPersistentState(c);
      const w = st.windWall;
      this.magic.add(null, 3, (e, dt2, k) => { w.scale.set(1 + k * 0.6, 1 - k, 1 + k * 0.6); if (k >= 0.99) this.applyWhiteHareWorld(); });
      this.audio.play('chime', 1);
      if (this.quests.stage('sq_hare4') >= 10 && this.quests.stage('sq_hare4') < 20) this.quests.set('sq_hare4', 20, this.day());
      this.ui.showMessage('Kynareth\'s Wind-Charm', 'As you step into the wall of wind the charm at your throat begins to sing — one clear, high note, like a finger round the rim of a glass. The wind hears it. It does not stop; it simply goes round you, the way a river goes round a stone, and then, as if remembering something, it loosens, and slows, and drifts away down the mountain as an ordinary breeze.\n\nThe door of the Rime Spire stands in front of you.');
      return;
    }
    // hurled back down the slope
    const nx = dx / (d || 1), nz = dz / (d || 1);
    p.pos.x = S.x + nx * 18; p.pos.z = S.z + nz * 18;
    p.vel?.set(nx * 9, 4, nz * 9);
    p.shake?.(0.4);
    if ((this._windMsgT || 0) < this.clockT) {
      this._windMsgT = this.clockT + 6;
      this.audio.play('roar', 0.35);
      this.ui.notify('A howling wall of wind throws you back down the slope!');
      if (this.quests.stage('sq_hare2') === 30) this.quests.set('sq_hare2', 40, this.day());
    }
  },
  /** Quest beats of the White Hare. Runs four times a second. */
  tickWhiteHare() {
    const q = this.quests, p = this.player, c = this.cell, d = this.day();
    if (c.id === 'rime_spire') {
      const cas = c.actors.find((a) => a.uid === 'cassius' && !a.dead);
      if (cas && q.stage('sq_hare4') === 40 && cas.pos.distanceTo(p.pos) < 12) {
        q.set('sq_hare4', 50, d);
        cas.say('So the charm worked. Come no closer, please. I would very much rather not hurt you.', true);
      }
      if (cas && cas.hostileToPlayer && !cas.summoned && cas.health < cas.maxHealth * 0.5) {
        cas.summoned = true;
        cas.say('Rise, cold ones! Hold the stair!', true);
        this.audio.play('conjure', 0.7);
        for (let i = 0; i < 2; i++) {
          const a = cas.spawnAng = (cas.spawnAng || 0) + 2.4;
          const at = cas.pos.clone().add(new THREE.Vector3(Math.cos(a) * 2.5, 0, Math.sin(a) * 2.5));
          this.particles.burst(at.clone().setY(1), 'magic', 25, 0xbfe0ff);
          this.spawnCreature(c, 'frost_atronach', at.x, 0, at.z).setTarget(p);
        }
      }
      return;
    }
    if (c.id !== 'world') return;
    const near = (L, r) => Math.hypot(p.pos.x - L.x, p.pos.z - L.z) < r;
    if (q.stage('sq_hare1') === 20 && near(LOCATIONS.skyward_shrine, 14)) q.set('sq_hare1', 30, d);
    if (q.stage('sq_hare2') === 10 && near(LOCATIONS.varns_camp, 22)) q.set('sq_hare2', 20, d);
    // the Lightwatch begins when you come to the fir between seven and eleven
    const hr = ((this.time.hours % 24) + 24) % 24;
    if (q.stage('sq_hare5') === 20 && !this.lightwatch && hr >= 19 && hr < 23 && near({ x: LOCATIONS.wintersmeet.x, z: LOCATIONS.wintersmeet.z + 1 }, 14)) this.startLightwatch();
    if (this.lightwatch) this.tickLightwatch();
    // afterwards the villagers drift home once you've gone
    if (this.flags.lightwatchDone && this._festActors && !near(LOCATIONS.wintersmeet, 80)) this.endLightwatchCrowd();
  },
  // ---- the Lightwatch
  startLightwatch() {
    const c = this.cell, W = LOCATIONS.wintersmeet;
    const T = new THREE.Vector3(W.x, 0, W.z + 1);
    const crowd = [];
    const place = (a, i) => {
      const ang = (i / 7) * Math.PI * 2 + 0.6;
      const x = T.x + Math.cos(ang) * 4.3, z = T.z + Math.sin(ang) * 4.3;
      a.def.stationary = true; a.def.wander = 0;
      a.home = new THREE.Vector3(x, c.collision.groundHeight(x, z, 500), z);
      a.pos.copy(a.home);
      a.homeYaw = Math.atan2(T.x - x, T.z - z);
      a.yaw = a.homeYaw;
      a.noFacePlayer = true;
      crowd.push(a);
    };
    const fest = [];
    for (const id of ['sigrun', 'erlend', ...(this.flags.cassiusSpared ? ['cassius_home'] : [])]) {
      const npc = NPCS.find((n) => n.id === id);
      const a = this.spawnNpc(c, { ...npc, id: id + '_fest', cell: 'world', spawnIf: undefined }, T.x, 0, T.z);
      if (a) { a.def.dialogue = npc.dialogue; fest.push(a); }
    }
    const locals = ['gunnar', 'matilde', 'brynja'].map((u) => c.actors.find((a) => a.uid === u && !a.dead)).filter(Boolean);
    [...fest, ...locals].forEach(place);
    this._festActors = { fest, locals };
    const by = (u) => c.actors.find((a) => a.uid === u);
    const say = (u, txt) => by(u)?.say(txt, true);
    const steps = [
      [0.5, () => say('sigrun_fest', 'Is everyone here? Erlend, put that down. Gunnar — Gunnar, is that a ROCKET?')],
      [5, () => say('gunnar', '...Maybe.')],
      [8, () => say('sigrun_fest', 'Friends! Nine days ago the snow came, and she didn\'t. Tonight, thanks to our guest, the sky is clear. So we keep the Lightwatch, the way our grandmothers kept it.')],
      [15, () => { say('matilde', 'Sweetrolls for everyone! Don\'t push. Erlend, I said DON\'T PUSH!'); this.giveItem('sweetroll', 2); }],
      [20, () => say('erlend_fest', 'I\'m not pushing. I\'m standing enthusiastically.')],
      ...(this.flags.cassiusSpared ? [[24, () => say('cassius_home_fest', 'I... owe this village an apology. And a great deal of firewood.')], [28, () => say('gunnar', 'Yes.')]] : []),
      [31, () => { say('brynja', 'Quiet now. Quiet. Lights.'); this.releaseSkyLanterns(T); }],
      [35, () => say('brynja', 'Lady of the high air, who shakes the white from your sleeves, who sends the hare down the mountain before the first flake falls...')],
      [41, () => say('brynja', '...we have swept the step, we have banked the fire, we have lit the lamp.')],
      [46, () => say('sigrun_fest', 'Let her find the way. Let her find the way home.')],
      [51, () => { say('gunnar', 'Now?'); }],
      [53, () => { say('sigrun_fest', 'NOW, Gunnar.'); this.lightwatchFireworks(T); }],
      [61, () => { say('matilde', 'Look! LOOK — the roof!'); this.hareComesHome(); }],
      [66, () => say('brynja', 'Light the way home.')],
      [70, () => this.finishLightwatch()],
    ];
    this.lightwatch = { start: this.clockT, steps, i: 0 };
    this.audio.setMusic('none');
    this.ui.notify('The Lightwatch begins.');
  },
  tickLightwatch() {
    const L = this.lightwatch;
    const t = this.clockT - L.start;
    while (L.i < L.steps.length && L.steps[L.i][0] <= t) L.steps[L.i++][1]();
    if (L.i >= L.steps.length) this.lightwatch = null;
  },
  releaseSkyLanterns(T) {
    for (let i = 0; i < 9; i++) {
      const g = new THREE.Group();
      const paper = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.13, 0.36, 8, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.25, 0.45), side: THREE.DoubleSide }));
      g.add(paper);
      const a = (i / 9) * Math.PI * 2;
      const x0 = T.x + Math.cos(a) * 4.5, z0 = T.z + Math.sin(a) * 4.5;
      const y0 = this.cell.collision.groundHeight(x0, z0, 500) + 1.4;
      g.position.set(x0, y0, z0);
      const drift = new THREE.Vector3(0.35 + Math.random() * 0.4, 0, (Math.random() - 0.5) * 0.4);
      const delay = i * 0.35;
      this.magic.add(g, 34, (e, dt, k) => {
        if (e.t < delay) return;
        g.position.y += dt * (0.9 + 0.2 * Math.sin(e.t + i));
        g.position.addScaledVector(drift, dt);
        g.rotation.y += dt * 0.3;
        paper.material.color.setRGB(2.2 * (1 - k * 0.6), 1.25 * (1 - k * 0.6), 0.45 * (1 - k * 0.6));
      });
    }
    this.audio.play('chime', 0.5);
  },
  lightwatchFireworks(T) {
    const at = { pos: new THREE.Vector3(T.x, this.cell.collision.groundHeight(T.x, T.z, 500) + 2, T.z) };
    this.spellbook.fireworks(at, {});
    setTimeout(() => this.spellbook.fireworks(at, {}), 2600);
  },
  hareComesHome() {
    const st = this.cells.world?.state.whiteHare;
    if (!st) return;
    this.flags.hareOnRoof = true;
    this.applyWhiteHareWorld();
    const h = st.roofHare;
    const s0 = h.scale.x;
    this.magic.add(null, 1.4, (e, dt, k) => { h.scale.setScalar(s0 * Math.min(1, k * 1.6) || 0.001); });
    this.particles.burst(h.position.clone().setY(h.position.y + 0.3), 'sparkle', 40);
    this.audio.play('chime', 1);
    this.audio.play('heal', 0.5);
  },
  finishLightwatch() {
    this.flags.lightwatchDone = true;
    this.giveItem('first_snow_mantle', 1);
    this.giveItem('gold', 300);
    this.quests.set('sq_hare5', 100, this.day());
    this.audio.setMusic(this.cell.music);
    this.ui.showMessage('Lightwatch', 'When the last rocket has faded, Sigrun puts something into your hands: a little silver hare on a chain of braided white wool.\n\n"The Mantle of the First Snow," she says. "Brynja\'s grandmother made the first one. We give it to whoever brings her home, and nobody has had to, not once in two hundred years, until you."\n\nOn the ridge of the Snow Hare\'s roof, a small white hare sits in the moonlight with her ears up, looking down the north road as if she had never been away.');
  },
  endLightwatchCrowd() {
    const F = this._festActors;
    this._festActors = null;
    for (const a of F.fest) this.removeActor(a);
    for (const a of F.locals) {
      const npc = NPCS.find((n) => n.id === a.uid);
      a.def.stationary = !!npc.stationary; a.def.wander = npc.wander;
      a.home = new THREE.Vector3(npc.x, this.cell.collision.groundHeight(npc.x, npc.z, 500), npc.z);
      a.pos.copy(a.home);
      a.noFacePlayer = false;
    }
  },

  // ----------------------------------------------------------------- A Crown of Starflowers
  countStarflowers() {
    const st = this.quests.stage('sq_pup');
    if (st === 10 && this.player.inventory.count('starflower') >= 10) this.quests.set('sq_pup', 20, this.day());
    else if (st === 10 && this.player.inventory.count('starflower') > 0) this.ui.notify(`Starflowers: ${this.player.inventory.count('starflower')} of 10`);
  },
  makeDog(x, y, z) {
    const d = new Actor('dog', x, y, z, { uid: 'dog' });
    d.name = this.flags.dogName || 'Dog';
    d.following = !this.flags.dogStaying;
    if (this.flags.dogStaying) d.def.wander = 4;
    this.addCrown(d);
    return d;
  },
  /** The ring of starflowers round your dog's neck. */
  addCrown(d) {
    const head = d.rig?.head || d.rig?.neck;
    const g = new THREE.Group();
    const petal = new THREE.MeshStandardMaterial({ color: 0xbcd4ff, emissive: 0x6a8ad8, emissiveIntensity: 0.6, roughness: 0.6 });
    const heart = new THREE.MeshStandardMaterial({ color: 0xf0c040, emissive: 0xa07010, emissiveIntensity: 0.4 });
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), i % 2 ? heart : petal);
      f.position.set(Math.cos(a) * 0.13, 0, Math.sin(a) * 0.13);
      g.add(f);
    }
    if (head) { g.position.set(0, -0.05, -0.05); head.add(g); } else { g.position.set(0, 0.62, 0.35); d.group.add(g); }
  },
  /** The pup gets its crown, and a name. */
  adoptPuppy() {
    const names = ['Biscuit', 'Bramble', 'Pip', 'Sir Woofington'];
    const finish = (name) => {
      this.flags.dogName = name;
      this.flags.dogAdopted = true;
      this.flags.dogFollowing = true;
      this.flags.dogStaying = false;
      const pup = this.cell.actors.find((a) => a.uid === 'pup_2' || a.uid?.startsWith('pup_'));
      const at = pup ? pup.pos.clone() : this.player.pos.clone().add(new THREE.Vector3(1.5, 0, 1.5));
      if (pup) this.removeActor(pup);
      const d = this.makeDog(at.x, at.y, at.z);
      d.def.body = { ...d.def.body };
      d.group.scale.setScalar(0.7); // still a pup; grows into a dog over the next few days
      this.flags.dogBornDay = this.day();
      this.addActor(d);
      this.particles.burst(d.center(), 'magic', 30, 0xbcd4ff);
      this.particles.burst(d.center(), 'heal', 20, 0xffc0d0);
      this.audio.play('chime', 0.9);
      this.quests.set('sq_pup', 100, this.day());
      this.ui.showMessage(name, `"${name}," says Hob, trying it out. The pup sneezes, which Hob takes as approval.

"There. ${name}, this is your person. Person, this is ${name}. Be good to each other." He scratches the pup behind the ears one last time, and Honey licks its face all over, and then ${name} trots to your side and sits on your foot as if it has always belonged there.

(${name} will follow you and fight beside you. Pet ${name} with E to tell them to stay or come along.)`);
    };
    this.ui.showChoice('Name the pup', 'The pup looks up at you with the crown of starflowers slightly crooked over one ear. What will you call them?', names.map((n) => ({ label: n, fn: () => finish(n) })));
  },
  petAnimal(a) {
    const at = a.center();
    for (let i = 0; i < 5; i++) this.particles.emit({ x: at.x + (Math.random() - 0.5) * 0.4, y: at.y + 0.3, z: at.z + (Math.random() - 0.5) * 0.4, vx: (Math.random() - 0.5) * 0.4, vy: 0.9 + Math.random() * 0.5, vz: (Math.random() - 0.5) * 0.4, life: 1.2, size: 0.22, color: new THREE.Color(1, 0.45, 0.6), shape: 'star' });
    a.yaw = Math.atan2(this.player.pos.x - a.pos.x, this.player.pos.z - a.pos.z);
    this.audio.play('chime', 0.25);
    if (a.uid !== 'dog') return this.ui.notify(a.def.tplId === 'puppy' ? 'The puppy wriggles with delight and tries to eat your sleeve.' : `${a.name} thumps her tail against the grass.`);
    const name = this.flags.dogName || 'your dog';
    const lines = [`${name} leans into your hand and sighs happily.`, `${name} rolls over for a belly rub. You oblige.`, `${name} licks your hand, then your face, then, with great enthusiasm, your boot.`];
    this.ui.showChoice(name, lines[Math.floor(Math.random() * lines.length)], [
      a.following ? { label: 'Stay here', fn: () => { a.following = false; a.def.wander = 4; a.home = a.pos.clone(); this.flags.dogStaying = true; this.flags.dogFollowing = false; this.flags.dogStayCell = this.cell.id; this.ui.notify(`${name} sits and waits, tail swishing.`); } }
        : { label: 'Come along', fn: () => { a.following = true; a.def.wander = 0; this.flags.dogStaying = false; this.flags.dogFollowing = true; this.ui.notify(`${name} bounds to your side.`); } },
      { label: 'Good dog' },
    ]);
  },
  /** Your dog keeps up with you, grows up, and doesn't wander back to where it was born. */
  tickDog() {
    const d = this.cell.actors.find((a) => a.uid === 'dog' && !a.dead);
    if (!d) return;
    if (d.following && !d.target) d.home.copy(this.player.pos);
    // knocked down, never killed: a good dog gets back up
    if (d.health < d.maxHealth) d.health = Math.min(d.maxHealth, d.health + d.maxHealth * 0.006);
    if (this.flags.dogStaying) this.flags.dogStayPos = d.pos.toArray();
    const days = this.day() - (this.flags.dogBornDay ?? this.day() - 9);
    d.group.scale.setScalar(Math.min(1, 0.7 + days * 0.1));
    if (d.following && !d.target && Math.random() < 0.004) this.playAt('growl', d.pos, 0.15);
  },

  // ----------------------------------------------------------------- Ten White Rabbits
  /** A neutral band (Snikkit, the Frostfang) turns on you as one. */
  provokeBand(actor) {
    const band = actor.def.band;
    if (band === 'frostfang') this.flags.frostfangHostile = true;
    for (const a of this.cell.actors) {
      if (a.dead || (a !== actor && (!band || a.def.band !== band))) continue;
      a.hostileToPlayer = true;
      if (a.pos.distanceTo(this.player.pos) < 45) a.setTarget(this.player);
    }
    if (band === 'snikkit' && this.quests.stage('sq_bunnies') < 20 && !this.flags.rabbitsFreed) this.quests.set('sq_bunnies', 20, this.day());
  },
  /** The cage: open it with Snikkit's blessing, with his key, or with a lockpick behind his back. */
  useRabbitCage(t) {
    if (this.flags.rabbitsFreed) return this.ui.showMessage(t.name, 'The cage stands open and empty. A few white hairs are caught on the bars.');
    const sn = this.cell.actors.find((a) => a.uid === 'snikkit' && !a.dead);
    const st = this.quests.stage('sq_bunnies');
    if (sn && (st === 50 || st === 55)) return this.ui.showMessage(t.name, 'Snikkit should be the one to open it. Talk to him.');
    if (t.lock && !this.player.inventory.has('snikkit_key')) {
      return this.ui.openLockpick(t, () => {
        // caught in the act
        if (sn && !sn.hostileToPlayer) { sn.say('MY RABBITS! THIEF! THIEF!', true); this.provokeBand(sn); }
        this.releaseRabbits(sn ? 'stolen' : 'force');
      });
    }
    if (t.lock) { this.ui.notify('You unlock the cage with Snikkit\'s key.'); this.unlockInteractable(t); }
    if (sn && !sn.hostileToPlayer && st < 50) { sn.say('MY RABBITS! THIEF!', true); this.provokeBand(sn); }
    this.releaseRabbits(sn && !sn.hostileToPlayer ? 'blessing' : 'force');
  },
  /** The door swings open and ten white rabbits bound off into the snow. */
  releaseRabbits(how) {
    if (this.flags.rabbitsFreed) return;
    const st = this.cells.world.state.rabbits;
    const c = st.cage;
    this.flags.rabbitsFreed = true;
    this.flags.rabbitsHow = how;
    if (st.cageIt) { st.cageIt.lock = null; this.unlocked.snikkit_cage = true; }
    this.audio.play('unlock', 0.8);
    c.door.rotation.y = -1.6;
    c.door.position.x += 0.3;
    const sn = this.cell.actors.find((a) => a.uid === 'snikkit' && !a.dead);
    const names = ['Fluff', 'Other Fluff', 'Snowball', 'Lord Thumpington', 'Dave', 'Nibbles', 'Big Ears', 'Small Ears', 'Crumpet', 'Moonpie'];
    c.bunnies.forEach((m, i) => setTimeout(() => {
      m.visible = false;
      const wp = m.getWorldPosition(new THREE.Vector3());
      const a = (i / 10) * Math.PI * 2 + Math.random() * 0.4;
      const r = this.spawnCreature(this.cell, 'snow_rabbit', wp.x, wp.y, wp.z, { uid: 'freed_rabbit_' + i, yaw: a });
      r.name = names[i];
      r.def = { ...r.def, wander: 30 };
      r.home = new THREE.Vector3(wp.x + Math.cos(a) * 18, wp.y, wp.z + Math.sin(a) * 18);
      r.wanderGoal = r.home.clone();
      this.particles.burst(wp.clone().setY(wp.y + 0.3), 'magic', 6, 0xffffff);
      for (let k = 0; k < 6; k++) this.particles.emit({ x: wp.x, y: wp.y + 0.1, z: wp.z, vx: (Math.random() - 0.5) * 2, vy: 1 + Math.random(), vz: (Math.random() - 0.5) * 2, gravity: 4, life: 0.8, size: 0.18, color: _whiteFlake, shape: 'flake' });
      if (sn && how === 'blessing') sn.say(['Goodbye, Fluff!', 'Goodbye, Other Fluff! You were always the other one!', 'Snowball, no biting!', 'Farewell, Lord Thumpington. Stamp at many things.', 'Bye, Dave.', 'Nibbles, that is a tree, do not eat — oh.', 'Big Ears! Small Ears! Stay together!', '', 'Crumpet, you are round and perfect.', 'Moonpie... *sniff*... Moonpie, be good.'][i] || 'Goodbye!', true);
    }, 400 + i * (how === 'blessing' ? 1600 : 320)));
    const after = 400 + 10 * (how === 'blessing' ? 1600 : 320) + 600;
    setTimeout(() => {
      if (how === 'blessing') {
        this.quests.set('sq_bunnies', 100, this.day());
        this.giveItem('snikkit_stone', 1);
        this.giveItem('gold', 60);
        this.ui.showMessage('Ten White Rabbits', 'When the last of them — little Moonpie — has gone bounding off into the white, Snikkit sits down in the snow beside the empty cage and blows his nose for a long time.\n\n"Snikkit is going to be a rabbit-watcher now," he announces. "Not a catcher. A watcher. It is a much better job." He fishes something out of his mouth and presses it into your hand: a smooth white pebble with a hole through it, threaded on wire, and still warm. "Snikkit\'s lucky stone. And sixty shinies the Chief does not know Snikkit has. You are a very good clever-person."\n\nAcross the snowy hills, white rabbits will be everywhere by spring.');
      } else {
        this.quests.set('sq_bunnies', 110, this.day());
        this.ui.notify('The rabbits scatter into the snow. White rabbits will live all through the snowy hills now.');
      }
    }, after);
  },
  /** Chief Gorbag eats the Mock Rabbit Pie. */
  gorbagFeast(g) {
    const lines = [
      [0.3, 'g', '...'],
      [2.2, 'g', 'Is... RABBIT!'],
      [4.2, 'g', 'Best rabbit! Most rabbit! Gorbag never taste so much rabbit!'],
      [7.0, 'x', 'RAB-BIT! RAB-BIT! RAB-BIT!'],
      [9.6, 'g', 'Snikkit is forgiven! Snikkit is not stew! Snikkit is... ASSISTANT STEW-FINDER!'],
      [12.8, 'g', 'Tell Snikkit: come home for Moonfeast. Bring more of this "rabbit".'],
    ];
    const band = this.cell.actors.filter((a) => a.def.band === 'frostfang' && !a.dead && a !== g);
    lines.forEach(([t, who, txt]) => setTimeout(() => {
      if (who === 'g') g.say(txt, true);
      else band.forEach((a, i) => setTimeout(() => a.say(txt, true), i * 200));
      if (txt.startsWith('Is')) { this.particles.burst(g.center().setY(g.pos.y + 1.6), 'magic', 20, 0xffd060); this.audio.play('chime', 0.6); }
    }, t * 1000));
    setTimeout(() => {
      this.quests.set('sq_bunnies', 50, this.day());
      this.flags.gorbagFed = true;
    }, 13500);
  },
  applyRabbitWorld() {
    const cg = this.cells.world?.state.rabbits?.cage;
    if (!cg || !this.flags.rabbitsFreed) return;
    for (const m of cg.bunnies) m.visible = false;
    if (cg.door.rotation.y === 0) { cg.door.rotation.y = -1.6; cg.door.position.x += 0.3; }
  },
  tickBunnies() {
    const q = this.quests, p = this.player, c = this.cell;
    if (c.id !== 'world') return;
    const st = q.stage('sq_bunnies');
    const D = LOCATIONS.snikkits_den;
    if (st < 10 && !this.flags.rabbitsFreed && Math.hypot(p.pos.x - D.x, p.pos.z - D.z) < 22) q.set('sq_bunnies', 10, this.day());
    // the caged rabbits twitch and shuffle
    const cg = c.state.rabbits?.cage;
    if (cg && !this.flags.rabbitsFreed && Math.hypot(p.pos.x - cg.x, p.pos.z - cg.z) < 60) {
      const t = this.clockT;
      for (const m of cg.bunnies) {
        const k = (t + m.userData.phase * 3) % 4;
        m.position.y = 0.12 + (k < 0.3 ? Math.sin(k / 0.3 * Math.PI) * 0.12 : 0);
        m.rotation.y += k > 2 && k < 2.1 ? 0.05 : 0;
      }
    }
  },

  /** Drawing a legendary sword from its stone, or lifting an armour set off its stand. */
  takeLegend(t, ids) {
    this.taken[t.id] = true;
    this.applyPersistentState(this.cell);
    for (const id of ids) this.giveItem(id, 1, true);
    const at = t.pos.clone();
    const color = t.light?.color?.getHex?.() ?? 0xffffff;
    this.magic.glint(at, color, 3.5, 0.9, 1);
    this.particles.burst(at, 'magic', 60, color);
    this.audio.play('chime', 1);
    this.audio.play('conjure', 0.5);
    const first = ITEMS[ids[0]];
    if (t.kind === 'legendsword') this.ui.showMessage(first.name, `You close your hand round the grip and draw ${first.name} from the stone. The column of light above the pedestal thins, and goes out.\n\n${first.desc}\n\n(Damage ${first.damage}${first.elementDamage ? `, +${first.elementDamage} ${first.element}` : ''}.)`);
    else this.ui.showMessage(t.name, `You lift the ${t.name} piece by piece from its stand: ${ids.map((i) => ITEMS[i].name).join(', ')}.\n\n${first.desc}\n\n(Wear several pieces for the full look; each one carries its own enchantment.)`);
  },

  onPlayerDeath() {
    this.state = 'dead';
    this.input.unlock();
    this.audio.setMusic('none');
    setTimeout(() => this.ui.showDeath(), 1500);
  },
  onQuestStage(q, st) {
    const def = QUESTS[q];
    const done = def.stages[st]?.done;
    this.ui.notify(done ? `Quest completed: ${def.name}` : `Journal updated: ${def.name}`, 'quest');
    this.audio.play('quest', 0.7);
    this.corwynOnStage(q, st);
    this.whOnStage(q, st);
  },

  anyEnemyNear(r) {
    for (const a of this.cell.actors) if (!a.dead && isHostile(a, this.player) && a.pos.distanceTo(this.player.pos) < r) return true;
    return false;
  },
  anyEnemyTargeting() {
    return this.cell.actors.some((a) => !a.dead && a.target === this.player);
  },
  inCombat() {
    return this.cell.actors.some((a) => !a.dead && a.target === this.player && a.pos.distanceTo(this.player.pos) < 40);
  },

  // ----------------------------------------------------------------- activation
  activate() {
    const t = this.interaction.target;
    if (!t) return;
    const p = this.player;
    if (t.isActor) {
      if (t.dead) return this.ui.openContainer({ name: t.name, inventory: t.inventory, actor: t });
      if (t.canTalk()) return this.ui.openDialogue(t);
      if (t.def.pettable) return this.petAnimal(t);
      return;
    }
    switch (t.kind) {
      case 'door': {
        if (t.lock && !(t.lock.key && p.inventory.has(t.lock.key))) return this.ui.openLockpick(t, () => this.activate());
        if (t.locked) return this.ui.showMessage(t.name, t.lockMsg || (t.lockLevel ? `The door is locked tight. ${t.name} is a private residence.` : 'This door is locked.'));
        if (t.cell) {
          this.audio.play('door');
          if (this.cell.id === 'world') this.doorReturns._last = this.exitPointFor(t);
          if (t.exit) {
            if (t.cell === 'world') return this.enterCell('world', this.doorReturns._last);
            if (t.cell === 'oblivion') return this.enterCell('oblivion', this.cells.oblivion?.state.towerDoor);
          }
          if (this.cell.id === 'oblivion' && t.cell === 'sigil') this.oblivionReturn = this.cells.oblivion.state.towerDoor;
          return this.enterCell(t.cell);
        }
        return;
      }
      case 'container': {
        if (t.lock && !(t.lock.key && p.inventory.has(t.lock.key))) return this.ui.openLockpick(t, () => this.activate());
        this.audio.play('chest', 0.7);
        return this.ui.openContainer({ name: t.name, inventory: this.containerInventory(t), owner: t.owner, interact: t });
      }
      case 'gatebars': {
        if (t.lock && t.lock.key && p.inventory.has(t.lock.key)) {
          this.ui.notify(`You unlock the gate with the ${ITEMS[t.lock.key].name}.`);
          this.unlockInteractable(t);
          return;
        }
        if (t.lock) return this.ui.openLockpick(t, () => {});
        return;
      }
      case 'item': {
        const it = ITEMS[t.item.id];
        if (t.owner) this.crime.theft(t.item.id, t.item.count, t.owner);
        t.disabled = true;
        if (t.mesh) t.mesh.visible = false;
        if (t.id) this.taken[t.id] = true;
        this.giveItem(t.item.id, t.item.count, true);
        this.ui.notify(`${it.name} taken.`);
        return;
      }
      case 'altar': return this.useHollowAltar();
      case 'icehole': return this.useIceHole(t);
      case 'heartwood': return this.useHeartwood(t);
      case 'coldbrazier': return this.useColdBrazier(t);
      case 'icegate': return this.ui.showMessage(t.name, 'A wall of blue ice fills the doorway from floor to ceiling, so clear you can see the room beyond, distorted, as if under water. It is far too thick to break. Fire might do it — there was a cold brazier back there.');
      case 'harecage': return this.freeHare();
      case 'rabbitcage': return this.useRabbitCage(t);
      case 'legendsword': return this.takeLegend(t, [t.item]);
      case 'legendarmor': return this.takeLegend(t, t.pieces);
      case 'pedestal': return this.touchPedestal(t);
      case 'sealgate':
        return this.ui.showMessage(t.name, 'Bars of solid light fill the doorway, humming faintly. There is no lock and no keyhole — only three pedestals in the chamber behind you, each crowned with a glyph: a sun, a moon, a star.');
      case 'crystal': return this.examineCrystal(t);
      case 'atlas': return this.examineAtlas(t);
      case 'harvest': {
        t.disabled = true;
        if (t.mesh) t.mesh.visible = false;
        this.harvested[t.id] = this.time.hours;
        const got = Math.random() < 0.85 + (p.ch.skills?.alchemy || 0) / 700;
        if (got) { this.giveItem(t.item, 1, true); this.ui.notify(`${ITEMS[t.item].name} harvested.`); }
        else this.ui.notify('You failed to harvest anything useful.');
        this.audio.play(t.chime ? 'nirnroot' : 'pickup', t.chime ? 0.8 : 0.5);
        return;
      }
      case 'bed': {
        const owned = t.owner && !(t.rentable && this.rentedUntil > this.time.hours);
        if (owned) return this.ui.showMessage('Bed', `This bed belongs to ${t.owner}. You cannot sleep here.`);
        return this.ui.openWait(true);
      }
      case 'shrine': {
        const day = this.day();
        if (this.shrines[t.id] === day) return this.ui.showMessage(t.name, 'You have already received the blessing of this shrine today.');
        this.shrines[t.id] = day;
        p.health = p.maxHealth; p.magicka = p.maxMagicka; p.fatigue = p.maxFatigue;
        p.effects.shield = 10; p.effects.shieldT = 120;
        this.audio.play('heal');
        this.particles.burst(p.pos, 'heal', 40, 0xffd080);
        return this.ui.showMessage(t.name, `You kneel and pray to ${t.deity}. You feel restored, and a divine ward settles about you.`);
      }
      case 'sign':
        return this.ui.showMessage(t.name, t.text);
      case 'gate':
        if (this.flags.gateClosed) return;
        if (this.quests.stage('mq_gate') < 20) {
          if (this.quests.started('mq_gate')) this.quests.set('mq_gate', 20, this.day());
        }
        this.audio.play('portal');
        this.oblivionReturn = null;
        return this.enterCell('oblivion', null, 'You step through the Gate into the Deadlands.').then(() => {
          if (this.quests.started('mq_gate') && this.quests.stage('mq_gate') < 30) this.quests.set('mq_gate', 30, this.day());
        });
      case 'returnportal':
        this.audio.play('portal');
        return this.enterCell('world', this.gateFrontPoint(), 'You return to Tamriel. The Gate still burns behind you.');
      case 'sigil':
        return this.closeGate(t);
    }
  },

  exitPointFor(door) {
    // a point just outside the door, facing away from it
    const ret = this.doorReturns[door.cell];
    const cellPos = door.pos;
    const w = this.cells.world;
    // find the direction away from the nearest collider (the building)
    let best = null;
    for (let a = 0; a < 16; a++) {
      const ang = (a / 16) * Math.PI * 2;
      const x = cellPos.x + Math.sin(ang) * 1.6, z = cellPos.z + Math.cos(ang) * 1.6;
      const pos = new THREE.Vector3(x, w.collision.groundHeight(x, z, 1000), z);
      const before = pos.clone();
      w.collision.resolve(pos, 0.4, 1.7);
      if (pos.distanceTo(before) < 0.01) { best = { x, z, yaw: ang + Math.PI }; break; }
    }
    return best || ret || { x: cellPos.x, z: cellPos.z };
  },

  gateFrontPoint() {
    const f = this.cells.world.state.gateFront;
    return { x: f.x, z: f.z, yaw: f.yaw + Math.PI };
  },

  unlockInteractable(t) {
    t.lock = null;
    if (t.id) this.unlocked[t.id] = true;
    this.audio.play('unlock');
    if (t.kind === 'gatebars') {
      if (t.mesh) t.mesh.visible = false;
      if (t.collider) t.collider.disabled = true;
      t.disabled = true;
    }
  },

  async closeGate(sigil) {
    this.state = 'loading';
    sigil.disabled = true;
    if (sigil.mesh) sigil.mesh.visible = false;
    this.audio.play('gateClose');
    this.ui.whiteFlash();
    this.player.inventory.add('sigil_stone', 1);
    await new Promise((r) => setTimeout(r, 2200));
    this.flags.gateClosed = true;
    this.applyWorldFlags();
    // daedra in the world vanish with the gate
    const w = this.cells.world;
    for (const a of [...w.actors]) if (a.def.daedra && !a.dead) { a.dead = true; a.group.visible = false; }
    for (const sp of w.spawns) if (sp.needsGate) { sp.actors = []; sp.active = false; }
    delete this.cells.sigil;
    this.state = 'playing';
    await this.enterCell('world', this.gateFrontPoint(), 'The Gate collapses in a torrent of fire. You are back in Tamriel.');
    if (this.quests.stage('mq_gate') < 40) this.quests.set('mq_gate', 40, this.day());
    this.player.exercise('mysticism', 0);
  },

  // ----------------------------------------------------------------- time
  passTime(hours, sleeping = false) {
    const p = this.player;
    this.time.hours += hours;
    const k = Math.min(1, hours / 8);
    p.health = Math.min(p.maxHealth, p.health + p.maxHealth * k);
    p.magicka = Math.min(p.maxMagicka, p.magicka + p.maxMagicka * k);
    p.fatigue = p.maxFatigue;
    p.effects.shieldT = Math.max(0, p.effects.shieldT - hours * 120);
    if (sleeping && canLevelUp(p.ch)) {
      this.ui.openLevelUp();
      return;
    }
    this.autosave();
  },

  fastTravel(locId) {
    const dest = FAST_TRAVEL[locId];
    if (!dest) return;
    if (this.cell.interior || this.cell.id === 'oblivion') return this.ui.notify('You cannot fast travel from here.');
    if (this.inCombat()) return this.ui.notify('You cannot fast travel while enemies are nearby.');
    if (this.player.encumbrance() > this.player.carryLimit()) return this.ui.notify('You are overencumbered.');
    const d = Math.hypot(dest.x - this.player.pos.x, dest.z - this.player.pos.z);
    const hours = d / 5 / 3600 * TIMESCALE * 4;
    this.time.hours += hours;
    this.ui.closeMenus();
    this.enterCell('world', dest, `You arrive at ${LOCATIONS[locId].name}. (${Math.max(1, Math.round(hours))} hours passed)`);
  },

  // ----------------------------------------------------------------- main loop
  loop() {
    requestAnimationFrame(this.loop);
    const now = performance.now();
    let dt = Math.min(0.05, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    this.clockT += dt;
    this.fpsAcc += dt; this.fpsN++;
    this.adaptResolution(dt);
    if (this.fpsAcc > 0.5) { this.fps = Math.round(this.fpsN / this.fpsAcc); this.fpsAcc = 0; this.fpsN = 0; }
    const playing = this.state === 'playing';
    if (playing && this.cell) {
      this.time.hours += dt * TIMESCALE / 3600;
      this.player.update(dt, this.input);
      if (this.input.wasPressed('KeyE')) this.activate();
      this.updateActors(dt);
      this.projectiles.update(dt);
      this.updateSpawns();
      this.updateDiscovery();
      this._qtT = (this._qtT || 0) - dt;
      if (this._qtT <= 0) { this._qtT = 0.25; this.updateQuestTriggers(); }
      this.updateMusic();
      // lava
      if (this.cell.lava !== undefined && this.player.pos.y < this.cell.lava + 0.4 && !this.player.dead) {
        this.player.health -= dt * 35;
        this.player.hurtFlash = Math.min(1, this.player.hurtFlash + dt * 2);
        if (Math.random() < dt * 4) this.audio.play('hurt', 0.5);
        if (this.player.health <= 0) { this.player.health = 0; this.player.die(); }
      }
      if (this.player.summon?.dead) this.player.summon = null;
      // hotkeys
      for (let i = 1; i <= 8; i++) if (this.input.wasPressed('Digit' + i)) this.useHotkey(i);
      this.interaction.update();
    } else if (this.cell && (this.state === 'dialogue' || this.state === 'menu')) {
      // keep the world animating lightly behind dialogue
      for (const a of this.cell.actors) if (a.pos.distanceTo(this.player.pos) < 30) a.update(0);
    }
    if (this.cell && this.state !== 'title') {
      this.updateEnvironment(dt);
      this.particles.update(dt);
      this.magic.update(dt);
      this.spellbook.update(dt);
      this.updateEmitters(dt);
      for (const o of this.cell.spin) o.rotation.y += dt * 0.8;
      this.player.updateCamera(this.camera, dt);
      this.viewmodel.update(dt, this.camera);
      this.updateTorch(dt);
      this.updateGhostLantern();
      this.updateWhiteHareFx(dt);
      this.updateBlades(dt);
      if (this.cell.id === 'world') updateLegendary(this.cell.state.legendary, this.clockT);
    }
    if (this.state === 'title' && this.titleCam) this.titleCam(dt);
    this.ui.update(dt);
    this.input.endFrame();
    this.render();
  },

  render() {
    this.renderer.clear();
    // world matrices once per frame (the reflection and shadow passes reuse them)
    this.scene.updateMatrixWorld();
    if (this.cell || this.state === 'title') {
      this.composer.render();
      if (this.cell && this.state === 'playing') this.viewmodel.render(this.renderer);
    }
  },

  useHotkey(i) {
    const hk = this.player.hotkeys[i];
    if (!hk) return;
    if (hk.spell) { if (this.player.spells.includes(hk.spell)) { this.player.selectedSpell = hk.spell; this.ui.notify(`${hk.name} selected.`); } }
    else if (hk.item && this.player.inventory.has(hk.item)) this.player.use(hk.item);
  },

  updateActors(dt) {
    const pp = this.player.pos;
    for (const a of [...this.cell.actors]) {
      const d = Math.abs(a.pos.x - pp.x) + Math.abs(a.pos.z - pp.z);
      if (d > 260) { a.group.visible = false; continue; }
      a.hiddenNow = !a.dead && (a.def.activeHours || a.def.activeQuest) ? !this.npcActive(a) : false;
      if (a.hiddenNow) { a.group.visible = false; continue; }
      if (!a.def.ghostly || !a.dead) a.group.visible = true;
      if (d > 160) continue;
      a.update(dt);
    }
    // guards forgive when bounty clears; guards yield to sheathed players
    if (this.crime.resisting && !this.player.weaponOut) {
      for (const a of this.cell.actors) {
        if (a.def.ai === 'guard' && !a.dead && a.pos.distanceTo(pp) < 3) {
          this.crime.resisting = false;
          a.setTarget(null);
          this.crime.arrest(a);
          break;
        }
      }
    }
  },

  updateSpawns() {
    const c = this.cell;
    if (!c.spawns.length) return;
    const pp = this.player.pos;
    const night = this.sky.night > 0.5;
    for (const sp of c.spawns) {
      const d = Math.hypot(sp.x - pp.x, sp.z - pp.z);
      if (!sp.active && d < 140 && d > 25) {
        if (sp.respawnAt > this.time.hours) continue;
        if (sp.needsGate && this.flags.gateClosed) continue;
        if (sp.nightOnly && !night) continue;
        if (sp.needsFlag && !this.flags[sp.needsFlag]) continue;
        if (sp.needsNoFlag && this.flags[sp.needsNoFlag]) continue;
        if (sp.unique && this.flags.killed[sp.unique]) continue;
        sp.active = true;
        sp.actors = [];
        for (let i = 0; i < sp.count; i++) {
          const a = Math.random() * Math.PI * 2, r = Math.random() * sp.radius;
          let x = sp.x + Math.cos(a) * r, z = sp.z + Math.sin(a) * r;
          if (c.waterLevel !== undefined && c.collision.ground(x, z) < c.waterLevel - 0.6 && sp.list !== 'shore') { x = sp.x; z = sp.z; }
          const actor = sp.unique ? this.spawnCreature(c, sp.unique, x, 0, z, { uid: sp.unique }) : this.spawnLeveled(c, sp.list, x, 0, z);
          sp.actors.push(actor);
        }
      } else if (sp.active && d > 230) {
        sp.active = false;
        const allDead = sp.actors.every((a) => a.dead);
        for (const a of sp.actors) this.removeActor(a);
        sp.actors = [];
        if (allDead) sp.respawnAt = this.time.hours + 72;
      }
    }
  },

  updateDiscovery() {
    if (this.cell.id !== 'world') return;
    const pp = this.player.pos;
    for (const [id, L] of Object.entries(LOCATIONS)) {
      if (this.discovered[id] || L.discovered) continue;
      if (Math.hypot(L.x - pp.x, L.z - pp.z) < 55) {
        this.discovered[id] = true;
        this.ui.notify(`Location discovered: ${L.name}`, 'discover');
        if (id === 'fort_sutch' && this.quests.stage('mq_dawn') >= 10 && this.quests.stage('mq_dawn') < 40) this.quests.set('mq_dawn', 40, this.day());
        this.audio.play('discover', 0.8);
      }
    }
  },

  updateMusic() {
    const fighting = this.inCombat();
    if (fighting) this.lastCombat = this.clockT;
    const combat = this.clockT - (this.lastCombat ?? -100) < 4;
    let mode = this.cell.music;
    if (mode === 'explore' && !this.cell.interior && this.sky.night > 0.6) mode = 'night';
    if (combat) mode = 'combat';
    this.audio.setMusic(mode);
  },

  updateEnvironment(dt) {
    const c = this.cell;
    const pp = this.player.pos;
    const dh = this._lastHours == null ? 0 : Math.max(0, this.time.hours - this._lastHours);
    this._lastHours = this.time.hours;
    const outdoors = c.id === 'world';
    const snowy = outdoors ? snowCover(this.camera.position.x, this.camera.position.z, this.camera.position.y - 1.6) : 0;
    this.weather.snowUniforms.uScale.value = this.renderer.domElement.height * 0.5;
    // the White Hare: while she is caged the snow over the foothills never stops; once she is home the sky clears
    const caged = this.quests.started('sq_hare1') && !this.flags.hareFreed;
    const snowBase = caged ? 0.5 : this.flags.hareFreed && Math.hypot(this.camera.position.x - LOCATIONS.wintersmeet.x, this.camera.position.z - LOCATIONS.wintersmeet.z) < 160 ? 0 : 0.18;
    const w = this.weather.update(dt, dh, this.time.hours, this.camera.position, this.clockT, outdoors, this.audio, snowy, snowBase);
    const wx = outdoors ? w : { overcast: 0, rain: 0, fog: 0 };
    if (c.hasSky) {
      let tint = c.skyTint || 0;
      if (c.id === 'world' && !this.flags.gateClosed) {
        const G = LOCATIONS.gate;
        tint = smoothstep(260, 70, Math.hypot(pp.x - G.x, pp.z - G.z)) * 0.85;
      }
      const hours = c.id === 'oblivion' ? 12.5 : this.time.hours;
      this.sky.update(hours, this.camera.position, this.clockT, tint, wx.overcast);
      const s = this.sky;
      this.sunLight.color.copy(s.sunColor);
      this.sunLight.intensity = s.sunIntensity;
      this.hemi.color.copy(s.ambSky);
      this.hemi.groundColor.copy(s.ambGround);
      this.hemi.intensity = s.ambIntensity;
      this.scene.fog.color.copy(s.fogColor);
      // a little indigo mist gathers at night, so distant hills and trees become silhouettes
      const nightMist = c.id === 'world' ? s.night : 0;
      this.scene.fog.near = 30 * (1 - wx.fog * 0.85) * (1 - nightMist * 0.4);
      this.scene.fog.far = c.id === 'oblivion' ? 320 : (this.settings.viewDist * 1.6 + 200) * (1 - wx.fog * 0.78 - wx.rain * 0.15) * (1 - nightMist * 0.45);
      // the snows: a pale, cold haze that thickens when it is snowing hard
      if (snowy > 0) {
        this.scene.fog.color.lerp(_snowFog.setRGB(0.78, 0.83, 0.9).multiplyScalar(0.35 + (1 - s.night) * 0.65), snowy * (0.35 + wx.overcast * 0.3));
        this.scene.fog.far *= 1 - snowy * (0.22 + wx.overcast * 0.25 + wx.rain * 0.25);
        this.hemi.color.lerp(_snowFog.setRGB(0.85, 0.9, 1.0), snowy * 0.25);
      }
      // lightning
      if (outdoors && this.weather.flash > 0) {
        const f = this.weather.flash * (0.6 + Math.random() * 0.4);
        this.hemi.intensity += f * 2.5;
        this.scene.fog.color.lerp(new THREE.Color(0xd8e0ff), f * 0.5);
      }
      // sun flare: only when the sun is up and we're outdoors
      this.sunAnchor.position.copy(this.camera.position).addScaledVector(s.sunDir, 900);
      this.sunFlare.visible = s.sunDir.y > -0.02 && c.id === 'world' && this.settings.bloom;
      // the ghosts fade out when hills or buildings hide the sun
      this._flareT = (this._flareT || 0) - dt;
      if (this._flareT <= 0) {
        this._flareT = 0.15;
        const cp = this.camera.position;
        this._sunOccluded = !!c.collision.segment(cp, cp.clone().addScaledVector(s.sunDir, 400));
      }
      this.sunFlare.userData.update(this.camera, dt, this._sunOccluded || (this.weather?.cur.overcast || 0) > 0.6);
      // shadow camera follows the player, snapped to texels
      const sd = s.lightDir;
      const snap = 140 / 2048;
      const cx = Math.round(pp.x / snap) * snap, cz = Math.round(pp.z / snap) * snap;
      this.sunLight.target.position.set(cx, pp.y, cz);
      this.sunLight.position.set(cx + sd.x * 150, pp.y + sd.y * 150, cz + sd.z * 150);
      if (c.water) c.water.userData.update(this.clockT, s, this.scene.fog);
      this.envTimer -= dt;
      if (this.envTimer <= 0 || this._envCell !== c.id) {
        this.envTimer = 6;
        this._envCell = c.id;
        const old = this.skyEnv;
        this.skyEnv = this.pmrem.fromScene(this.envScene, 0, 1, 2000).texture;
        old?.dispose();
      }
      this.scene.environment = this.skyEnv;
      this.scene.environmentIntensity = 0.35 + (1 - s.night) * 0.25;
      if (c.vegetation) c.vegetation.update(this.camera.position, this.clockT, this.settings.viewDist);
      if (c.scatter) updateScatter(c.scatter, this.camera.position, this.settings.viewDist / 650);
      setWindowGlow(c.id === 'world' ? Math.max(0, s.night - 0.15) * 1.1 : 0.5);
      if (c.state?.portalMats) for (const m of c.state.portalMats) m.uniforms.uTime.value = this.clockT;
      if (c.state?.lavaTex) { c.state.lavaTex.offset.x = this.clockT * 0.004; c.state.lavaTex.offset.y = Math.sin(this.clockT * 0.1) * 0.02; }
      if (c.state?.gate?.portal) {
        c.state.gate.portal.material.uniforms.uTime.value = this.clockT;
        c.state.gate.group.children.forEach((ch) => { if (ch.material?.uniforms?.uTime) ch.material.uniforms.uTime.value = this.clockT; });
      }
    } else {
      setWindowGlow(0.6);
      this.sunFlare.visible = false;
      this.sunFlare.userData.update(this.camera, dt, true);
      this.scene.environment = this.roomEnv;
      this.scene.environmentIntensity = c.dungeon ? 0.1 : 0.18;
    }
    // Chorrol gets a gentle storybook grade: a little warmer and more saturated
    const town = c.id === 'world' ? smoothstep(110, 55, Math.hypot(pp.x - LOCATIONS.chorrol.x, pp.z - LOCATIONS.chorrol.z)) : 0;
    this.grade.uniforms.uSaturation.value = c.interior ? 1.05 : 1.1 - wx.overcast * 0.18 + town * 0.1;
    this.grade.uniforms.uWarmth.value = c.interior ? 0.035 : c.id === 'oblivion' ? 0.05 : 0.02 + town * 0.025;
    this.renderer.toneMappingExposure = c.interior ? 1.15 : 1.0;
    // night: cool indigo shadows, saturated blues, warm firelight that blooms
    const nightAmt = c.interior ? (c.dungeon ? 0.55 : 0.35) : c.hasSky && c.id !== 'oblivion' ? this.sky.night : 0;
    this._night = (this._night ?? nightAmt) + (nightAmt - (this._night ?? nightAmt)) * Math.min(1, dt * 3);
    const nt = this._night;
    this.grade.uniforms.uNight.value = nt;
    this.grade.uniforms.uSaturation.value += nt * 0.03;
    this.grade.uniforms.uVignette.value = 0.32 + nt * 0.28;
    this.bloom.strength = 0.42 + nt * 0.22;
    this.bloom.threshold = 0.88 - nt * 0.16;
    this.bloom.radius = 0.7 + nt * 0.15;
    if (c.firelight) c.firelight.update(this.clockT, c.interior || c.id === 'oblivion' ? 1 : this.sky.night);
    // Night-Eye: the dark gives up its secrets in a cool green-blue
    const ne = this.player.effects?.nightEyeT > 0 ? Math.min(1, this.player.effects.nightEyeT / 2) : 0;
    if (ne > 0) {
      const dark = c.interior ? 0.6 : this.sky.night;
      this.renderer.toneMappingExposure += dark * 1.6 * ne;
      this.hemi.intensity += dark * 1.2 * ne;
      this.grade.uniforms.uTint.value.setRGB(1 - 0.25 * dark * ne, 1, 1 - 0.1 * dark * ne);
    } else this.grade.uniforms.uTint.value.setRGB(1, 1, 1);
    this.updateLights(dt);
  },

  /** Each pooled light costs every lit pixel, so the overworld uses fewer than interiors. */
  setLightPoolSize(n) {
    if (this.activePool === n) return;
    this.activePool = n;
    this.lightPool.forEach((l, i) => { if (i < n) this.scene.add(l); else { this.scene.remove(l); l.intensity = 0; } });
  },

  updateLights() {
    const c = this.cell;
    const cam = this.camera.position;
    // towns get a couple more real lights at night: lanterns, torches and windows all want them
    if (c.id === 'world') {
      const inTown = Math.hypot(cam.x - LOCATIONS.chorrol.x, cam.z - LOCATIONS.chorrol.z) < 85 && this.sky.night > 0.3;
      this.setLightPoolSize(inTown ? 8 : this.sky.night > 0.4 ? 6 : 4);
    }
    const night = this.sky.night;
    const cands = [];
    for (const l of c.lights) {
      if (!l.on) continue;
      if (l.night && c.id === 'world' && night < 0.3) continue;
      const d = l.pos.distanceTo(cam);
      if (d > l.distance + 40) continue;
      cands.push([l.priority ? d - 60 : d, l]);
    }
    cands.sort((a, b) => a[0] - b[0]);
    for (let i = 0; i < (this.activePool ?? this.lightPool.length); i++) {
      const pl = this.lightPool[i];
      const e = cands[i];
      if (!e) { pl.intensity = 0; continue; }
      const l = e[1];
      pl.position.copy(l.pos);
      pl.color.copy(l.color);
      pl.distance = l.distance;
      const flick = l.flicker ? 0.82 + 0.18 * Math.sin(this.clockT * 13 + i * 3.1) * Math.sin(this.clockT * 7.3 + i) : 1;
      // fade in/out near the edge of the candidate range
      const fade = Math.min(1, Math.max(0, (l.distance + 40 - e[0]) / 20));
      pl.intensity = l.intensity * flick * fade;
    }
    // light spell / torch
    const p = this.player;
    this.playerLight.intensity = p.effects?.lightT > 0 ? 18 : 0;
    this.playerLight.position.set(p.pos.x, p.pos.y + 2.2, p.pos.z);
  },

  /** The player's torch: flame, light and sparks at the tip of whichever torch is on show. */
  updateTorch(dt) {
    const p = this.player;
    let tip = null, visible = true;
    if (p.torchLit && !p.dead) {
      if (p.thirdPerson && p.modelTorch) {
        tip = p.modelTorch.userData.tip.getWorldPosition(_torchTip);
        visible = p.modelTorch.visible;
      } else if (!p.thirdPerson && this.viewmodel.torchMesh) {
        tip = _torchTip.copy(this.viewmodel.torchTip);
        visible = this.viewmodel.torchHeld && this.viewmodel.root.visible;
      }
    }
    const c = this.cell;
    this.carriedTorch.update(dt, tip, {
      t: this.clockT, night: c.interior || c.id === 'oblivion' ? 1 : this.sky.night,
      firstPerson: !p.thirdPerson, visible, particles: this.state === 'playing' ? this.particles : null,
      scale: p.thirdPerson ? 1 : this.viewmodel.torchScale,
      style: ITEMS[p.equipped.shield]?.lightStyle || 'torch',
    });
  },

  /** Conjured elemental blades: animate them, and let the one in your hand light up its surroundings. */
  updateBlades(dt) {
    updateBladeFx(this.clockT, dt, this.particles);
    updateArmorFx(this.clockT, dt, this.particles);
    const p = this.player, w = p.equippedWeapon();
    const kind = w?.look?.fx;
    let at = null;
    if (kind && !p.dead) {
      if (!p.thirdPerson && this.viewmodel.bladeShown) at = this.viewmodel.bladeTip;
      else if (p.thirdPerson && p.modelWeapon?.visible) at = p.modelWeapon.localToWorld(_torchTip.set(0, 0.6, 0));
    }
    if (!at) { this.bladeLight.intensity = 0; return; }
    this.bladeLight.position.copy(at);
    this.bladeLight.color.setHex(bladeLightColor(kind));
    const t = this.clockT;
    this.bladeLight.intensity = kind === 'fire' ? 9 * (0.85 + 0.15 * Math.sin(t * 9.3) * Math.sin(t * 5.7)) : kind === 'shock' ? 7 * (Math.random() < 0.15 ? 1.6 : 0.8) : 5.5 * (0.9 + Math.sin(t * 2.3) * 0.1);
  },

  updateEmitters(dt) {
    const pp = this.player.pos;
    for (const e of this.cell.emitters) {
      if (!e.rate) continue;
      if (Math.abs(e.pos.x - pp.x) > e.range || Math.abs(e.pos.z - pp.z) > e.range) continue;
      if ((e.night && this.sky.night < 0.45) || (e.day && this.sky.night > 0.45)) continue;
      if (e.day && this.weather?.cur.rain > 0.3) continue;
      e.acc += e.rate * dt;
      while (e.acc >= 1) {
        e.acc -= 1;
        if (e.kind === 'flame' && e.flameSize) {
          // the flame itself is drawn by the firelight shader: here, sparks and the odd curl of smoke
          if (Math.random() < 0.35) this.particles.burst(_emitPos.set(e.pos.x, e.pos.y + e.flameSize * 1.3, e.pos.z), 'torchspark', 1, e.color);
          if (e.flameSize > 0.6 && Math.random() < 0.07) this.particles.burst(_emitPos.set(e.pos.x, e.pos.y + e.flameSize * 2.2, e.pos.z), 'smoke', 1);
        } else if (e.kind === 'ember' && this.cell.id === 'oblivion') {
          this.particles.burst(new THREE.Vector3(pp.x + (Math.random() - 0.5) * 60, 0.5, pp.z + (Math.random() - 0.5) * 60), 'ember', 1);
        } else {
          if (e.spread) {
            _emitPos.set(e.pos.x + (Math.random() - 0.5) * e.spread * 2, e.pos.y, e.pos.z + (Math.random() - 0.5) * e.spread * 2);
            this.particles.burst(_emitPos, e.kind, 1, e.color);
          } else this.particles.burst(e.pos, e.kind, 1, e.color);
        }
      }
    }
  },

  // ----------------------------------------------------------------- saving
  serialize(desc) {
    const world = this.cells.world;
    return {
      version: 1,
      desc: desc || `${this.player.name}, Level ${this.player.ch.level} — ${this.cell?.name || ''}`,
      timestamp: Date.now(),
      cell: this.cell.id,
      player: this.player.toJSON(),
      time: this.time.hours,
      quests: this.quests.toJSON(),
      flags: this.flags,
      taken: this.taken,
      harvested: this.harvested,
      weather: this.weather.toJSON(),
      containers: this.containers,
      unlocked: this.unlocked,
      discovered: this.discovered,
      shrines: this.shrines,
      rentedUntil: this.rentedUntil,
      crime: { bounty: this.crime.bounty, stolen: this.crime.stolen },
      lastDoor: this.doorReturns._last,
      oblivionReturn: this.oblivionReturn || null,
      spawns: world ? world.spawns.map((s) => s.respawnAt) : [],
    };
  },

  save(slot = 'quick', desc) {
    if (!this.cell || this.state === 'dead') return false;
    for (const c of Object.values(this.cells)) for (const it of c.interactables) if (it.kind === 'container' && it.inventory) this.persistContainer(it);
    try {
      localStorage.setItem(SAVE_PREFIX + slot, JSON.stringify(this.serialize(desc)));
      return true;
    } catch (e) {
      console.error(e);
      this.ui.notify('Save failed: ' + e.message);
      return false;
    }
  },

  autosave() {
    if (this.state === 'playing' && this.cell) this.save('auto');
  },

  listSaves() {
    const out = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k.startsWith(SAVE_PREFIX)) continue;
      try {
        const s = JSON.parse(localStorage.getItem(k));
        out.push({ slot: k.slice(SAVE_PREFIX.length), desc: s.desc, timestamp: s.timestamp });
      } catch { /* ignore broken */ }
    }
    return out.sort((a, b) => b.timestamp - a.timestamp);
  },

  async load(slot) {
    const raw = localStorage.getItem(SAVE_PREFIX + slot);
    if (!raw) return false;
    const s = JSON.parse(raw);
    this.state = 'loading';
    this.ui.closeMenus();
    this.ui.showLoading(s.cell);
    this.audio.init();
    await nextFrame();
    this.player.fromJSON(s.player);
    this.time.hours = s.time;
    this.quests.load(s.quests);
    this.flags = { killed: {}, ...s.flags };
    this.taken = s.taken || {};
    this.harvested = s.harvested || {};
    this.weather.load(s.weather);
    this.containers = s.containers || {};
    this.unlocked = s.unlocked || {};
    this.discovered = s.discovered || {};
    this.shrines = s.shrines || {};
    this.rentedUntil = s.rentedUntil ?? -1;
    this.crime.bounty = s.crime?.bounty || 0;
    this.crime.stolen = s.crime?.stolen || {};
    this.crime.resisting = false;
    this.doorReturns._last = s.lastDoor;
    this.oblivionReturn = s.oblivionReturn;
    // rebuild transient cells; keep the expensive overworld but reset its actors
    for (const id of Object.keys(this.cells)) if (id !== 'world') delete this.cells[id];
    if (this.cell) { this.scene.remove(this.cell.group); for (const a of this.cell.actors) this.scene.remove(a.group); this.cell = null; }
    const w = await this.buildWorld();
    for (const a of w.actors) this.scene.remove(a.group);
    w.actors = [];
    w.spawns.forEach((sp, i) => { sp.active = false; sp.actors = []; sp.respawnAt = s.spawns?.[i] ?? -1; });
    for (const npc of NPCS.filter((n) => n.cell === 'world')) {
      this.spawnNpc(w, npc, npc.x, w.collision.groundHeight(npc.x, npc.z), npc.z);
    }
    this.applyPersistentState(w);
    this.applyWorldFlags();
    this.player.summon = null;
    const pos = { x: s.player.pos[0], z: s.player.pos[2], yaw: s.player.yaw };
    this.viewmodel.rebuild();
    this.state = 'loading';
    await this.enterCell(s.cell, pos);
    this.player.pos.fromArray(s.player.pos);
    this.player.pitch = s.player.pitch;
    this.ui.notify('Game loaded.');
    this.input.lock();
    return true;
  },

  async newGame(opts) {
    this.state = 'loading';
    this.ui.showLoading('world', null);
    await nextFrame();
    this.time.hours = 8.5;
    this.flags = { killed: {} };
    this.taken = {}; this.harvested = {}; this.containers = {}; this.unlocked = {}; this.discovered = {}; this.shrines = {};
    this.crime.clear();
    this.quests.load({});
    this.player.newCharacter(opts);
    this.viewmodel.rebuild();
    await this.buildWorld();
    this.state = 'loading';
    await this.enterCell('world', FAST_TRAVEL.sewer);
    this.quests.set('mq_amulet', 10, this.day());
    this.ui.showIntro();
  },
};

function nextFrame() {
  return new Promise((r) => requestAnimationFrame(() => r()));
}
