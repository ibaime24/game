// All DOM UI: HUD, compass, menus, dialogue, barter, containers, lockpicking, persuasion, screens.
import * as THREE from 'three';
import { ITEMS, FLOWERS, FLOWER_PRICE } from '../data/items.js';
import { SPELLS, SPELL_PRICES, SPELL_PRICE, WIZARD_SHOP, GUILD_SPELLS } from '../data/spells.js';
import {
  RACES, CLASSES, BIRTHSIGNS, SKILLS, ATTRIBUTES, ATTR_LABEL, canLevelUp, attributeBonus, applyLevelUp, levelNeeded, ATTR_HINT, LEVEL_ATTR_GAIN, LEVEL_HEALTH_GAIN,
  spellCost, priceMultiplier, skillXpNeeded,
} from '../data/stats.js';
import { DIALOGUE, MERCHANTS } from '../data/dialogue.js';
import { showPaperDoll } from './paperdoll.js';
import { QUESTS } from '../data/quests.js';
import { LOCATIONS, WORLD_HALF, ROADS } from '../world/layout.js';
import { parseSpec, Inventory } from '../data/items.js';
import { isHostile } from '../combat.js';
import { ART, LOADING_SCREENS, BOOK_PLATES, TITLE_PAINTING, screenUrl, paintingUrl } from '../data/art.js';
import { PHOTO_SOURCES } from '../world/photoTextures.js';

function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style') el.style.cssText = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v);
  }
  for (const c of kids.flat()) if (c !== null && c !== undefined && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
  return el;
}

const TIPS = [
  'You can only level up by sleeping in a bed after improving your major skills ten times.',
  'Hold the attack button to perform a power attack. It costs more fatigue but deals more damage.',
  'Blocking with a shield reduces damage far more than blocking with a weapon.',
  'Sneaking characters deal triple damage with melee sneak attacks and double with arrows.',
  'Mudcrabs are not to be trusted.',
  'Stolen goods are confiscated if you are caught and pay a fine or go to jail.',
  'Wayshrines restore your health, magicka and fatigue once per day.',
  'Waiting restores your health and magicka. Only sleeping in a bed lets you level up.',
  'Welkynd stones restore magicka when used. Ayleid ruins are full of them.',
  'The more you use a skill, the better you become at it.',
  'Press F to toggle between first- and third-person view.',
  'Fast travel to any discovered location from the Map — as long as no enemies are near.',
  'Spells are cast with Q. Choose your spell from the Magic menu, or bind it to a hotkey (1–8).',
  'Daedra resist fire. The undead burn easily.',
  'Beware the Ayleid Lich-Knight of Vilverin.',
];

const CELL_TITLES = { world: 'Cyrodiil', inn: 'Chorrol, The Grey Mare', shop: 'Chorrol, Northern Goods and Trade', priory: 'Weynon Priory', vilverin: 'Vilverin', sigil: 'Sigil Keep', oblivion: 'The Deadlands', greenheart: 'The Greenheart', snow_hare: 'The Snow Hare', gloam_barrow: 'Gloamwood Barrow', rime_spire: 'The Rime Spire' };

const fmt = (n) => Math.round(n).toLocaleString();
const glyphFor = (it) => {
  if (!it) return '✋';
  if (it.type === 'weapon') return it.skill === 'marksman' ? '➶' : it.skill === 'blunt' ? '⚒' : '⚔';
  if (it.type === 'armor') return it.slot === 'shield' ? '⛨' : '⛉';
  if (it.type === 'potion') return '⚱';
  if (it.type === 'light') return '🜂';
  return '◈';
};

export class UI {
  constructor(game) {
    this.g = game;
    this.root = document.getElementById('ui');
    this.modal = null;
    this.notices = [];
    this.enemyT = 0;
    this.enemyActor = null;
    this.suppressPause = false;
    this.buildHud();
    this.flashEl = h('div', { class: 'flash' });
    document.body.append(this.flashEl);
    game.canvas.addEventListener('click', () => {
      game.audio.init(); game.audio.resume();
      if (game.state === 'playing' && !game.input.locked) game.input.lock();
    });
  }

  // ================================================================ modal plumbing
  open(el, state = 'menu') {
    this.closeModal(false);
    this.modal = el;
    this.root.append(el);
    this.g.state = state;
    this.suppressPause = true;
    this.g.input.unlock();
    this.hideResume();
    this.g.audio.play('uiOpen', 0.6);
  }
  closeModal(resume = true) {
    if (this.modal) { this.modal.remove(); this.modal = null; }
    if (resume && this.g.cell && !this.g.player.dead) {
      this.g.state = 'playing';
      this.relock();
    }
    if (resume && this.queueAfterDialogue) {
      // a scene waiting for the conversation to end (quest epilogues, performances)
      const f = this.queueAfterDialogue;
      this.queueAfterDialogue = null;
      setTimeout(f, 60);
    }
  }
  closeMenus() { this.closeModal(false); this.hideResume(); }
  relock() {
    this.g.input.lock();
    setTimeout(() => { if (this.g.state === 'playing' && !this.g.input.locked) this.showResume(); }, 250);
  }
  showResume() {
    if (this.resumeEl) return;
    this.resumeEl = h('div', { class: 'resume', text: 'Click to continue', onclick: () => { this.hideResume(); this.g.input.lock(); } });
    this.root.append(this.resumeEl);
  }
  hideResume() { this.resumeEl?.remove(); this.resumeEl = null; }

  onKey(e) {
    const g = this.g;
    if (e.code === 'Escape') {
      if (this.modal && g.state !== 'dead' && !this.modal.classList.contains('screen')) { this.modalEsc ? this.modalEsc() : this.closeModal(); this.modalEsc = null; return; }
      if (g.state === 'playing') { this.openPause(); return; }
    }
    if (this.lockpickKey && this.lockpickKey(e)) return;
    if (this.hoverHotkey && /^Digit[1-8]$/.test(e.code)) { this.hoverHotkey(+e.code.slice(5)); return; }
    if (g.state === 'menu' && (e.code === 'Tab' || e.code === 'KeyI') && this.modal?.dataset.menu) { this.closeModal(); return; }
    if (g.state !== 'playing') return;
    if (e.code === 'Tab' || e.code === 'KeyI') this.openMenu('inventory');
    else if (e.code === 'KeyJ') this.openMenu('journal');
    else if (e.code === 'KeyM') this.openMenu('map');
    else if (e.code === 'KeyK') this.openMenu('character');
    else if (e.code === 'KeyB') this.openMenu('magic');
    else if (e.code === 'KeyT') this.openWait(false);
    else if (e.code === 'KeyU' && canLevelUp(g.player.ch)) this.openLevelUp();
    else if (e.code === 'F5') { if (g.save('quick')) this.notify('Quicksave complete.'); }
    else if (e.code === 'F9') { g.load('quick').then((ok) => { if (!ok) this.notify('No quicksave found.'); }); }
  }

  // ================================================================ HUD
  buildHud() {
    const bar = (cls) => { const i = h('i'); const b = h('b'); const num = h('span', { class: 'num' }); return { el: h('div', { class: 'bar ' + cls }, b, i, num), i, b, num }; };
    this.hp = bar('hp'); this.mp = bar('mp'); this.fp = bar('fp');
    this.weaponSlot = h('div', { class: 'slot' });
    this.spellSlot = h('div', { class: 'slot' });
    this.compassEl = h('div', { class: 'compass' });
    this.compassInfo = h('div', { class: 'compass-info' });
    this.promptEl = h('div', { class: 'prompt' });
    this.cross = h('div', { class: 'crosshair' });
    this.noticeEl = h('div', { class: 'notices' });
    this.subEl = h('div', { class: 'subtitle' });
    this.enemyBar = bar('');
    this.enemyName = h('div');
    this.enemyEl = h('div', { class: 'enemy', style: 'opacity:0' }, this.enemyName, this.enemyBar.el);
    this.eyeEl = h('div', { class: 'eye' });
    this.effectsEl = h('div', { class: 'effects' });
    this.vignette = h('div', { class: 'vignette' });
    this.spellFlash = h('div', { class: 'spellflash' });
    this.fpsEl = h('div', { class: 'fps' });
    this.hud = h('div', { class: 'hud', style: 'display:none' },
      this.vignette, this.spellFlash,
      this.cross, this.promptEl, this.eyeEl,
      h('div', { class: 'bars' }, h('div', { class: 'bar-stack' }, this.hp.el, this.mp.el, this.fp.el), h('div', { class: 'slots' }, this.weaponSlot, this.spellSlot)),
      this.compassEl, this.compassInfo, this.noticeEl, this.subEl, this.enemyEl, this.effectsEl, this.fpsEl,
    );
    this.root.append(this.hud);
    // compass ticks
    this.compassMarks = h('div');
    this.compassTicks = [];
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    for (let i = 0; i < 8; i++) {
      const t = h('div', { class: 'tick' + (i % 2 ? ' minor' : ''), text: dirs[i] });
      t.dataset.b = String((i * Math.PI) / 4);
      this.compassTicks.push(t);
      this.compassEl.append(t);
    }
    for (let i = 0; i < 16; i++) {
      if (i % 2 === 0) continue;
      const t = h('div', { class: 'tick minor', text: '·' });
      t.dataset.b = String((i * Math.PI) / 8);
      this.compassTicks.push(t);
      this.compassEl.append(t);
    }
    this.compassEl.append(h('div', { class: 'center' }), this.compassMarks);
  }

  setHud(visible) { this.hud.style.display = visible ? '' : 'none'; }

  notify(text, kind = '') {
    const el = h('div', { class: 'notice ' + kind, text });
    this.noticeEl.append(el);
    this.notices.push({ el, t: kind === 'quest' || kind === 'level' ? 6 : 4.5 });
    while (this.notices.length > 6) this.notices.shift().el.remove();
  }

  subtitle(name, text) {
    this.subEl.innerHTML = '';
    this.subEl.append(h('b', { text: name + ': ' }), text);
    this.subEl.style.opacity = 1;
    this.subT = 4 + text.length / 25;
  }

  showEnemyHealth(actor) { this.enemyActor = actor; this.enemyT = 4; }

