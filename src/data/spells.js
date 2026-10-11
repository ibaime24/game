// Spell definitions. kind: 'bolt' (projectile), 'self', 'touch', 'summon', 'light', 'detect', 'unlock', 'power'

export const SPELLS = {
  flare: { id: 'flare', name: 'Flare', school: 'destruction', min: 0, cost: 9, kind: 'bolt', element: 'fire', damage: 14, speed: 24, color: 0xff6a20, desc: 'Fire damage 14 pts on target.' },
  shock_bolt: { id: 'shock_bolt', name: 'Shock Bolt', school: 'destruction', min: 25, cost: 20, kind: 'bolt', element: 'shock', damage: 24, speed: 40, color: 0x80a0ff, desc: 'Shock damage 24 pts on target.' },
  frostbite: { id: 'frostbite', name: 'Frostbite', school: 'destruction', min: 0, cost: 14, kind: 'bolt', element: 'frost', damage: 16, speed: 22, slow: true, color: 0xb0f0ff, desc: 'Frost damage 16 pts on target, slows.' },
  fireball: { id: 'fireball', name: 'Fireball', school: 'destruction', min: 40, cost: 40, kind: 'bolt', element: 'fire', damage: 40, radius: 5, speed: 22, color: 0xff4010, desc: 'Fire damage 40 pts in 5 m on target.' },
  serpent_spell: { id: 'serpent_spell', name: 'Serpent Spell', school: 'destruction', min: 0, cost: 0, kind: 'bolt', element: 'poison', damage: 30, speed: 26, color: 0x50ff50, power: true, desc: 'Poison 30 pts on target. Once a day.' },
  heal_minor: { id: 'heal_minor', name: 'Heal Minor Wounds', school: 'restoration', min: 0, cost: 12, kind: 'self', heal: 22, color: 0x80ff90, desc: 'Restore Health 22 pts on self.' },
  heal_major: { id: 'heal_major', name: 'Heal Major Wounds', school: 'restoration', min: 40, cost: 45, kind: 'self', heal: 90, color: 0x80ff90, desc: 'Restore Health 90 pts on self.' },
  protect: { id: 'protect', name: 'Protect', school: 'alteration', min: 0, cost: 14, kind: 'self', shield: 20, duration: 30, color: 0x9090ff, desc: 'Shield 20% for 30 secs on self.' },
  open_easy_lock: { id: 'open_easy_lock', name: 'Open Easy Lock', school: 'alteration', min: 0, cost: 16, kind: 'unlock', lockLevel: 2, color: 0xffe080, desc: 'Open Easy (level 2) lock on target.' },
  summon_skeleton: { id: 'summon_skeleton', name: 'Summon Skeleton', school: 'conjuration', min: 0, cost: 28, kind: 'summon', creature: 'skeleton_summon', duration: 35, color: 0xd0d0ff, desc: 'Summon Skeleton for 35 secs.' },
  summon_scamp: { id: 'summon_scamp', name: 'Summon Scamp', school: 'conjuration', min: 25, cost: 40, kind: 'summon', creature: 'scamp_summon', duration: 40, color: 0xff8060, desc: 'Summon Scamp for 40 secs.' },
  starlight: { id: 'starlight', name: 'Starlight', school: 'illusion', min: 0, cost: 6, kind: 'light', duration: 90, color: 0xfff0c0, desc: 'Light 15 ft for 90 secs on self.' },
  detect_life: { id: 'detect_life', name: 'Detect Life', school: 'mysticism', min: 0, cost: 16, kind: 'detect', duration: 30, color: 0xc080ff, desc: 'Detect Life 120 ft for 30 secs.' },
  // birthsign powers (no cost, once a day)
  blood_of_north: { id: 'blood_of_north', name: 'Blood of the North', school: 'restoration', min: 0, cost: 0, kind: 'self', heal: 90, color: 0xff6060, power: true, desc: 'Restore Health 90 pts. Once a day.' },
  maras_gift: { id: 'maras_gift', name: "Mara's Gift", school: 'restoration', min: 0, cost: 0, kind: 'self', heal: 200, color: 0xffd0ff, power: true, desc: 'Restore Health 200 pts. Once a day.' },
  lovers_kiss: { id: 'lovers_kiss', name: "Lover's Kiss", school: 'alteration', min: 0, cost: 0, kind: 'self', shield: 30, duration: 60, color: 0xff90c0, power: true, desc: 'Shield 30% for 60 secs. Once a day.' },
  spirit_deer: { id: 'spirit_deer', name: 'Summon Spirit Hart', school: 'conjuration', min: 0, cost: 38, kind: 'summon', creature: 'spirit_deer', duration: 60, color: 0x9affd0, desc: 'Call a Spirit Hart of the Greenheart for 60 secs. It follows you, and while you are hurt it mends your wounds every few seconds.' },
  moonshadow: { id: 'moonshadow', name: 'Moonshadow', school: 'illusion', min: 0, cost: 0, kind: 'invisibility', duration: 60, color: 0x8080a0, power: true, desc: 'Invisibility for 60 secs. Once a day.' },
};

