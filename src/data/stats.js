// Character rules: attributes, skills, races, classes, birthsigns, leveling.
// Pure data + functions so it can be unit tested without a renderer.

export const ATTRIBUTES = ['strength', 'intelligence', 'willpower', 'agility', 'speed', 'endurance', 'personality', 'luck'];

export const ATTR_LABEL = {
  strength: 'Strength', intelligence: 'Intelligence', willpower: 'Willpower', agility: 'Agility',
  speed: 'Speed', endurance: 'Endurance', personality: 'Personality', luck: 'Luck',
};

// skill -> [label, governing attribute, specialization]
export const SKILLS = {
  armorer: ['Armorer', 'endurance', 'combat'],
  athletics: ['Athletics', 'speed', 'combat'],
  blade: ['Blade', 'strength', 'combat'],
  block: ['Block', 'endurance', 'combat'],
  blunt: ['Blunt', 'strength', 'combat'],
  handtohand: ['Hand to Hand', 'strength', 'combat'],
  heavyarmor: ['Heavy Armor', 'endurance', 'combat'],
  alchemy: ['Alchemy', 'intelligence', 'magic'],
  alteration: ['Alteration', 'willpower', 'magic'],
  conjuration: ['Conjuration', 'intelligence', 'magic'],
  destruction: ['Destruction', 'willpower', 'magic'],
  illusion: ['Illusion', 'personality', 'magic'],
  mysticism: ['Mysticism', 'intelligence', 'magic'],
  restoration: ['Restoration', 'willpower', 'magic'],
  acrobatics: ['Acrobatics', 'speed', 'stealth'],
  lightarmor: ['Light Armor', 'speed', 'stealth'],
  marksman: ['Marksman', 'agility', 'stealth'],
  mercantile: ['Mercantile', 'personality', 'stealth'],
  security: ['Security', 'agility', 'stealth'],
  sneak: ['Sneak', 'agility', 'stealth'],
  speechcraft: ['Speechcraft', 'personality', 'stealth'],
};
export const SKILL_IDS = Object.keys(SKILLS);

const A = (s, i, w, a, sp, e, p, l = 50) => ({ strength: s, intelligence: i, willpower: w, agility: a, speed: sp, endurance: e, personality: p, luck: l });

export const RACES = {
  imperial: {
    name: 'Imperial', attrs: A(40, 40, 30, 30, 40, 40, 50),
    skills: { blade: 5, blunt: 5, handtohand: 5, heavyarmor: 5, mercantile: 10, speechcraft: 10 },
    skin: 0xd8a888, hair: 0x3a2a1a, desc: 'Natives of Cyrodiil, Imperials are well-educated and well-spoken diplomats and traders.',
  },
  nord: {
    name: 'Nord', attrs: A(50, 30, 30, 40, 40, 50, 30),
    skills: { armorer: 5, block: 5, blunt: 10, blade: 10, heavyarmor: 10, restoration: 5 },
    skin: 0xf0ccb0, hair: 0xd8b060, magickaBonus: 0, desc: 'Tall, fair-haired people of Skyrim, strong and resistant to frost.',
  },
  breton: {
    name: 'Breton', attrs: A(40, 50, 50, 30, 30, 30, 40),
    skills: { alchemy: 5, alteration: 5, conjuration: 10, illusion: 5, mysticism: 10, restoration: 10 },
    skin: 0xe8c0a0, hair: 0x5a3a20, magickaBonus: 50, desc: 'Bretons are quick and perceptive, with a talent for the arcane. +50 Magicka.',
  },
  redguard: {
    name: 'Redguard', attrs: A(50, 30, 30, 40, 40, 50, 30),
    skills: { athletics: 10, blade: 10, blunt: 10, lightarmor: 5, heavyarmor: 5, mercantile: 5 },
    skin: 0x6a4430, hair: 0x101010, desc: 'The most naturally talented warriors in Tamriel, hardy and resistant to poison.',
  },
  altmer: {
    name: 'High Elf', attrs: A(30, 50, 40, 40, 30, 40, 40),
    skills: { alchemy: 5, alteration: 10, conjuration: 5, destruction: 10, illusion: 5, mysticism: 10 },
    skin: 0xe6d08a, hair: 0xe8d8a0, magickaBonus: 100, desc: 'Tall, golden-skinned elves of the Summerset Isles. +100 Magicka.',
  },
  dunmer: {
    name: 'Dark Elf', attrs: A(40, 40, 30, 40, 50, 40, 30),
    skills: { athletics: 5, blade: 10, blunt: 5, destruction: 10, lightarmor: 5, marksman: 5, mysticism: 5 },
    skin: 0x6a7080, hair: 0x202028, desc: 'Grim, ash-skinned elves of Morrowind with a knack for destruction magic.',
  },
  bosmer: {
    name: 'Wood Elf', attrs: A(30, 40, 30, 50, 50, 40, 30),
    skills: { acrobatics: 5, alchemy: 10, alteration: 5, lightarmor: 5, marksman: 10, sneak: 10 },
    skin: 0xa07850, hair: 0x4a2a10, desc: 'Nimble forest elves of Valenwood, the finest archers in the Empire.',
  },
  khajiit: {
    name: 'Khajiit', attrs: A(40, 40, 30, 50, 40, 30, 40),
    skills: { acrobatics: 10, athletics: 5, blade: 5, handtohand: 10, lightarmor: 5, security: 5, sneak: 5 },
    skin: 0xc89858, hair: 0x7a5a30, beast: 'cat', desc: 'Agile cat-folk from Elsweyr. Khajiit has wares, if you have coin.',
  },
  argonian: {
    name: 'Argonian', attrs: A(40, 40, 30, 50, 50, 30, 30),
    skills: { alchemy: 5, athletics: 10, blade: 5, handtohand: 5, illusion: 5, mysticism: 5, security: 10 },
    skin: 0x5a7a48, hair: 0x7a3020, beast: 'lizard', desc: 'Reptilian natives of Black Marsh, at home in water and immune to disease.',
  },
  orc: {
    name: 'Orc', attrs: A(45, 30, 50, 35, 30, 50, 25),
    skills: { armorer: 10, block: 10, blunt: 10, handtohand: 5, heavyarmor: 10 },
    skin: 0x6a8a50, hair: 0x101010, tusks: true, desc: 'Fierce mountain folk of Orsinium, unmatched armorers and berserkers.',
  },
};