  update(dt) {
    const g = this.g, p = g.player;
    for (let i = this.notices.length - 1; i >= 0; i--) {
      const n = this.notices[i];
      n.t -= dt;
      if (n.t < 0.8) n.el.style.opacity = Math.max(0, n.t / 0.8);
      if (n.t <= 0) { n.el.remove(); this.notices.splice(i, 1); }
    }
    if (this.subT > 0) { this.subT -= dt; if (this.subT <= 0) this.subEl.style.opacity = 0; }
    const showHud = g.cell && (g.state === 'playing' || g.state === 'dialogue' || g.state === 'menu' || g.state === 'dead');
    this.setHud(showHud);
    if (!showHud) return;
    this.fpsEl.textContent = g.settings.showFps ? `${g.fps} fps · ${Math.round(g.renderScale * 100)}% res` : '';

    const setBar = (b, v, max) => {
      const pct = Math.max(0, Math.min(100, (v / max) * 100));
      b.i.style.width = pct + '%';
      b.b.style.width = pct + '%';
      b.num.textContent = `${Math.round(v)}/${Math.round(max)}`;
    };
    setBar(this.hp, p.health, p.maxHealth);
    setBar(this.mp, p.magicka, p.maxMagicka);
    setBar(this.fp, p.fatigue, p.maxFatigue);
    const w = p.equippedWeapon();
    const sp = SPELLS[p.selectedSpell];
    const wKey = (w?.id || 'fists') + (p.equipped.arrow ? p.inventory.count(p.equipped.arrow) : '');
    if (this._wKey !== wKey) {
      this._wKey = wKey;
      this.weaponSlot.innerHTML = '';
      this.weaponSlot.append(h('span', { class: 'glyph', text: glyphFor(w) }), h('span', { class: 'lbl', text: w ? w.name + (w.skill === 'marksman' && p.equipped.arrow ? ` (${p.inventory.count(p.equipped.arrow)})` : '') : 'Hand to Hand' }));
    }
    if (this._sKey !== p.selectedSpell) {
      this._sKey = p.selectedSpell;
      this.spellSlot.innerHTML = '';
      this.spellSlot.append(h('span', { class: 'glyph', text: '✦', style: sp ? `color:#${sp.color.toString(16).padStart(6, '0')}` : '' }), h('span', { class: 'lbl', text: sp ? sp.name : 'No spell' }));
    }

    // interaction prompt
    const t = g.state === 'playing' ? g.interaction.target : null;
    const d = g.interaction.describe(t);
    const key = d ? `${d.verb}|${d.name}|${d.owned}|${d.locked}` : '';
    if (this._pKey !== key) {
      this._pKey = key;
      this.promptEl.innerHTML = '';
      if (d) {
        const icon = { Talk: '☺', Open: '▣', Take: '✋', Search: '☰', Enter: '⌂', Exit: '⌂', Sleep: '☾', Pray: '✚', Read: '✎', Examine: '?' }[d.verb] || '✋';
        this.promptEl.append(h('span', { class: 'icon', text: icon }), h('span', { class: d.owned ? 'owned' : '', text: `${d.verb} ${d.name}` }), h('span', { class: 'key', text: 'E' }));
        if (d.locked) this.promptEl.append(h('span', { class: 'sub', text: `Locked (${['', 'Very Easy', 'Easy', 'Average', 'Hard', 'Very Hard'][d.locked]})` }));
        if (d.owned) this.promptEl.append(h('span', { class: 'sub owned', text: 'Owned — taking this is stealing' }));
      }
    }
    this.cross.classList.toggle('hidden', p.thirdPerson && false);

    // enemy health
    if (this.enemyT > 0 && this.enemyActor) {
      this.enemyT -= dt;
      const a = this.enemyActor;
      this.enemyEl.style.opacity = this.enemyT > 0.5 ? 1 : this.enemyT * 2;
      this.enemyName.textContent = a.name;
      this.enemyBar.i.style.width = Math.max(0, (a.health / a.maxHealth) * 100) + '%';
    } else this.enemyEl.style.opacity = 0;

    // sneak eye
    this.eyeEl.style.display = p.sneaking ? '' : 'none';
    if (p.sneaking) this.eyeEl.classList.toggle('seen', g.anyEnemyTargeting() || (g.crime && g.cell.actors.some((a) => a.faction === 'town' && !a.dead && a.pos.distanceTo(p.pos) < 12 && a.canSee?.(p) && p.lightLevel() > 0.6)));

    // effects
    const eff = [];
    if (canLevelUp(p.ch)) eff.push(['Level up! Press U', 'level']);
    if (p.effects.shieldT > 0) eff.push([`Shield ${p.effects.shield}% (${Math.ceil(p.effects.shieldT)}s)`]);
    if (p.effects.lightT > 0) eff.push([`Light (${Math.ceil(p.effects.lightT)}s)`]);
    if (p.effects.detectT > 0) eff.push([`Detect Life (${Math.ceil(p.effects.detectT)}s)`]);
    if (p.effects.invisT > 0) eff.push([`Invisible (${Math.ceil(p.effects.invisT)}s)`]);
    if (p.sneaking) eff.push(['Sneaking']);
    if (g.crime.bounty > 0) eff.push([`Bounty: ${g.crime.bounty}`]);
    if (p.encumbrance() > p.carryLimit()) eff.push(['Overencumbered']);
    const ek = eff.map((e) => e[0]).join('|');
    if (this._eKey !== ek) {
      this._eKey = ek;
      this.effectsEl.innerHTML = '';
      for (const [txt, cls] of eff) this.effectsEl.append(h('div', { class: 'effect ' + (cls || ''), text: txt }));
    }
    // damage vignette
    this.vignette.style.opacity = Math.max(p.hurtFlash * 0.9, 0);
    this.vignette.classList.toggle('lowhp', p.health / p.maxHealth < 0.25 && !p.dead);

    this.updateCompass();
  }

  questTarget() {
    const g = this.g;
    const cur = g.quests.current();
    if (!cur) return null;
    const tgt = cur.info.target;
    if (!tgt) return null;
    const cell = g.cell;
    // a specific actor in this cell?
    if (tgt.npc) {
      const ids = [].concat(tgt.npc);
      const a = cell.actors.find((x) => (ids.includes(x.uid) || ids.includes(x.def.tplId)) && !x.dead && !x.hiddenNow);
      if (a) return a.pos;
    }
    if (tgt.crystal && cell.hall) return cell.hall.crystal.pos;
    if (tgt.item) {
      const it = cell.interactables.find((x) => x.kind === 'item' && x.item?.id === tgt.item && !x.disabled);
      if (it) return it.pos;
    }
    if (tgt.sigil) {
      if (cell.id === 'sigil') { const s = cell.interactables.find((x) => x.kind === 'sigil'); if (s) return s.pos; }
      if (cell.id === 'oblivion') return { x: tgt.x, z: tgt.z };
      if (cell.id === 'world') return LOCATIONS.gate;
    }
    const wantCell = tgt.cell || 'world';
    if (cell.id === wantCell) {
      if (tgt.x !== undefined) return { x: tgt.x, z: tgt.z };
      if (cell.id === 'world' && tgt.world) return tgt.world;
      return null;
    }
    if (cell.id === 'world') {
      if (wantCell !== 'world' && g.doorReturns[wantCell]?.from) return g.doorReturns[wantCell].from;
      if (wantCell === 'oblivion') return LOCATIONS.gate;
      return tgt.world || null;
    }
    // a door from here into the target's cell (the cove's interiors; the jolly boat out to the Meringue)
    const into = cell.interactables.find((x) => (x.kind === 'door' && x.cell === wantCell && !x.exit) || (x.kind === 'jollyboat' && wantCell === 'meringue'));
    if (into) return into.pos;
    // inside another cell: point to its exit
    const exit = cell.interactables.find((x) => x.kind === 'door' && x.exit) || cell.interactables.find((x) => x.kind === 'returnportal');
    return exit ? exit.pos : null;
  }

  updateCompass() {
    const g = this.g, p = g.player;
    const bearing = -p.yaw;
    const W = 460, FOV = Math.PI / 2;
    const place = (el, b) => {
      let rel = b - bearing;
      rel = Math.atan2(Math.sin(rel), Math.cos(rel));
      if (Math.abs(rel) > FOV * 1.02) { el.style.display = 'none'; return; }
      el.style.display = '';
      el.style.left = (W / 2 + (rel / FOV) * (W / 2)) + 'px';
    };
    for (const t of this.compassTicks) place(t, +t.dataset.b);
    // markers
    const marks = [];
    const pp = p.pos;
    const bearingTo = (x, z) => Math.atan2(x - pp.x, -(z - pp.z));
    if (g.cell.id === 'world') {
      for (const [id, L] of Object.entries(LOCATIONS)) {
        const d = Math.hypot(L.x - pp.x, L.z - pp.z);
        if (d > 320 || d < 12) continue;
        const known = L.discovered || g.discovered[id];
        marks.push({ cls: 'loc' + (known ? '' : ' undiscovered'), text: { city: '♜', settlement: '⌂', cave: '◖', ruin: '♅', camp: '▲', gate: '◎', shrine: '✚' }[L.icon] || '•', b: bearingTo(L.x, L.z) });
      }
    }
    const q = this.questTarget();
    let qd = null;
    if (q) { marks.push({ cls: 'quest', text: '▼', b: bearingTo(q.x, q.z) }); qd = Math.hypot(q.x - pp.x, q.z - pp.z); }
    const detect = p.effects.detectT > 0;
    for (const a of g.cell.actors) {
      if (a.dead) continue;
      const d = a.pos.distanceTo(pp);
      if ((a.target === p && d < 60) || (detect && d < 40)) marks.push({ cls: 'enemy', text: detect && !isHostile(a, p) ? '◆' : '●', b: bearingTo(a.pos.x, a.pos.z), color: detect && !isHostile(a, p) ? '#c080ff' : null });
    }
    const key = marks.length;
    if (this._mk !== key) {
      this._mk = key;
      this.compassMarks.innerHTML = '';
      this._markEls = marks.map(() => { const e = h('div', { class: 'mark' }); this.compassMarks.append(e); return e; });
    }
    marks.forEach((m, i) => {
      const e = this._markEls[i];
      e.className = 'mark ' + m.cls;
      e.textContent = m.text;
      e.style.color = m.color || '';
      place(e, m.b);
    });
    const cur = g.quests.current();
    const hours = g.time.hours % 24;
    const hh = Math.floor(hours), mm = Math.floor((hours - hh) * 60);
    const clock = `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'AM' : 'PM'}`;
    const info = `${g.cell.name} · Day ${g.day()}, ${clock}${cur ? ` · ${cur.def.name}${qd !== null ? ` (${Math.round(qd)}m)` : ''}` : ''}`;
    if (this._ci !== info) { this._ci = info; this.compassInfo.textContent = info; }
  }

  whiteFlash() {
    this.flashEl.style.transition = 'opacity 0.3s';
    this.flashEl.style.opacity = 1;
    setTimeout(() => { this.flashEl.style.transition = 'opacity 2.5s'; this.flashEl.style.opacity = 0; }, 2000);
  }