// ---- Aldous Quillwhistle's Libram of Lesser Wonders: 25 spells, each with its own casting gesture
// (anim: push | raise | sweep | slam | pull | self | flick) and its own effect (see src/fx/spellbook.js).
const W = (id, name, school, min, cost, price, color, anim, desc, extra = {}) => ({ id, name, school, min, cost, kind: 'special', color, anim, desc, price, wonder: true, ...extra });
export const WONDERS = [
  // Destruction
  W('chain_lightning', 'Chain Lightning', 'destruction', 0, 28, 140, 0xa8c8ff, 'push', 'Shock 22 pts on target, arcing to 3 more foes nearby.', { element: 'shock', damage: 22 }),
  W('frost_nova', 'Frost Nova', 'destruction', 0, 30, 150, 0xc0f0ff, 'slam', 'Frost 18 pts and slow on all foes within 6 m. Ice spikes erupt around you.', { element: 'frost', damage: 18 }),
  W('meteor', 'Call Meteor', 'destruction', 25, 55, 420, 0xff6a20, 'raise', 'A burning stone falls from the sky where you aim: fire 50 pts in 6 m.', { element: 'fire', damage: 50 }),
  W('acid_spray', 'Acid Spray', 'destruction', 0, 20, 110, 0x9aff40, 'sweep', 'A cone of acid: poison 6 pts per second for 5 secs on foes in front of you.', { element: 'poison', damage: 6 }),
  W('arcane_missiles', 'Arcane Missiles', 'destruction', 0, 24, 160, 0xd070ff, 'flick', 'Five seeking motes of force, 7 pts each.', { damage: 7 }),
  W('flame_wall', 'Wall of Flame', 'destruction', 25, 40, 300, 0xff8a30, 'sweep', 'A line of fire springs up before you for 8 secs, burning anything that crosses it.', { element: 'fire', damage: 9 }),
  W('thunderclap', 'Thunderclap', 'destruction', 0, 26, 130, 0xfff0a0, 'slam', 'A deafening shockwave: shock 12 pts and hurls back foes within 7 m.', { element: 'shock', damage: 12 }),
  // Restoration
  W('rejuvenation', 'Rejuvenation', 'restoration', 0, 22, 120, 0x9aff90, 'self', 'Restore Health 6 pts per second for 10 secs. Flowers bloom where you stand.', { heal: 6 }),
  W('sunbeam', 'Sunbeam', 'restoration', 25, 38, 280, 0xffe080, 'raise', 'A column of sunlight where you aim: heals you if you stand in it, burns the undead 40 pts.', { damage: 40, heal: 30 }),
  W('turn_undead', 'Turn Undead', 'restoration', 0, 20, 100, 0xfff4c0, 'push', 'Undead within 20 m flee from you for 12 secs.'),
  W('life_drain', 'Life Drain', 'restoration', 0, 26, 170, 0xff4060, 'pull', 'Drain 8 pts per second from your target for 3 secs, healing you as much.', { damage: 8 }),
  // Alteration
  W('leap', 'Leap of the Kestrel', 'alteration', 0, 14, 80, 0xd0e8ff, 'raise', 'Leap high into the air and drift gently down. No falling damage for 8 secs.'),
  W('stoneskin', 'Stoneskin', 'alteration', 0, 24, 140, 0xb8a888, 'self', 'Shield 35% for 45 secs. Stones orbit you.'),
  W('telekinesis', 'Telekinesis', 'alteration', 0, 16, 120, 0x80d0ff, 'pull', 'Pull a loose item up to 25 m away into your hands.'),
  W('blink', 'Blink', 'alteration', 25, 22, 260, 0xb070ff, 'flick', 'Teleport up to 12 m in the direction you are looking.'),
  W('haste', 'Haste', 'alteration', 0, 20, 140, 0xffd060, 'self', 'Move 60% faster for 20 secs.'),
  // Conjuration
  W('spectral_wolf', 'Summon Spectral Wolf', 'conjuration', 0, 30, 160, 0x80b8ff, 'slam', 'Summon a ghostly wolf to fight beside you for 45 secs.'),
  W('bound_sword', 'Bound Sword', 'conjuration', 0, 28, 150, 0x7ac8ff, 'self', 'Conjure a blade of pure light into your hand for 60 secs.'),
  W('flame_blade', 'Bound Flame Blade', 'conjuration', 0, 30, 230, 0xff7a20, 'self', 'Conjure a sword of living fire for 60 secs. Strikes deal +10 fire damage and leave the target burning.'),
  W('storm_blade', 'Bound Storm Blade', 'conjuration', 0, 30, 230, 0x9ac8ff, 'self', 'Conjure a sword of crackling lightning for 60 secs. Strikes deal +9 shock damage and arc to a second foe.'),
  W('ghost_knight', 'Summon Ghost Knight', 'conjuration', 25, 45, 320, 0xa0c0e0, 'slam', 'Summon the spirit of a fallen knight for 45 secs.'),
  // Illusion
  W('calm', 'Calm', 'illusion', 0, 18, 100, 0xffa0d0, 'push', 'A foe up to level 10 loses the will to fight for 30 secs.'),
  W('frenzy', 'Frenzy', 'illusion', 0, 20, 140, 0xff3030, 'push', 'Your target attacks the creatures around it for 20 secs.'),
  W('night_eye', 'Night-Eye', 'illusion', 0, 10, 60, 0x60ffa0, 'self', 'See in the dark for 60 secs.'),
  W('fireworks', 'Festival Fireworks', 'illusion', 0, 12, 60, 0xff80ff, 'raise', 'Fireworks burst overhead. Animals and the faint-hearted flee.'),
  // Mysticism
  W('mark_recall', 'Mark and Recall', 'mysticism', 0, 30, 250, 0x60e0e0, 'slam', 'First cast leaves a rune of return where you stand. Cast again to be pulled back to it.'),
  W('reveal', 'Reveal', 'mysticism', 0, 16, 90, 0xffe060, 'self', 'Pillars of light mark every container and loose item within 40 m for 15 secs.'),
];
for (const w of WONDERS) SPELLS[w.id] = w;
export const WIZARD_SHOP = WONDERS.map((w) => w.id);

export const SPELL_SHOP = ['frostbite', 'shock_bolt', 'fireball', 'heal_major', 'open_easy_lock', 'summon_scamp', 'starlight', 'detect_life', 'protect', 'summon_skeleton'];

export const SPELL_PRICES = {
  frostbite: 40, shock_bolt: 90, fireball: 260, heal_major: 200, open_easy_lock: 60,
  summon_scamp: 180, starlight: 20, detect_life: 70, protect: 50, summon_skeleton: 90,
};