export const CLASSES = {
  warrior: {
    name: 'Warrior', spec: 'combat', attrs: ['strength', 'endurance'],
    majors: ['athletics', 'blade', 'block', 'blunt', 'handtohand', 'heavyarmor', 'armorer'],
    kit: ['iron_longsword', 'iron_shield', 'iron_cuirass'],
  },
  knight: {
    name: 'Knight', spec: 'combat', attrs: ['strength', 'personality'],
    majors: ['blade', 'block', 'blunt', 'handtohand', 'heavyarmor', 'illusion', 'speechcraft'],
    kit: ['iron_longsword', 'iron_shield', 'iron_cuirass'],
  },
  barbarian: {
    name: 'Barbarian', spec: 'combat', attrs: ['strength', 'speed'],
    majors: ['armorer', 'athletics', 'blade', 'block', 'blunt', 'handtohand', 'lightarmor'],
    kit: ['iron_waraxe', 'fur_cuirass', 'fur_shield'],
  },
  battlemage: {
    name: 'Battlemage', spec: 'magic', attrs: ['strength', 'intelligence'],
    majors: ['alchemy', 'alteration', 'blade', 'blunt', 'conjuration', 'destruction', 'mysticism'],
    kit: ['iron_longsword', 'fur_cuirass'], spells: ['summon_skeleton', 'flame_blade'],
  },
  spellsword: {
    name: 'Spellsword', spec: 'combat', attrs: ['willpower', 'endurance'],
    majors: ['alteration', 'blade', 'block', 'destruction', 'heavyarmor', 'illusion', 'restoration'],
    kit: ['iron_shortsword', 'iron_shield', 'iron_cuirass'], spells: ['protect', 'storm_blade'],
  },
  mage: {
    name: 'Mage', spec: 'magic', attrs: ['intelligence', 'willpower'],
    majors: ['alchemy', 'alteration', 'conjuration', 'destruction', 'illusion', 'mysticism', 'restoration'],
    kit: ['iron_dagger', 'mage_robe'], spells: ['shock_bolt', 'summon_skeleton', 'starlight', 'detect_life', 'flame_blade', 'storm_blade'],
  },
  healer: {
    name: 'Healer', spec: 'magic', attrs: ['personality', 'willpower'],
    majors: ['alchemy', 'alteration', 'destruction', 'illusion', 'restoration', 'mercantile', 'speechcraft'],
    kit: ['iron_mace', 'mage_robe'], spells: ['protect', 'starlight'],
  },
  thief: {
    name: 'Thief', spec: 'stealth', attrs: ['agility', 'speed'],
    majors: ['acrobatics', 'lightarmor', 'security', 'sneak', 'marksman', 'speechcraft', 'mercantile'],
    kit: ['iron_dagger', 'leather_cuirass', 'iron_bow', 'iron_arrow*30', 'lockpick*6'], spells: ['open_easy_lock'],
  },
  assassin: {
    name: 'Assassin', spec: 'stealth', attrs: ['speed', 'intelligence'],
    majors: ['acrobatics', 'alchemy', 'blade', 'lightarmor', 'marksman', 'security', 'sneak'],
    kit: ['iron_shortsword', 'leather_cuirass', 'iron_bow', 'iron_arrow*25', 'lockpick*4'],
  },
  scout: {
    name: 'Scout', spec: 'stealth', attrs: ['speed', 'endurance'],
    majors: ['acrobatics', 'alchemy', 'athletics', 'blade', 'block', 'lightarmor', 'sneak'],
    kit: ['iron_shortsword', 'leather_cuirass', 'fur_shield', 'iron_bow', 'iron_arrow*20'],
  },
};