  // ================================================================ screens
  showTitle() {
    this.g.state = 'title';
    this.setHud(false);
    const saves = this.g.listSaves();
    const embers = h('canvas', { class: 'embers' });
    const ta = ART[TITLE_PAINTING];
    const el = h('div', { class: 'screen title-screen' },
      h('div', { class: 'titleart', style: `background-image:url('${screenUrl(TITLE_PAINTING)}')` }),
      h('div', { class: 'titleshade' }),
      h('div', { class: 'caption', text: `${ta.title} — ${ta.artist}, ${ta.date} · National Gallery of Art` }),
      embers,
      h('div', { class: 'sigil' }),
      h('div', { class: 'sub', text: 'THE ELDER SCROLLS IV' }),
      h('h1', { text: 'OBLIVION' }),
      h('div', { class: 'tag', text: 'A fan-made tribute, built from scratch in the browser' }),
      h('div', { class: 'menu-col' },
        saves.length ? h('button', { class: 'btn', text: 'Continue', onclick: () => { this.g.audio.init(); this.closeTitle(); this.g.load(saves[0].slot); } }) : null,
        h('button', { class: 'btn', text: 'New Game', onclick: () => { this.g.audio.init(); this.g.audio.resume(); this.closeTitle(); this.showChargen(); } }),
        saves.length ? h('button', { class: 'btn', text: 'Load', onclick: () => { this.g.audio.init(); this.openLoad(true); } }) : null,
        h('button', { class: 'btn', text: 'Settings', onclick: () => this.openSettings(true) }),
        h('button', { class: 'btn', text: 'Controls', onclick: () => this.openControls(true) }),
        h('button', { class: 'btn', text: 'Credits', onclick: () => this.openCredits() }),
      ),
      h('div', { class: 'foot', text: 'Not affiliated with Bethesda Softworks. Paintings: National Gallery of Art Open Access. Textures: Poly Haven. Both CC0.' }),
    );
    this.titleEl = el;
    this.root.append(el);
    // ember animation
    const ctx = embers.getContext('2d');
    const parts = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), v: 0.02 + Math.random() * 0.06, s: 1 + Math.random() * 2.5, w: Math.random() * 6 }));
    let last = performance.now();
    const anim = (now) => {
      if (!this.titleEl) return;
      const dt = (now - last) / 1000; last = now;
      embers.width = innerWidth; embers.height = innerHeight;
      for (const p of parts) {
        p.y -= p.v * dt; p.x += Math.sin(now / 1000 + p.w) * 0.0004;
        if (p.y < -0.02) { p.y = 1.02; p.x = Math.random(); }
        ctx.fillStyle = `rgba(255,${120 + p.w * 15},40,${0.4 + 0.4 * Math.sin(now / 300 + p.w)})`;
        ctx.beginPath(); ctx.arc(p.x * embers.width, p.y * embers.height, p.s, 0, 7); ctx.fill();
      }
      requestAnimationFrame(anim);
    };
    requestAnimationFrame(anim);
    const startMusic = () => { this.g.audio.init(); this.g.audio.resume(); this.g.audio.setMusic('title'); window.removeEventListener('pointerdown', startMusic); };
    window.addEventListener('pointerdown', startMusic);
  }
  closeTitle() { this.titleEl?.remove(); this.titleEl = null; }

  showChargen() {
    const sel = { name: '', race: 'imperial', cls: 'warrior', sign: 'warrior', female: false };
    const el = h('div', { class: 'screen', style: 'background:radial-gradient(#2a1a0a,#050302)' });
    const panel = h('div', { class: 'parch chargen' });
    el.append(panel);
    const render = () => {
      panel.innerHTML = '';
      const R = RACES[sel.race], C = CLASSES[sel.cls], B = BIRTHSIGNS[sel.sign];
      const nameIn = h('input', { value: sel.name, placeholder: 'Enter your name', maxlength: 24, oninput: (e) => { sel.name = e.target.value; } });
      const raceList = h('div', { class: 'list', style: 'flex:1' }, ...Object.entries(RACES).map(([id, r]) => h('div', { class: 'item' + (id === sel.race ? ' sel' : ''), onclick: () => { sel.race = id; render(); } }, h('span', { class: 'swatch', style: `background:#${r.skin.toString(16).padStart(6, '0')}` }), r.name)));
      const clsList = h('div', { class: 'list', style: 'flex:1' }, ...Object.entries(CLASSES).map(([id, c]) => h('div', { class: 'item' + (id === sel.cls ? ' sel' : ''), onclick: () => { sel.cls = id; render(); } }, c.name, h('span', { class: 'r', text: c.spec }))));
      const signList = h('div', { class: 'list', style: 'flex:1' }, ...Object.entries(BIRTHSIGNS).map(([id, b]) => h('div', { class: 'item' + (id === sel.sign ? ' sel' : ''), onclick: () => { sel.sign = id; render(); } }, b.name)));
      panel.append(
        h('h2', { text: 'Who are you, prisoner?' }),
        h('div', { class: 'row', style: 'margin-bottom:12px' }, h('div', { style: 'flex:1' }, nameIn),
          h('label', { class: 'row', style: 'font-size:15px' }, h('input', { type: 'checkbox', style: 'width:auto', checked: sel.female ? '' : null, onchange: (e) => { sel.female = e.target.checked; } }), 'Female')),
        h('div', { class: 'cols' },
          h('div', { class: 'col' }, h('h3', { text: 'Race' }), raceList, h('div', { class: 'details', style: 'margin-top:8px;min-height:80px' }, h('div', { class: 'name', text: R.name }), R.desc,
            h('div', { class: 'muted', text: 'Bonuses: ' + Object.entries(R.skills).map(([s, v]) => `${SKILLS[s][0]} +${v}`).join(', ') }))),
          h('div', { class: 'col' }, h('h3', { text: 'Class' }), clsList, h('div', { class: 'details', style: 'margin-top:8px;min-height:80px' }, h('div', { class: 'name', text: C.name }),
            `Favored: ${C.attrs.map((a) => ATTR_LABEL[a]).join(', ')}. Major skills: ${C.majors.map((s) => SKILLS[s][0]).join(', ')}.`,
            h('div', { class: 'muted', text: 'Starts with: ' + C.kit.map((k) => ITEMS[parseSpec(k)[0]].name).join(', ') }))),
          h('div', { class: 'col' }, h('h3', { text: 'Birthsign' }), signList, h('div', { class: 'details', style: 'margin-top:8px;min-height:80px' }, h('div', { class: 'name', text: B.name }), B.desc)),
        ),
        h('div', { class: 'row', style: 'margin-top:14px' },
          h('button', { class: 'btn', text: 'Back', onclick: () => { el.remove(); this.showTitle(); } }),
          h('div', { class: 'spacer' }),
          h('button', { class: 'btn', text: 'Begin your journey', onclick: () => {
            if (!sel.name.trim()) sel.name = 'Prisoner';
            el.remove();
            this.g.player.ch.female = sel.female;
            this.g.newGame({ name: sel.name.trim(), race: sel.race, cls: sel.cls, sign: sel.sign }).then(() => { this.g.player.ch.female = sel.female; this.g.player.rebuildModel(); });
          } }),
        ),
      );
      nameIn.focus();
    };
    this.g.state = 'chargen';
    this.root.append(el);
    render();
  }

  showIntro() {
    const el = h('div', { class: 'screen intro' },
      h('div', { class: 'quote', text: '"I am Uriel Septim, by the grace of the gods your Emperor... They come to kill me. The Amulet — take it to Jauffre. He alone knows where to find my last son. Find him, and close shut the jaws of Oblivion."' }),
      h('div', { class: 'who', text: '— Emperor Uriel Septim VII, in his final hour' }),
      h('div', { class: 'cont', text: 'CLICK TO EMERGE FROM THE SEWERS' }),
    );
    this.g.state = 'menu';
    this.root.append(el);
    el.addEventListener('click', () => {
      el.remove();
      this.g.state = 'playing';
      this.g.input.lock();
      this.notify('The sewer grate swings shut behind you. Cyrodiil lies before you.');
      this.notify('Press Tab for your inventory, J for your journal, M for the map.', '');
    });
  }

  showLoading(cellId, message) {
    this.hideLoading();
    this.setHud(false);
    const pool = cellId === 'oblivion' || cellId === 'sigil' ? 'oblivion'
      : cellId === 'vilverin' ? 'ruin'
      : ['inn', 'shop', 'priory'].includes(cellId) ? 'interior'
      : (this.g.sky?.night > 0.55 ? 'night' : 'world');
    const ids = LOADING_SCREENS[pool];
    // avoid repeating the previous painting
    let id = ids[Math.floor(Math.random() * ids.length)];
    if (id === this._lastScreen && ids.length > 1) id = ids[(ids.indexOf(id) + 1) % ids.length];
    this._lastScreen = id;
    const a = ART[id];
    this.loadingEl = h('div', { class: 'screen loading' },
      h('div', { class: 'art', style: `background-image:url('${screenUrl(id)}')` }),
      h('div', { class: 'shade' }),
      h('div', { class: 'lcontent' },
        h('div', { class: 'ltitle', text: CELL_TITLES[cellId] || 'Cyrodiil' }),
        h('div', { class: 'tip', text: message || TIPS[Math.floor(Math.random() * TIPS.length)] }),
        h('div', { class: 'spinner' })),
      h('div', { class: 'caption', text: `${a.title} — ${a.artist}${a.date ? ', ' + a.date : ''} · National Gallery of Art` }),
    );
    this.root.append(this.loadingEl);
  }
  hideLoading() { this.loadingEl?.remove(); this.loadingEl = null; }

  showDeath() {
    const el = h('div', { class: 'screen death' },
      h('h1', { text: 'You have died' }),
      h('div', { class: 'menu-col', style: 'display:flex;gap:10px' },
        h('button', { class: 'btn', text: 'Load Last Save', onclick: () => { el.remove(); this.modal = null; const s = this.g.listSaves()[0]; if (s) this.g.load(s.slot); else location.reload(); } }),
        h('button', { class: 'btn', text: 'Load...', onclick: () => { el.remove(); this.modal = null; this.openLoad(false); } }),
        h('button', { class: 'btn', text: 'Quit to Title', onclick: () => location.reload() }),
      ),
    );
    this.modal = el;
    this.root.append(el);
  }

  showEnding() {
    const panel = h('div', { class: 'parch msg', style: 'width:min(640px,92vw)' },
      h('h2', { text: 'The Path to Paradise' }),
      h('p', { text: 'You closed the Gate before Kvatch, carried the last Septim out of its ruins, and walked out of the Dagon Shrine with the Mysterium Xarxes under your arm. In Weynon Priory, by candlelight, Martin Septim begins to read the book that will open the way into Mankar Camoran\'s Paradise.' }),
      h('p', { text: 'The Amulet of Kings is still out of reach. But for the first time since the Emperor died, the Blades know where their enemy is — and the enemy knows your name.' }),
      h('p', { class: 'muted', text: 'The main quest of this tribute is complete. Cyrodiil remains open to you: follow Corvin Ashby\'s unfinished map, hunt Black Brugo, plunder Vilverin, pick every lock in Chorrol, or simply listen to M\'aiq.' }),
      h('div', { class: 'row' }, h('div', { class: 'spacer' }), h('button', { class: 'btn', text: 'Continue', onclick: () => this.closeModal() })),
    );
    this.open(h('div', { class: 'overlay' }, panel), 'menu');
  }

  /** A soft glow from the screen edges in a spell's colour. */
  screenFlash(color) {
    const c = '#' + new THREE.Color(color).getHexString();
    const el = this.spellFlash;
    el.style.background = `radial-gradient(ellipse at center, transparent 40%, ${c}88 100%)`;
    el.classList.remove('on');
    void el.offsetWidth;
    el.classList.add('on');
  }

  showMessage(title, text) {
    const panel = h('div', { class: 'parch msg' }, h('h2', { text: title }), h('p', { text }),
      h('div', { class: 'row' }, h('div', { class: 'spacer' }), h('button', { class: 'btn', text: 'OK', onclick: () => this.closeModal() })));
    this.open(h('div', { class: 'overlay clear' }, panel), 'menu');
  }

  /** A message with a set of choices. options: [{ label, fn? }] */
  showChoice(title, text, options) {
    const panel = h('div', { class: 'parch msg' }, h('h2', { text: title }), h('p', { text }),
      h('div', { class: 'row', style: 'flex-wrap:wrap;gap:8px' }, h('div', { class: 'spacer' }),
        ...options.map((o) => h('button', { class: 'btn', text: o.label, onclick: () => { this.closeModal(); o.fn?.(); } }))));
    this.open(h('div', { class: 'overlay clear' }, panel), 'menu');
  }

  showBook(item) {
    const plate = BOOK_PLATES[item.id];
    const pa = plate && ART[plate];
    const panel = h('div', { class: 'parch book' }, h('h2', { text: item.name }),
      plate ? h('figure', { class: 'plate' }, h('img', { src: paintingUrl(plate), alt: pa.title }), h('figcaption', { text: `${pa.title} — ${pa.artist}` })) : null,
      h('p', { text: item.text || item.desc || '' }),
      h('div', { class: 'row' }, h('div', { class: 'spacer' }), h('button', { class: 'btn', text: 'Close', onclick: () => this.closeModal() })));
    this.open(h('div', { class: 'overlay' }, panel), 'menu');
  }

  // ================================================================ pause / settings / saves
  openPause() {
    const g = this.g;
    if (g.state !== 'playing') return;
    const panel = h('div', { class: 'parch', style: 'width:320px;display:flex;flex-direction:column;gap:10px' },
      h('h2', { text: 'Paused' }),
      h('button', { class: 'btn', text: 'Resume', onclick: () => this.closeModal() }),
      h('button', { class: 'btn', text: 'Save Game', onclick: () => { const ok = g.save('manual_' + Date.now()); this.notify(ok ? 'Game saved.' : 'Save failed.'); this.closeModal(); } }),
      h('button', { class: 'btn', text: 'Load Game', onclick: () => this.openLoad(false) }),
      h('button', { class: 'btn', text: 'Settings', onclick: () => this.openSettings(false) }),
      h('button', { class: 'btn', text: 'Controls', onclick: () => this.openControls(false) }),
      h('button', { class: 'btn', text: 'Quit to Title', onclick: () => location.reload() }),
    );
    this.open(h('div', { class: 'overlay' }, panel), 'menu');
  }

  openLoad(fromTitle) {
    const saves = this.g.listSaves();
    const panel = h('div', { class: 'parch', style: 'width:min(600px,92vw);height:min(520px,80vh);display:flex;flex-direction:column' },
      h('h2', { text: 'Load Game' }),
      h('div', { class: 'list', style: 'flex:1' }, ...saves.map((s) => h('div', { class: 'item', onclick: () => { wrap.remove(); this.modal = null; this.closeTitle(); this.g.load(s.slot); } },
        h('span', { text: s.desc }), h('span', { class: 'r', text: `${s.slot.startsWith('manual') ? '' : s.slot + ' · '}${new Date(s.timestamp).toLocaleString()}` })))),
      h('div', { class: 'row', style: 'margin-top:10px' }, h('div', { class: 'spacer' }), h('button', { class: 'btn', text: 'Back', onclick: () => { wrap.remove(); this.modal = null; if (!fromTitle) this.openPauseForce(); } })),
    );
    const wrap = h('div', { class: 'overlay', style: 'z-index:40' }, panel);
    if (fromTitle) this.root.append(wrap); else this.open(wrap, this.g.state === 'dead' ? 'dead' : 'menu');
  }
  openPauseForce() { this.g.state = 'playing'; this.openPause(); }

  openSettings(fromTitle) {
    const g = this.g, s = g.settings;
    const slider = (label, key, min, max, step) => {
      const val = h('span', { text: String(s[key]) });
      return h('div', { style: 'margin-bottom:8px' }, h('div', { class: 'row' }, label, h('div', { class: 'spacer' }), val),
        h('input', { type: 'range', min, max, step, value: s[key], oninput: (e) => { s[key] = +e.target.value; val.textContent = e.target.value; g.saveSettings(); } }));
    };
    const check = (label, key) => h('label', { class: 'row', style: 'margin-bottom:6px' }, h('input', { type: 'checkbox', checked: s[key] ? '' : null, onchange: (e) => { s[key] = e.target.checked; g.saveSettings(); } }), label);
    const panel = h('div', { class: 'parch', style: 'width:min(460px,92vw)' },
      h('h2', { text: 'Settings' }),
      slider('Field of view', 'fov', 55, 100, 1),
      slider('Mouse sensitivity', 'sensitivity', 0.2, 3, 0.1),
      slider('View distance', 'viewDist', 250, 900, 25),
      slider('Master volume', 'volume', 0, 1, 0.05),
      slider('Music volume', 'music', 0, 1, 0.05),
      h('div', { class: 'row', style: 'margin-bottom:8px' }, 'Graphics quality', h('div', { class: 'spacer' }),
        h('select', { onchange: (e) => { s.quality = e.target.value; g.saveSettings(); } },
          ...['low', 'medium', 'high', 'ultra'].map((q) => h('option', { value: q, selected: s.quality === q ? '' : null, text: q[0].toUpperCase() + q.slice(1) })))),
      check('Dynamic resolution (keeps ~60 fps)', 'dynamicRes'),
      check('Shadows', 'shadows'), check('Bloom', 'bloom'), check('Show FPS', 'showFps'),
      h('div', { class: 'row' }, h('div', { class: 'spacer' }), h('button', { class: 'btn', text: 'Done', onclick: () => { wrap.remove(); this.modal = null; if (!fromTitle) this.openPauseForce(); } })),
    );
    const wrap = h('div', { class: 'overlay', style: 'z-index:40' }, panel);
    if (fromTitle) this.root.append(wrap); else this.open(wrap, 'menu');
  }

  openCredits() {
    const art = Object.entries(ART).sort((a, b) => a[1].artist.localeCompare(b[1].artist));
    const panel = h('div', { class: 'parch', style: 'width:min(720px,94vw);max-height:84vh;display:flex;flex-direction:column' },
      h('h2', { text: 'Credits' }),
      h('div', { style: 'overflow-y:auto;font-size:14px;line-height:1.5' },
        h('h3', { text: 'Paintings' }),
        h('p', { class: 'muted', text: 'Public-domain works from the National Gallery of Art, Washington, released as Open Access (CC0).' }),
        ...art.map(([id, a]) => h('div', { text: `${a.artist} — ${a.title}${a.date ? ' (' + a.date + ')' : ''}` })),
        h('h3', { text: 'Surface textures' }),
        h('p', { class: 'muted', text: 'Photo-scanned materials from Poly Haven (polyhaven.com), CC0.' }),
        h('div', { text: [...new Set(Object.values(PHOTO_SOURCES))].join(', ') }),
        h('h3', { text: 'Everything else' }),
        h('p', { text: 'Terrain, foliage, characters, sky, music and sound are generated procedurally at runtime. A fan tribute to The Elder Scrolls IV: Oblivion; not affiliated with Bethesda Softworks.' })),
      h('div', { class: 'row', style: 'margin-top:12px' }, h('div', { class: 'spacer' }), h('button', { class: 'btn', text: 'Done', onclick: () => wrap.remove() })));
    const wrap = h('div', { class: 'overlay', style: 'z-index:40' }, panel);
    this.root.append(wrap);
  }

  openControls(fromTitle) {
    const rows = [
      ['W A S D', 'Move'], ['Mouse', 'Look'], ['Left click', 'Attack (hold for power attack) / draw bow'], ['Right click', 'Block'],
      ['Q', 'Cast selected spell'], ['E', 'Activate: talk, open, take, enter'], ['Space', 'Jump / swim up'], ['Shift', 'Sprint (drains fatigue)'],
      ['C', 'Toggle sneak'], ['R', 'Ready / sheathe weapon'], ['F', 'Toggle first / third person'], ['Hold V', 'Look at yourself from the front'], ['U', 'Level up (when ready)'], ['Tab / I', 'Inventory & menus'],
      ['K / B / M / J', 'Character / Magic / Map / Journal'], ['T', 'Wait (rest in a bed to level up)'], ['1 – 8', 'Hotkeys (hover an item or spell in the menu and press a number)'],
      ['F5 / F9', 'Quicksave / Quickload'], ['Esc', 'Pause'],
    ];
    const panel = h('div', { class: 'parch', style: 'width:min(600px,92vw)' }, h('h2', { text: 'Controls' }),
      h('table', { class: 'controls-table' }, ...rows.map(([k, v]) => h('tr', {}, h('td', { text: k }), h('td', { text: v })))),
      h('div', { class: 'row', style: 'margin-top:12px' }, h('div', { class: 'spacer' }), h('button', { class: 'btn', text: 'Done', onclick: () => { wrap.remove(); this.modal = null; if (!fromTitle) this.openPauseForce(); } })));
    const wrap = h('div', { class: 'overlay', style: 'z-index:40' }, panel);
    if (fromTitle) this.root.append(wrap); else this.open(wrap, 'menu');
  }

  // ================================================================ main menu (tabs)
  openMenu(tab = 'inventory') {
    const panel = h('div', { class: 'parch menu' });
    const wrap = h('div', { class: 'overlay' }, panel);
    wrap.dataset.menu = '1';
    this.menuTab = tab;
    const render = () => {
      this.hoverHotkey = null;
      panel.innerHTML = '';
      const tabs = h('div', { class: 'tabs' }, ...['character', 'inventory', 'magic', 'map', 'journal'].map((t) => h('div', { class: 'tab' + (t === this.menuTab ? ' on' : ''), text: t[0].toUpperCase() + t.slice(1), onclick: () => { this.menuTab = t; render(); this.g.audio.play('ui'); } })),
        h('div', { class: 'spacer' }), h('button', { class: 'btn small', text: 'Close (Tab)', onclick: () => this.closeModal() }));
      const body = h('div', { class: 'tab-body' });
      panel.append(tabs, body);
      this['tab_' + this.menuTab](body, render);
    };
    this.open(wrap, 'menu');
    this.modal = wrap;
    this.menuRender = render;
    render();
  }

  tab_character(body) {
    const p = this.g.player, ch = p.ch;
    const attrs = h('div', { class: 'stat-grid' }, ...ATTRIBUTES.flatMap((a) => [h('span', { text: ATTR_LABEL[a] }), h('span', { text: ch.attrs[a] })]));
    const derived = h('div', { class: 'stat-grid' }, ...[
      ['Health', `${Math.round(p.health)} / ${p.maxHealth}`], ['Magicka', `${Math.round(p.magicka)} / ${p.maxMagicka}`], ['Fatigue', `${Math.round(p.fatigue)} / ${p.maxFatigue}`],
      ['Encumbrance', `${p.encumbrance().toFixed(0)} / ${p.carryLimit()}`], ['Armor Rating', String(p.armorRating())], ['Bounty', String(this.g.crime.bounty)],
    ].flatMap(([k, v]) => [h('span', { text: k }), h('span', { text: v })]));
    const groups = { combat: [], magic: [], stealth: [] };
    for (const [id, [label, gov, spec]] of Object.entries(SKILLS)) groups[spec].push([id, label]);
    const skillCol = (spec) => h('div', { class: 'col', style: 'flex:1' }, h('h3', { text: spec[0].toUpperCase() + spec.slice(1) }),
      ...groups[spec].map(([id, label]) => {
        const pct = Math.min(100, (ch.skillXp[id] / skillXpNeeded(ch, id)) * 100);
        return h('div', { style: 'margin-bottom:4px' }, h('div', { class: 'stat-grid' }, h('span', { class: ch.majors.includes(id) ? 'maj' : '', text: label }), h('span', { text: ch.skills[id] })), h('div', { class: 'pbar' }, h('i', { style: `width:${pct}%` })));
      }));
    body.append(
      h('div', { class: 'col', style: 'width:250px' },
        h('h2', { text: p.name }),
        h('div', { class: 'details' }, `${RACES[ch.race].name} ${CLASSES[ch.cls].name}`, h('br'), BIRTHSIGNS[ch.sign].name),
        h('h3', { text: `Level ${ch.level}` }),
        h('div', { class: 'pbar', title: 'Progress to next level' }, h('i', { style: `width:${Math.min(100, (ch.levelProgress / levelNeeded(ch)) * 100)}%` })),
        h('div', { class: 'hint', text: `${Math.min(levelNeeded(ch), ch.levelProgress)}/${levelNeeded(ch)} skill increases to the next level (every skill counts)` }),
        canLevelUp(ch) ? h('button', { class: 'btn small', style: 'margin-top:6px', text: 'Level up! Choose an attribute', onclick: () => this.openLevelUp() }) : null,
        h('h3', { text: 'Attributes' }), attrs, h('h3', { text: 'Derived' }), derived),
      h('div', { class: 'col', style: 'flex:1;overflow-y:auto;flex-direction:row;gap:16px' }, skillCol('combat'), skillCol('magic'), skillCol('stealth')),
    );
  }

  tab_inventory(body, rerender) {
    const p = this.g.player;
    const filters = { all: 'All', weapon: 'Weapons', armor: 'Apparel', potion: 'Potions', ingredient: 'Ingredients', misc: 'Misc' };
    this.invFilter = this.invFilter || 'all';
    const details = h('div', { class: 'details', style: 'width:290px' });
    const showDetails = (it, count) => {
      details.innerHTML = '';
      if (!it) { details.append(h('div', { class: 'muted', text: 'Hover an item to inspect it. Click to use or equip. Press 1–8 while hovering to bind a hotkey.' })); return; }
      details.append(h('div', { class: 'name', text: it.name }));
      const lines = [];
      if (it.type === 'weapon') lines.push(`${SKILLS[it.skill][0]} weapon`, `Damage: ${it.damage}`, it.reach ? `Reach: ${it.reach}` : null, `Speed: ${it.speed}`);
      if (it.type === 'light') lines.push('Light source (off hand)', 'Lights the dark, but lets others see you');
      if (it.type === 'armor') lines.push(it.armorType === 'cloth' ? 'Clothing' : `${it.armorType === 'heavy' ? 'Heavy' : 'Light'} armor (${it.slot})`, it.rating ? `Armor rating: ${it.rating}` : null, it.fortifyMagicka ? `Fortify Magicka ${it.fortifyMagicka}` : null, it.fortifyHealth ? `Fortify Health ${it.fortifyHealth}` : null);
      if (it.type === 'arrow') lines.push(`Damage: ${it.damage}`);
      if (it.effects) for (const e of it.effects) lines.push(`Restore ${e.type[0].toUpperCase() + e.type.slice(1)} ${e.amount}`);
      lines.push(`Weight: ${it.weight}`, `Value: ${it.value}`);
      if (count > 1) lines.push(`Count: ${count}`);
      if (this.g.crime.stolen[it.id]) lines.push('STOLEN');
      for (const l of lines) if (l) details.append(h('div', { text: l }));
      if (it.desc) details.append(h('p', { class: 'muted', text: it.desc }));
      if (!it.quest && it.type !== 'gold') details.append(h('div', { style: 'margin-top:10px' }, h('button', { class: 'btn small', text: 'Drop one', onclick: () => {
        p.removeItem(it.id, 1);
        this.g.audio.play('pickup');
        rerender();
      } })));
    };
    const entries = p.inventory.entries().filter(({ item }) => {
      if (item.type === 'gold') return false;
      const f = this.invFilter;
      if (f === 'all') return true;
      if (f === 'weapon') return item.type === 'weapon' || item.type === 'arrow';
      if (f === 'misc') return ['misc', 'book', 'key', 'light'].includes(item.type);
      return item.type === f;
    }).sort((a, b) => a.item.type.localeCompare(b.item.type) || a.item.name.localeCompare(b.item.name));
    const list = h('div', { class: 'list', style: 'flex:1' },
      h('div', { class: 'head' }, h('span', { text: 'Name' }), h('span', { class: 'r', text: 'Wt · Val' })),
      ...entries.map(({ id, count, item }) => {
        const hk = Object.entries(p.hotkeys).find(([, v]) => v.item === id)?.[0];
        return h('div', {
          class: 'item' + (p.isEquipped(id) ? ' eq' : '') + (this.g.crime.stolen[id] ? ' stolen' : ''),
          onclick: () => { p.use(id); rerender(); },
          onmouseenter: () => { showDetails(item, count); this.hoverHotkey = (n) => { p.hotkeys[n] = { item: id, name: item.name }; this.notify(`${item.name} bound to ${n}.`); rerender(); }; },
          onmouseleave: () => { this.hoverHotkey = null; },
        }, `${glyphFor(item)} ${item.name}${count > 1 ? ` (${count})` : ''}${hk ? ` [${hk}]` : ''}`, h('span', { class: 'r', text: `${item.weight} · ${item.value}` }));
      }));
    showDetails(null);
    // your character, standing face-on in what you are wearing right now (drag to turn them round)
    const doll = h('div', { class: 'doll' });
    body.append(
      h('div', { class: 'dollcol' }, doll, h('div', { class: 'hint', style: 'text-align:center', text: `${p.name || 'You'} · Level ${p.ch.level}` })),
      h('div', { class: 'col', style: 'flex:1' },
        h('div', { class: 'filters' }, ...Object.entries(filters).map(([k, v]) => h('button', { class: 'btn' + (k === this.invFilter ? ' on' : ''), text: v, onclick: () => { this.invFilter = k; rerender(); } }))),
        list,
        h('div', { class: 'row hint' }, `Gold: ${fmt(p.inventory.gold)}`, h('div', { class: 'spacer' }), `Encumbrance: ${p.encumbrance().toFixed(1)} / ${p.carryLimit()}`, h('div', { class: 'spacer' }), `Armor rating: ${p.armorRating()}`)),
      details,
    );
    showPaperDoll(p, doll, 220, 372);
  }

  tab_magic(body, rerender) {
    const p = this.g.player;
    const details = h('div', { class: 'details', style: 'width:290px' }, h('div', { class: 'muted', text: 'Click a spell to select it, then cast with Q. Hover and press 1–8 to bind it to a hotkey.' }));
    const list = h('div', { class: 'list', style: 'flex:1' },
      h('div', { class: 'head' }, h('span', { text: 'Spell' }), h('span', { class: 'r', text: 'School · Cost' })),
      ...p.spells.map((id) => {
        const sp = SPELLS[id];
        const cost = sp.power ? 'Power' : spellCost(sp.cost, p.ch.skills[sp.school]);
        const hk = Object.entries(p.hotkeys).find(([, v]) => v.spell === id)?.[0];
        return h('div', {
          class: 'item' + (p.selectedSpell === id ? ' eq' : ''),
          onclick: () => { p.selectedSpell = id; this.g.audio.play('ui'); rerender(); },
          onmouseenter: () => {
            details.innerHTML = '';
            details.append(h('div', { class: 'name', text: sp.name }), h('div', { text: sp.desc }), h('div', { text: `School: ${SKILLS[sp.school][0]}` }), h('div', { text: sp.power ? 'Greater power: once per day' : `Magicka cost: ${cost}` }),
              sp.min ? h('div', { class: p.ch.skills[sp.school] < sp.min ? 'owned' : '', text: `Requires ${SKILLS[sp.school][0]} ${sp.min}` }) : null);
            this.hoverHotkey = (n) => { p.hotkeys[n] = { spell: id, name: sp.name }; this.notify(`${sp.name} bound to ${n}.`); rerender(); };
          },
          onmouseleave: () => { this.hoverHotkey = null; },
        }, `✦ ${sp.name}${hk ? ` [${hk}]` : ''}`, h('span', { class: 'r', text: `${SKILLS[sp.school][0]} · ${cost}` }));
      }));
    body.append(h('div', { class: 'col', style: 'flex:1' }, list), details);
  }

  tab_journal(body, rerender) {
    const q = this.g.quests;
    const list = q.list().sort((a, b) => (a.done - b.done) || (QUESTS[b.id].main ? 1 : 0) - (QUESTS[a.id].main ? 1 : 0));
    this.journalSel = this.journalSel && q.stages[this.journalSel] ? this.journalSel : (q.active || list[0]?.id);
    const entries = h('div', { class: 'col', style: 'flex:1.4;overflow-y:auto;padding-right:8px' });
    if (this.journalSel) {
      const def = QUESTS[this.journalSel];
      entries.append(h('h2', { text: def.name }));
      for (const e of q.log.filter((l) => l.quest === this.journalSel).reverse()) entries.append(h('p', { style: 'font-size:17px;line-height:1.5' }, h('span', { class: 'muted', text: `Day ${e.day}. ` }), e.text));
      if (!q.done(this.journalSel) && q.active !== this.journalSel) entries.append(h('button', { class: 'btn small', text: 'Make active quest', onclick: () => { q.active = this.journalSel; rerender(); } }));
    } else entries.append(h('p', { class: 'muted', text: 'No quests yet.' }));
    body.append(
      h('div', { class: 'col', style: 'flex:0.8' }, h('h3', { text: 'Quests' }), h('div', { class: 'list', style: 'flex:1' },
        ...list.map((x) => h('div', { class: 'item' + (x.id === this.journalSel ? ' sel' : ''), style: x.done ? 'text-decoration:line-through;opacity:.7' : '', onclick: () => { this.journalSel = x.id; rerender(); } },
          (q.active === x.id ? '▼ ' : '') + x.def.name, h('span', { class: 'r', text: x.def.main ? 'Main' : '' }))))),
      entries,
    );
  }

  worldMapImage() {
    if (this._mapImg) return this._mapImg;
    const S = 512;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(S, S);
    const t = this.g.cells.world.terrain;
    const toW = (px) => (px / S) * 2 * WORLD_HALF - WORLD_HALF;
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const wx = toW(x + 0.5), wz = toW(y + 0.5);
        const hgt = t.heightAt(wx, wz);
        const hx = t.heightAt(wx + 3, wz) - hgt, hz = t.heightAt(wx, wz + 3) - hgt;
        const shade = Math.max(0.6, Math.min(1.25, 1 - (hx + hz) * 0.08));
        let r, g, b;
        if (hgt < 0) { const d = Math.min(1, -hgt / 9); r = 150 - d * 40; g = 160 - d * 35; b = 150 - d * 20; }
        else { r = 214 - hgt * 0.6; g = 196 - hgt * 0.8; b = 150 - hgt * 0.7; }
        r *= shade; g *= shade; b *= shade;
        const i = (y * S + x) * 4;
        img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    // roads
    ctx.strokeStyle = 'rgba(110,60,20,0.75)'; ctx.lineWidth = 2; ctx.setLineDash([5, 3]);
    const toP = (w) => ((w + WORLD_HALF) / (2 * WORLD_HALF)) * S;
    for (const road of ROADS) { ctx.beginPath(); road.forEach(([x, z], i) => (i ? ctx.lineTo(toP(x), toP(z)) : ctx.moveTo(toP(x), toP(z)))); ctx.stroke(); }
    ctx.setLineDash([]);
    // vignette
    const grd = ctx.createRadialGradient(S / 2, S / 2, S * 0.3, S / 2, S / 2, S * 0.75);
    grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(80,50,20,0.55)');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, S, S);
    this._mapImg = c;
    return c;
  }

  tab_map(body) {
    const g = this.g;
    if (!g.cells.world) return;
    const S = 512, scale = 1.3;
    const base = this.worldMapImage();
    const cv = h('canvas', { width: S * scale, height: S * scale });
    const ctx = cv.getContext('2d');
    const toP = (w) => ((w + WORLD_HALF) / (2 * WORLD_HALF)) * S * scale;
    ctx.drawImage(base, 0, 0, S * scale, S * scale);
    ctx.font = '13px Cinzel, Georgia, serif';
    const hits = [];
    for (const [id, L] of Object.entries(LOCATIONS)) {
      const known = L.discovered || g.discovered[id];
      if (!known) continue;
      const x = toP(L.x), y = toP(L.z);
      ctx.fillStyle = '#3a1a08';
      ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill();
      ctx.fillStyle = '#e8c878';
      ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill();
      ctx.fillStyle = '#2a1408';
      ctx.fillText(L.name, x + 8, y + 4);
      hits.push({ id, x, y, name: L.name });
    }
    // quest marker
    const q = this.questTargetWorld();
    if (q) {
      const x = toP(q.x), y = toP(q.z);
      ctx.fillStyle = '#d8a000'; ctx.strokeStyle = '#3a1a08'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, y + 2); ctx.lineTo(x - 8, y - 12); ctx.lineTo(x + 8, y - 12); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    // player arrow
    let pp = g.player.pos, yaw = g.player.yaw;
    if (g.cell.id !== 'world') { const r = g.doorReturns._last; if (r) pp = { x: r.x, z: r.z }; }
    if (g.cell.id !== 'oblivion') {
      const x = toP(pp.x), y = toP(pp.z);
      ctx.save(); ctx.translate(x, y); ctx.rotate(-yaw);
      ctx.fillStyle = '#b01010'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(6, 7); ctx.lineTo(0, 3); ctx.lineTo(-6, 7); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    const tip = h('div', { class: 'hint', text: g.cell.interior || g.cell.id === 'oblivion' ? 'You cannot fast travel from here.' : 'Click a discovered location to fast travel.' });
    cv.addEventListener('click', (e) => {
      const r = cv.getBoundingClientRect();
      const mx = (e.clientX - r.left) * (cv.width / r.width), my = (e.clientY - r.top) * (cv.height / r.height);
      const hit = hits.find((hh) => Math.hypot(hh.x - mx, hh.y - my) < 12);
      if (hit) {
        if (g.cell.interior || g.cell.id === 'oblivion') return this.notify('You cannot fast travel from here.');
        g.fastTravel(hit.id);
      }
    });
    body.append(h('div', { class: 'col', style: 'flex:1' }, h('div', { class: 'mapwrap' }, cv), tip));
  }

  questTargetWorld() {
    const g = this.g;
    const cur = g.quests.current();
    if (!cur?.info.target) return null;
    const t = cur.info.target;
    if (t.world) return t.world;
    if (t.cell === 'oblivion' || t.sigil) return LOCATIONS.gate;
    return null;
  }

  // ================================================================ dialogue
  openDialogue(actor) {
    const g = this.g;
    const D = DIALOGUE[actor.def.dialogue] || DIALOGUE.citizen;
    const panel = h('div', { class: 'parch dialogue' });
    const textEl = h('div', { class: 'text' });
    const topicsEl = h('div', { class: 'list topics' });
    const dispEl = h('div', { class: 'disp' });
    const btns = h('div', { class: 'row', style: 'margin-top:12px;flex-wrap:wrap' });
    actor.yaw = Math.atan2(g.player.pos.x - actor.pos.x, g.player.pos.z - actor.pos.z);
    const say = (txt, you) => {
      if (you) textEl.append(h('p', { class: 'you', text: you }));
      textEl.append(h('p', { text: txt }));
      textEl.scrollTop = textEl.scrollHeight;
    };
    const read = (this.readTopics ||= {});
    const refresh = () => {
      dispEl.textContent = `Disposition: ${Math.round(actor.disposition)}`;
      topicsEl.innerHTML = '';
      for (const t of D.topics) {
        if (t.show && !t.show(g, actor)) continue;
        const key = actor.uid + ':' + t.id;
        topicsEl.append(h('div', { class: 'item' + (read[key] ? ' read' : ''), text: t.label, onclick: () => {
          read[key] = true;
          say(t.say(g, actor), t.label);
          g.player.exercise('speechcraft', 0.05);
          refresh();
        } }));
      }
      btns.innerHTML = '';
      btns.append(h('button', { class: 'btn small', text: 'Persuade', onclick: () => this.openPersuade(actor, refresh) }));
      btns.append(h('button', { class: 'btn small', text: 'Bribe (10g)', disabled: g.player.inventory.gold < 10 ? '' : null, onclick: () => {
        g.player.removeItem('gold', 10); actor.disposition = Math.min(100, actor.disposition + 6 + g.player.ch.skills.mercantile * 0.05);
        say(['Well... that is generous of you.', 'Coin is always welcome.', 'Hm. Thank you.'][Math.floor(Math.random() * 3)]); g.audio.play('gold'); refresh();
      } }));
      if (actor.merchant) btns.append(h('button', { class: 'btn small', text: 'Barter', onclick: () => this.openBarter(actor) }));
      if (actor.merchant === 'spells' || (actor.merchant === 'wizard' && g.flags.wizardShop) || (actor.merchant === 'guild' && g.flags.mgMember)) btns.append(h('button', { class: 'btn small', text: actor.merchant === 'wizard' ? 'Wonders' : actor.merchant === 'guild' ? 'Guild Spells' : 'Spells', onclick: () => this.openSpellShop(actor) }));
      if (actor.uid === 'emfrid' || actor.def.innkeeper) {
        const rented = g.rentedUntil > g.time.hours;
        btns.append(h('button', { class: 'btn small', text: rented ? 'Room rented' : 'Rent Room (10g)', disabled: rented || g.player.inventory.gold < 10 ? '' : null, onclick: () => {
          g.player.removeItem('gold', 10); g.rentedUntil = g.time.hours + 24; say('Here you are. The beds along the west wall are yours for the night. Sleep well!'); g.audio.play('gold'); refresh();
        } }));
      }
      if (actor.def.ai === 'guard' && g.crime.bounty > 0) btns.append(h('button', { class: 'btn small', text: `Pay bounty (${g.crime.bounty}g)`, disabled: g.player.inventory.gold < g.crime.bounty ? '' : null, onclick: () => { g.crime.payFine(); refresh(); } }));
      btns.append(h('div', { class: 'spacer' }), h('button', { class: 'btn', text: 'Goodbye', onclick: () => this.closeModal() }));
    };
    panel.append(
      h('div', { class: 'row' }, h('h2', { text: actor.name, style: 'margin:0;border:0' }), h('div', { class: 'spacer' }), dispEl),
      h('div', { class: 'body' }, textEl, topicsEl), btns);
    say(D.greeting(g, actor));
    refresh();
    this.open(h('div', { class: 'overlay clear', style: 'align-items:end;padding-bottom:4vh' }, panel), 'dialogue');
  }

  openArrest(guard, bounty) {
    const g = this.g;
    const canPay = g.player.inventory.gold >= bounty;
    const panel = h('div', { class: 'parch msg' },
      h('h2', { text: guard.name }),
      h('p', { text: 'Stop right there, criminal scum! You violated the law. Pay the court a fine or serve your sentence. Your stolen goods are now forfeit.' }),
      h('p', { class: 'muted', text: `Bounty: ${bounty} gold.` }),
      h('div', { class: 'row', style: 'flex-wrap:wrap' },
        h('button', { class: 'btn', text: `Pay the fine (${bounty}g)`, disabled: canPay ? null : '', onclick: () => { g.crime.payFine(); this.closeModal(); } }),
        h('button', { class: 'btn', text: 'Go to jail', onclick: () => { this.closeModal(false); g.crime.jail(); } }),
        h('button', { class: 'btn', text: 'Resist arrest', onclick: () => { this.closeModal(); g.crime.resist(); } }),
      ),
    );
    this.modalEsc = () => { this.closeModal(); g.crime.resist(); };
    this.open(h('div', { class: 'overlay' }, panel), 'dialogue');
  }

  openPersuade(actor, after) {
    const g = this.g, p = g.player;
    const options = ['Admire', 'Boast', 'Coerce', 'Joke'];
    const reactions = [['beams with delight', 14], ['smiles', 8], ['frowns slightly', -6], ['scowls', -12]];
    let round = 0;
    const panel = h('div', { class: 'parch msg' });
    const wrap = h('div', { class: 'overlay', style: 'z-index:15' }, panel);
    const render = (msg) => {
      // shuffle preferences each round
      const prefs = [...reactions].sort(() => Math.random() - 0.5);
      panel.innerHTML = '';
      const face = h('p', { class: 'muted', text: msg || `${actor.name} regards you carefully. (Hover an approach to read their face.)` });
      const grid = h('div', { class: 'persuade-grid' }, ...options.map((o, i) => h('button', {
        class: 'btn', text: o,
        onmouseenter: () => { face.textContent = `${actor.name} ${p.ch.skills.speechcraft > 20 || Math.random() < 0.7 ? prefs[i][0] : '…is hard to read'} at the thought.`; },
        onclick: () => {
          const amt = Math.round(prefs[i][1] * (0.7 + p.ch.skills.speechcraft / 100) * (prefs[i][1] < 0 ? 1 - p.ch.attrs.personality / 200 : 1));
          actor.disposition = Math.max(0, Math.min(100, actor.disposition + amt));
          p.exercise('speechcraft', 1);
          round++;
          g.audio.play('ui');
          if (round >= 4) { wrap.remove(); after?.(); return; }
          render(`${actor.name} ${amt >= 0 ? 'warms to you' : 'bristles'} (${amt >= 0 ? '+' : ''}${amt}). Disposition: ${Math.round(actor.disposition)}.`);
        },
      })));
      panel.append(h('h2', { text: `Persuade ${actor.name} (${round + 1}/4)` }), face, grid,
        h('div', { class: 'row' }, h('div', { class: 'spacer' }), h('button', { class: 'btn small', text: 'Done', onclick: () => { wrap.remove(); after?.(); } })));
    };
    render();
    this.root.append(wrap);
  }

  // ================================================================ trade / containers
  merchantInventory(actor) {
    if (!actor.shop) {
      const M = MERCHANTS[actor.merchant];
      actor.shop = new Inventory();
      for (const spec of M.stock) { const [id, n] = parseSpec(spec); actor.shop.add(id, n); }
      actor.shopGold = M.gold;
    }
    return actor.shop;
  }

  openBarter(actor) {
    const g = this.g, p = g.player;
    const shop = this.merchantInventory(actor);
    const panel = h('div', { class: 'parch menu' });
    const render = () => {
      panel.innerHTML = '';
      const buyMul = priceMultiplier(p.ch.skills.mercantile, actor.disposition, true);
      const sellMul = priceMultiplier(p.ch.skills.mercantile, actor.disposition, false);
      const mkList = (inv, buying) => h('div', { class: 'list', style: 'flex:1' },
        h('div', { class: 'head' }, h('span', { text: buying ? `${actor.name}'s wares` : 'Your items' }), h('span', { class: 'r', text: 'Price' })),
        ...inv.entries().filter((e) => e.item.type !== 'gold' && (buying || !e.item.quest)).sort((a, b) => a.item.type.localeCompare(b.item.type) || a.item.value - b.item.value).map(({ id, count, item }) => {
          const price = FLOWERS.includes(id) ? FLOWER_PRICE : Math.max(1, Math.round(item.value * (buying ? buyMul : sellMul)));
          const afford = buying ? p.inventory.gold >= price : actor.shopGold >= price;
          return h('div', { class: 'item' + (afford ? '' : ' stolen') + (!buying && p.isEquipped(id) ? ' eq' : ''), onclick: () => {
            if (!afford) return this.notify(buying ? 'You cannot afford that.' : `${actor.name} cannot afford that.`);
            if (buying) { p.removeItem('gold', price); shop.remove(id, 1); p.inventory.add(id, 1); actor.shopGold += price; }
            else {
              if (g.crime.stolen[id] && actor.merchant !== 'spells') { /* fences are for thieves; merchants grumble but buy */ }
              p.removeItem(id, 1); shop.add(id, 1); p.inventory.add('gold', price); actor.shopGold -= price;
              if (g.crime.stolen[id]) { g.crime.stolen[id]--; if (g.crime.stolen[id] <= 0) delete g.crime.stolen[id]; }
            }
            p.exercise('mercantile', 0.3);
            g.audio.play('gold', 0.6);
            render();
          } }, `${glyphFor(item)} ${item.name}${count > 1 ? ` (${count})` : ''}`, h('span', { class: 'r', text: `${price}g` }));
        }));
      panel.append(
        h('div', { class: 'row' }, h('h2', { text: `Barter — ${actor.name}`, style: 'border:0;margin:0' }), h('div', { class: 'spacer' }), h('button', { class: 'btn small', text: 'Done', onclick: () => this.openDialogue(actor) })),
        h('div', { class: 'tab-body', style: 'margin-top:10px' }, h('div', { class: 'col', style: 'flex:1' }, mkList(shop, true), h('div', { class: 'hint', text: `Merchant gold: ${fmt(actor.shopGold)}` })),
          h('div', { class: 'col', style: 'flex:1' }, mkList(p.inventory, false), h('div', { class: 'hint', text: `Your gold: ${fmt(p.inventory.gold)} · Encumbrance ${p.encumbrance().toFixed(0)}/${p.carryLimit()}` }))),
      );
    };
    render();
    this.modalEsc = () => this.openDialogue(actor);
    this.open(h('div', { class: 'overlay' }, panel), 'dialogue');
  }

  openSpellShop(actor) {
    const g = this.g, p = g.player;
    const panel = h('div', { class: 'parch', style: 'width:min(620px,92vw);height:min(520px,80vh);display:flex;flex-direction:column' });
    const render = () => {
      panel.innerHTML = '';
      const ids = actor.merchant === 'wizard' ? WIZARD_SHOP : actor.merchant === 'guild' ? GUILD_SPELLS.filter((s) => !s.magister || g.flags.mgMagister).map((s) => s.id) : Object.keys(SPELL_PRICES);
      const list = h('div', { class: 'list', style: 'flex:1' }, ...ids.filter((id) => !p.spells.includes(id)).map((id) => {
        const sp = SPELLS[id], price = SPELL_PRICE;
        return h('div', { class: 'item', onclick: () => {
          if (p.inventory.gold < price) return this.notify('You cannot afford that spell.');
          p.removeItem('gold', price); p.spells.push(id); g.audio.play('skillUp'); this.notify(`You learned ${sp.name}.`); render();
        } }, `✦ ${sp.name} — ${sp.desc}`, h('span', { class: 'r', text: `${SKILLS[sp.school][0]} ${sp.min} · ${price}g` }));
      }));
      panel.append(h('h2', { text: `Spells — ${actor.name}` }), list,
        h('div', { class: 'row', style: 'margin-top:10px' }, h('span', { class: 'hint', text: `Your gold: ${fmt(p.inventory.gold)}` }), h('div', { class: 'spacer' }), h('button', { class: 'btn', text: 'Done', onclick: () => this.openDialogue(actor) })));
    };
    render();
    this.modalEsc = () => this.openDialogue(actor);
    this.open(h('div', { class: 'overlay' }, panel), 'dialogue');
  }

  openContainer({ name, inventory, owner, interact, actor }) {
    const g = this.g, p = g.player;
    const panel = h('div', { class: 'parch menu', style: 'height:min(560px,84vh)' });
    const render = () => {
      panel.innerHTML = '';
      const take = (id, n) => {
        if (owner) g.crime.theft(id, n, owner);
        inventory.remove(id, n);
        if (id === 'gold') g.audio.play('gold'); else g.audio.play('pickup', 0.6);
        p.inventory.add(id, n);
        g.onItemGained(id);
        if (interact) g.persistContainer(interact);
      };
      const theirs = h('div', { class: 'list', style: 'flex:1' },
        h('div', { class: 'head' }, h('span', { text: name }), h('span', { class: 'r', text: 'Wt · Val' })),
        ...inventory.entries().map(({ id, count, item }) => h('div', { class: 'item', onclick: () => { take(id, count); render(); } },
          `${glyphFor(item)} ${item.name}${count > 1 ? ` (${count})` : ''}`, h('span', { class: 'r', text: `${item.weight} · ${item.value}` }))));
      if (!inventory.entries().length) theirs.append(h('div', { class: 'item muted', text: 'Empty' }));
      const mine = h('div', { class: 'list', style: 'flex:1' },
        h('div', { class: 'head' }, h('span', { text: 'Your items (click to place)' })),
        ...p.inventory.entries().filter((e) => !e.item.quest && e.item.type !== 'gold').map(({ id, count, item }) => h('div', { class: 'item' + (p.isEquipped(id) ? ' eq' : ''), onclick: () => {
          p.removeItem(id, 1); inventory.add(id, 1); if (interact) g.persistContainer(interact); g.audio.play('pickup', 0.5); render();
        } }, `${glyphFor(item)} ${item.name}${count > 1 ? ` (${count})` : ''}`)));
      panel.append(
        h('div', { class: 'row' }, h('h2', { text: name, style: 'border:0;margin:0' }), owner ? h('span', { class: 'owned', style: 'color:#8a1a10;font-weight:bold', text: `Owned by ${owner} — taking is stealing` }) : null,
          h('div', { class: 'spacer' }),
          h('button', { class: 'btn', text: 'Take All', onclick: () => { for (const e of inventory.entries()) take(e.id, e.count); this.closeModal(); } }),
          h('button', { class: 'btn', text: 'Close', onclick: () => this.closeModal() })),
        h('div', { class: 'tab-body', style: 'margin-top:10px' }, theirs, mine),
        h('div', { class: 'hint', text: `Encumbrance: ${p.encumbrance().toFixed(1)} / ${p.carryLimit()} · Gold: ${fmt(p.inventory.gold)}` }),
      );
    };
    render();
    this.open(h('div', { class: 'overlay' }, panel), 'menu');
  }

  // ================================================================ lockpicking
  openLockpick(target, onSuccess) {
    const g = this.g, p = g.player;
    const level = target.lock.level;
    if (!p.inventory.has('lockpick')) {
      this.showMessage(target.name, `This lock (${['', 'Very Easy', 'Easy', 'Average', 'Hard', 'Very Hard'][level]}) requires a lockpick${target.lock.key ? ` or the ${ITEMS[target.lock.key].name}` : ''}. You have none.`);
      return;
    }
    const N = Math.min(5, level + 1);
    const tumblers = Array.from({ length: N }, () => ({ state: 'down', y: 0, t: 0, hang: 0 }));
    let cur = 0;
    const panel = h('div', { class: 'parch lockpick' });
    const tumEls = [];
    const box = h('div', { class: 'tumblers' });
    const rod = h('div', { class: 'pickrod' });
    for (let i = 0; i < N; i++) {
      const pin = h('div', { class: 'pin' });
      const spring = h('div', { class: 'spring' });
      const t = h('div', { class: 'tumbler', onclick: () => act(i) }, spring, pin);
      tumEls.push({ t, pin, spring });
      box.append(t);
    }
    box.append(rod);
    const status = h('div', { class: 'hint' });
    const picksEl = h('span');
    panel.append(
      h('h2', { text: `Lockpicking — ${target.name}` }),
      h('div', { class: 'muted', text: 'Click the highlighted tumbler (or press W) to push it up. Click again (or press Space) while it hangs at the top to set it. Mistime it and you may break your pick.' }),
      box, status,
      h('div', { class: 'row', style: 'margin-top:10px' }, picksEl, h('div', { class: 'spacer' }),
        h('button', { class: 'btn', text: 'Auto Attempt', onclick: () => auto() }),
        h('button', { class: 'btn', text: 'Close', onclick: () => close() })),
    );
    const sec = () => p.ch.skills.security;
    const hangTime = () => (Math.random() < 0.5 ? 0.12 : 0.55) * (0.8 + sec() / 100) * (1.2 - level * 0.08);
    const refresh = () => {
      picksEl.textContent = `Lockpicks: ${p.inventory.count('lockpick')} · Security ${sec()}`;
      tumEls.forEach((e, i) => {
        const tm = tumblers[i];
        e.t.classList.toggle('cur', i === cur);
        e.t.classList.toggle('set', tm.state === 'set');
        e.pin.style.bottom = (tm.y * 72) + 'px';
        e.spring.style.height = (80 - tm.y * 72) + 'px';
      });
      const rect = tumEls[cur]?.t;
      if (rect) rod.style.left = (rect.offsetLeft - 120) + 'px';
    };
    const breakPick = () => {
      if (Math.random() < 0.75 - sec() * 0.006) {
        p.removeItem('lockpick', 1);
        g.audio.play('lockBreak');
        status.textContent = 'Your lockpick snapped!';
        for (const tm of tumblers) if (tm.state !== 'set' || Math.random() < 0.5) { tm.state = tm.state === 'set' ? 'falling' : tm.state; }
        // a broken pick drops the current tumbler and maybe the previous
        cur = Math.max(0, tumblers.findIndex((t) => t.state !== 'set'));
        if (!p.inventory.has('lockpick')) { status.textContent = 'Your last lockpick broke.'; setTimeout(close, 900); }
      } else status.textContent = 'Careful...';
    };
    const success = () => {
      g.unlockInteractable(target);
      p.exercise('security', 1 + level * 0.5);
      status.textContent = 'The lock opens!';
      setTimeout(() => { close(false); onSuccess?.(); }, 450);
    };
    const act = (i) => {
      if (i !== cur) return;
      const tm = tumblers[cur];
      if (tm.state === 'down') { tm.state = 'rising'; tm.t = 0; g.audio.play('lockClick'); }
      else if (tm.state === 'hang') {
        tm.state = 'set'; tm.y = 1; g.audio.play('lockSet'); p.exercise('security', 0.25);
        cur = tumblers.findIndex((t) => t.state !== 'set');
        if (cur < 0) { cur = N - 1; success(); }
      } else if (tm.state === 'rising' || tm.state === 'falling') breakPick();
    };
    const auto = () => {
      const chance = Math.min(0.95, (sec() / 100) * 0.9 + p.ch.attrs.luck / 400 + 0.15 - level * 0.12);
      if (Math.random() < chance) success();
      else { p.removeItem('lockpick', 1); g.audio.play('lockBreak'); status.textContent = 'The auto attempt failed and your pick broke.'; if (!p.inventory.has('lockpick')) setTimeout(close, 900); }
      refresh();
    };
    let raf = null, last = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      for (const tm of tumblers) {
        if (tm.state === 'rising') { tm.y += dt / 0.12; if (tm.y >= 1) { tm.y = 1; tm.state = 'hang'; tm.hang = hangTime(); } }
        else if (tm.state === 'hang') { tm.hang -= dt; if (tm.hang <= 0) tm.state = 'falling'; }
        else if (tm.state === 'falling') { tm.y -= dt / 0.28; if (tm.y <= 0) { tm.y = 0; tm.state = 'down'; } }
      }
      refresh();
      raf = requestAnimationFrame(tick);
    };
    const close = (resume = true) => { cancelAnimationFrame(raf); this.lockpickKey = null; this.closeModal(resume); };
    this.lockpickKey = (e) => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp') { if (tumblers[cur].state === 'down') act(cur); return true; }
      if (e.code === 'Space' || e.code === 'Enter') { act(cur); return true; }
      return false;
    };
    this.modalEsc = () => close();
    this.open(h('div', { class: 'overlay' }, panel), 'menu');
    raf = requestAnimationFrame(tick);
  }

  // ================================================================ wait / level
  openWait(sleeping) {
    const g = this.g;
    if (g.inCombat() || g.anyEnemyNear(25)) return this.notify('You cannot rest with enemies nearby.');
    if (g.player.swimming || !g.player.onGround) return this.notify('You cannot rest now.');
    let hours = sleeping ? 8 : 1;
    const valEl = h('span', { text: `${hours} hour${hours > 1 ? 's' : ''}` });
    const panel = h('div', { class: 'parch', style: 'width:min(420px,92vw)' },
      h('h2', { text: sleeping ? 'Sleep' : 'Wait' }),
      h('p', { class: 'muted', text: sleeping ? (canLevelUp(g.player.ch) ? 'You feel ready to meditate on what you have learned.' : 'Rest restores your health, magicka and fatigue.') : 'Waiting restores health and magicka. Sleep in a bed to level up.' }),
      h('div', { class: 'row' }, 'Hours', h('div', { class: 'spacer' }), valEl),
      h('input', { type: 'range', min: 1, max: 24, value: hours, oninput: (e) => { hours = +e.target.value; valEl.textContent = `${hours} hour${hours > 1 ? 's' : ''}`; } }),
      h('div', { class: 'row', style: 'margin-top:12px' }, h('div', { class: 'spacer' }),
        h('button', { class: 'btn', text: 'Cancel', onclick: () => this.closeModal() }),
        h('button', { class: 'btn', text: sleeping ? 'Rest' : 'Wait', onclick: () => {
          this.closeModal(false);
          this.showLoading(g.cell.id, sleeping ? 'You sleep...' : 'Time passes...');
          setTimeout(() => {
            this.hideLoading();
            g.state = 'playing';
            g.passTime(hours, sleeping);
            if (g.state === 'playing') { this.relock(); this.notify(`You ${sleeping ? 'slept' : 'waited'} for ${hours} hour${hours > 1 ? 's' : ''}.`); }
          }, 700);
        } })),
    );
    this.open(h('div', { class: 'overlay' }, panel), 'menu');
  }

  openLevelUp() {
    const g = this.g, p = g.player, ch = p.ch;
    let chosen = null;
    const panel = h('div', { class: 'parch levelup', style: 'width:min(520px,92vw)' });
    const render = () => {
      panel.innerHTML = '';
      panel.append(h('h2', { text: `Level ${ch.level + 1}` }), h('p', { class: 'muted', text: `Everything you have practised has made you stronger. Choose one attribute to raise by ${LEVEL_ATTR_GAIN}. (Your Health rises with every level too.)` }));
      for (const a of ATTRIBUTES) {
        const gain = Math.min(LEVEL_ATTR_GAIN, 100 - ch.attrs[a]);
        panel.append(h('div', { class: 'attr' + (chosen === a ? ' on' : ''), title: ATTR_HINT[a], onclick: () => { chosen = a; g.audio.play('ui'); render(); } },
          h('span', { text: ATTR_LABEL[a] }), h('span', { class: 'muted', text: `${ch.attrs[a]}${chosen === a ? ' → ' + (ch.attrs[a] + gain) : ''}` }), h('span', { class: 'bonus', text: gain ? `+${gain}` : 'max' })));
        if (chosen === a) panel.append(h('div', { class: 'hint', style: 'margin:-2px 0 6px 10px', text: ATTR_HINT[a] }));
      }
      panel.append(h('div', { class: 'row', style: 'margin-top:10px' }, h('button', { class: 'btn', text: 'Later', onclick: () => this.closeModal() }), h('div', { class: 'spacer' }), h('button', { class: 'btn', text: 'Level Up', disabled: chosen ? null : '', onclick: () => {
        applyLevelUp(ch, chosen);
        p.recalc(true);
        g.audio.play('levelUp');
        g.particles.burst(p.pos, 'magic', 40, 0xffe080);
        this.notify(`You have reached level ${ch.level}! ${ATTR_LABEL[chosen]} +${LEVEL_ATTR_GAIN}, Health +${LEVEL_HEALTH_GAIN}.`, 'level');
        this.closeModal();
        g.autosave();
        // more than one level earned at once: choose again
        if (canLevelUp(ch)) setTimeout(() => this.openLevelUp(), 300);
      } })));
    };
    render();
    this.modalEsc = () => this.closeModal();
    this.open(h('div', { class: 'overlay' }, panel), 'menu');
  }
}