export const BIRTHSIGNS = {
  warrior: { name: 'The Warrior', desc: '+10 Strength and Endurance.', attrs: { strength: 10, endurance: 10 } },
  mage: { name: 'The Mage', desc: '+50 Magicka.', magicka: 50 },
  thief: { name: 'The Thief', desc: '+10 Agility, Speed and Luck.', attrs: { agility: 10, speed: 10, luck: 10 } },
  apprentice: { name: 'The Apprentice', desc: '+100 Magicka, but weak to magic.', magicka: 100 },
  atronach: { name: 'The Atronach', desc: '+150 Magicka, but Magicka does not regenerate on its own.', magicka: 150, stuntedMagicka: true },
  lady: { name: 'The Lady', desc: '+10 Willpower and Endurance.', attrs: { willpower: 10, endurance: 10 } },
  lord: { name: 'The Lord', desc: 'Once a day: Blood of the North (heal 90 HP).', power: 'blood_of_north' },
  lover: { name: 'The Lover', desc: 'Once a day: Lover\'s Kiss (+20 Agility for 60s).', power: 'lovers_kiss' },
  ritual: { name: 'The Ritual', desc: 'Once a day: Mara\'s Gift (heal 200 HP).', power: 'maras_gift' },
  serpent: { name: 'The Serpent', desc: 'Serpent Spell: a poison bolt dealing heavy damage.', spells: ['serpent_spell'] },
  shadow: { name: 'The Shadow', desc: 'Once a day: Moonshadow (invisibility for 60s).', power: 'moonshadow' },
  steed: { name: 'The Steed', desc: '+20 Speed.', attrs: { speed: 20 } },
  tower: { name: 'The Tower', desc: '+10 Security and Sneak... and a knack for lockpicks.', skills: { security: 10, sneak: 5 }, items: ['lockpick*5'] },
};

/** Build a fresh character sheet from choices. */
export function createCharacter({ name = 'Prisoner', race = 'imperial', cls = 'warrior', sign = 'warrior' }) {
  const R = RACES[race], C = CLASSES[cls], B = BIRTHSIGNS[sign];
  const attrs = { ...R.attrs };
  for (const a of C.attrs) attrs[a] += 5;
  if (B.attrs) for (const [a, v] of Object.entries(B.attrs)) attrs[a] += v;

  const skills = {};
  for (const s of SKILL_IDS) {
    let v = 5;
    if (C.majors.includes(s)) v = 25;
    if (SKILLS[s][2] === C.spec) v += 5;
    v += R.skills[s] || 0;
    if (B.skills && B.skills[s]) v += B.skills[s];
    skills[s] = v;
  }
  const skillXp = Object.fromEntries(SKILL_IDS.map((s) => [s, 0]));
  const ch = {
    name, race, cls, sign,
    level: 1,
    attrs,
    skills,
    skillXp,
    majors: [...C.majors],
    levelProgress: 0, // major skill increases this level
    attrIncreases: Object.fromEntries(ATTRIBUTES.map((a) => [a, 0])),
    magickaBonus: (R.magickaBonus || 0) + (B.magicka || 0),
    healthLevelBonus: 0,
  };
  ch.maxHealth = baseHealth(ch);
  return ch;
}

export function baseHealth(ch) {
  return Math.round(ch.attrs.endurance * 2 + ch.healthLevelBonus);
}
export function maxMagicka(ch, fortify = 0) {
  return Math.round(ch.attrs.intelligence * 2 + ch.magickaBonus + fortify);
}
export function maxFatigue(ch) {
  const a = ch.attrs;
  return Math.round(a.strength + a.willpower + a.agility + a.endurance);
}
export function carryWeight(ch) {
  return ch.attrs.strength * 5;
}
export function magickaRegen(ch) {
  if (BIRTHSIGNS[ch.sign]?.stuntedMagicka) return 0;
  return maxMagicka(ch) * (0.0075 + ch.attrs.willpower * 0.0002);
}
export function fatigueRegen(ch) {
  return 6 + ch.attrs.endurance * 0.08;
}
export function runSpeed(ch) {
  return 4.6 + (ch.attrs.speed - 40) * 0.03 + ch.skills.athletics * 0.012;
}
export function jumpVelocity(ch) {
  return 5.2 + ch.skills.acrobatics * 0.022;
}

/** Use-count required to raise a skill one point. */
export function skillXpNeeded(ch, skill) {
  const lvl = ch.skills[skill];
  const major = ch.majors.includes(skill);
  return (2 + lvl * 0.2) * (major ? 0.75 : 1.25);
}

/**
 * Award skill experience. Returns array of events: {type:'skill', skill, value} and
 * {type:'levelReady'} when 10 major increases have accumulated.
 */
export function exerciseSkill(ch, skill, amount = 1) {
  const events = [];
  if (!(skill in ch.skills) || ch.skills[skill] >= 100) return events;
  ch.skillXp[skill] += amount;
  while (ch.skills[skill] < 100 && ch.skillXp[skill] >= skillXpNeeded(ch, skill)) {
    ch.skillXp[skill] -= skillXpNeeded(ch, skill);
    ch.skills[skill] += 1;
    ch.attrIncreases[SKILLS[skill][1]] += 1;
    events.push({ type: 'skill', skill, value: ch.skills[skill] });
    if (ch.majors.includes(skill)) {
      ch.levelProgress += 1;
      if (ch.levelProgress === 10) events.push({ type: 'levelReady' });
    }
  }
  return events;
}

export function canLevelUp(ch) {
  return ch.levelProgress >= 10;
}

/** Oblivion's attribute multiplier from governed skill increases. */
export function attributeBonus(increases) {
  if (increases <= 0) return 1;
  if (increases <= 4) return 2;
  if (increases <= 7) return 3;
  if (increases <= 9) return 4;
  return 5;
}

/** Apply a level-up with three chosen attributes. Luck always gets +1 extra if not chosen. */
export function applyLevelUp(ch, chosen) {
  if (!canLevelUp(ch)) throw new Error('Not ready to level');
  if (chosen.length !== 3 || new Set(chosen).size !== 3) throw new Error('Choose three distinct attributes');
  const gains = {};
  for (const a of chosen) {
    const bonus = a === 'luck' ? 1 : attributeBonus(ch.attrIncreases[a]);
    gains[a] = Math.min(bonus, 100 - ch.attrs[a]);
    ch.attrs[a] += gains[a];
  }
  ch.level += 1;
  ch.levelProgress -= 10;
  ch.healthLevelBonus += Math.floor(ch.attrs.endurance / 10);
  for (const a of ATTRIBUTES) ch.attrIncreases[a] = 0;
  ch.maxHealth = baseHealth(ch);
  return gains;
}

/** Melee/bow damage dealt by a character with a weapon. */
export function weaponDamage(ch, weapon, { power = false, sneak = false, fatigueRatio = 1 } = {}) {
  const skillName = weapon ? weapon.skill : 'handtohand';
  const skill = ch.skills[skillName] ?? 20;
  const base = weapon ? weapon.damage : 4 + skill * 0.08;
  let dmg = base * (0.5 + skill * 0.015) * (0.6 + ch.attrs.strength * 0.008);
  dmg *= 0.6 + 0.4 * fatigueRatio;
  if (power) dmg *= 1.8;
  if (sneak) dmg *= skillName === 'marksman' ? 2 : 3;
  return Math.max(1, Math.round(dmg));
}

/** Reduction from armour: rating 0..∞, returns damage multiplier. */
export function armorMultiplier(armorRating) {
  return 1 - Math.min(0.85, armorRating / 100);
}

/** Block efficiency 0..1 portion of damage removed. */
export function blockReduction(blockSkill, hasShield) {
  return Math.min(0.9, (hasShield ? 0.45 : 0.25) + blockSkill * 0.004);
}

/** Spell cost after skill reduction. */
export function spellCost(baseCost, skill) {
  return Math.max(1, Math.round(baseCost * Math.max(0.35, 1.4 - skill * 0.012)));
}

/** Buy/sell price modifiers for mercantile and disposition. */
export function priceMultiplier(mercantile, disposition, buying) {
  const m = Math.min(1, mercantile / 100);
  const d = Math.min(1, Math.max(0, disposition / 100));
  if (buying) return 1.6 - 0.35 * m - 0.2 * d;
  return 0.35 + 0.3 * m + 0.15 * d;
}

/** Probability that an NPC within range notices a sneaking player. */
export function detectChance(sneakSkill, agility, distance, sneaking, moving, lightLevel = 1, invisible = false) {
  if (invisible) return 0;
  let chance = 1 - (sneaking ? 0.4 + sneakSkill * 0.005 + agility * 0.002 : 0.05);
  if (moving) chance *= 1.2;
  chance *= Math.max(0.15, 1 - distance / 30);
  chance *= 0.4 + 0.6 * lightLevel;
  return Math.max(0, Math.min(1, chance));
}
