// Actor templates: creatures, enemies, summons and townsfolk.
// body.kind: 'human' | 'quad' | 'crab' | 'raptor'
import { COVE } from '../world/layout.js';

export const TEMPLATES = {
  // ---------------- wildlife
  rat: {
    name: 'Rat', body: { kind: 'quad', color: 0x4a3e36, len: 0.42, height: 0.2, headSize: 0.09 },
    health: 8, damage: 3, speed: 5.5, reach: 1.1, attackRate: 1.1, level: 1, ai: 'beast', loot: 'rat', radius: 0.3, sound: 'growl', soundPitch: 2,
  },
  wolf: {
    name: 'Wolf', body: { kind: 'quad', color: 0x6a6460, len: 1.0, height: 0.68 },
    health: 28, damage: 6, speed: 7.5, reach: 1.9, attackRate: 1.2, level: 1, ai: 'beast', loot: 'wolf', radius: 0.5, sound: 'growl',
  },
  timber_wolf: {
    name: 'Timber Wolf', body: { kind: 'quad', color: 0x3a3430, len: 1.15, height: 0.78, eyes: 0xffaa22 },
    health: 60, damage: 11, speed: 8, reach: 2, attackRate: 1.2, level: 5, ai: 'beast', loot: 'wolf', radius: 0.55, sound: 'growl',
  },
  deer: {
    name: 'Deer', body: { kind: 'quad', color: 0x8a6240, len: 1.15, height: 0.95, headSize: 0.16, antlers: true }, faction: 'wild',
    health: 22, damage: 0, speed: 9.5, reach: 1.5, attackRate: 1, level: 1, ai: 'prey', loot: 'deer', radius: 0.5,
  },
  doe: {
    name: 'Doe', body: { kind: 'quad', color: 0x9a7050, len: 1.05, height: 0.88, headSize: 0.15 }, faction: 'wild',
    health: 18, damage: 0, speed: 9.5, reach: 1.5, attackRate: 1, level: 1, ai: 'prey', loot: 'deer', radius: 0.45,
  },
  sir_pinchington: {
    name: 'Sir Pinchington the Unpleasant', unique: true, body: { kind: 'crab', color: 0x9a5a3a, scale: 1.7 }, health: 90, damage: 9, speed: 3, reach: 2.2, attackRate: 1, level: 3, fixedLevel: true,
    ai: 'beast', loot: 'mudcrab', extraLoot: ['lady_plucksworth', 'cheese_wheel'], radius: 0.9, armor: 30, sound: 'crab', aggroRange: 12,
    taunts: ['PINCH.', 'The lute is MINE, landwalker!', 'Sir Pinchington yields to no one!', 'Pinch pinch pinch!'],
  },
  chicken: {
    name: 'Chicken', body: { kind: 'bird' }, faction: 'wild', health: 4, damage: 0, speed: 3.4, reach: 1, attackRate: 1, level: 1, ai: 'prey', shy: 2.6, wander: 6, loot: 'chicken', radius: 0.2,
  },
  rooster: {
    name: 'Rooster', body: { kind: 'bird', color: 0xc86a2a, rooster: true }, faction: 'wild', health: 5, damage: 0, speed: 3.6, reach: 1, attackRate: 1, level: 1, ai: 'prey', shy: 2.2, wander: 7, loot: 'chicken', radius: 0.22,
  },
  wisp: {
    name: 'Will-o\'-the-Wisp', body: { kind: 'wisp' }, faction: 'wild', health: 1, damage: 0, speed: 4.4, reach: 1, attackRate: 1, level: 1, ai: 'prey', shy: 8, wander: 18, loot: 'none', radius: 0.3,
  },
  henrietta: {
    name: 'Henrietta (glowing faintly)', body: { kind: 'bird', color: 0xd8c8ff }, faction: 'wild', health: 4, damage: 0, speed: 2.3, reach: 1, attackRate: 1, level: 1, ai: 'prey', shy: 2.4, wander: 5, loot: 'none', radius: 0.2,
  },
  cat: {
    name: 'Cat', body: { kind: 'quad', color: 0xd08a40, len: 0.5, height: 0.3, headSize: 0.11 }, faction: 'wild', health: 6, damage: 0, speed: 4.5, reach: 1, attackRate: 1, level: 1, ai: 'prey', shy: 1.8, wander: 10, loot: 'none', radius: 0.25,
  },
  mudcrab: {
    name: 'Mudcrab', body: { kind: 'crab' }, health: 20, damage: 4, speed: 2.6, reach: 1.5, attackRate: 1, level: 1,
    ai: 'beast', loot: 'mudcrab', radius: 0.55, armor: 25, sound: 'crab', aggroRange: 10,
  },
  // ---------------- bandits & goblins
  bandit: {
    name: 'Bandit', body: { kind: 'human', race: 'random', shirt: 0x5a4a30, pants: 0x3a2e22 }, weapon: 'iron_waraxe', armor: ['fur_cuirass', 'fur_helmet'],
    health: 45, damage: 0, speed: 4.6, reach: 2.4, attackRate: 1.0, level: 1, ai: 'melee', loot: 'bandit', radius: 0.4, block: 0.25, sound: 'grunt',
    taunts: ['Your money or your life!', 'You picked the wrong road, friend.', "I'll gut you like a fish!"],
  },
  bandit_archer: {
    name: 'Bandit Archer', body: { kind: 'human', race: 'random', shirt: 0x4a3a28, pants: 0x3a2e22, hood: true }, weapon: 'iron_bow', armor: ['leather_cuirass'],
    health: 35, damage: 0, speed: 4.6, reach: 22, attackRate: 0.5, level: 2, ai: 'archer', loot: 'bandit', radius: 0.4, sound: 'grunt',
  },
  bandit_mage: {
    name: 'Bandit Hedge Wizard', body: { kind: 'human', race: 'breton', shirt: 0x3a2a4a, robe: true }, weapon: 'iron_dagger',
    health: 35, magicka: 100, damage: 0, speed: 4.4, reach: 18, attackRate: 0.6, level: 3, ai: 'caster', spells: ['flare', 'frostbite'], loot: 'bandit', radius: 0.4,
  },
  black_brugo: {
    name: 'Black Brugo', unique: true, body: { kind: 'human', race: 'orc', shirt: 0x202020, beard: false }, weapon: 'steel_mace', shield: 'iron_shield', armor: ['iron_cuirass', 'iron_helmet', 'iron_greaves'],
    health: 150, damage: 0, speed: 4.8, reach: 2.5, attackRate: 0.9, level: 6, fixedLevel: true, ai: 'melee', loot: 'chest_boss', extraLoot: ['brugo_head', 'gold*60'], radius: 0.45, block: 0.35, sound: 'grunt',
    taunts: ['Brugo will crush your skull!', 'Another head for my collection!'],
  },
  goblin: {
    name: 'Goblin', body: { kind: 'human', head: 'goblin', skin: 0x6a7a3a, shirt: 0x4a3a20, pants: 0x3a2a18, scale: 0.78, hunch: 0.35, sleeves: false, hairStyle: 'bald' }, weapon: 'iron_dagger',
    health: 25, damage: 0, speed: 5, reach: 2.0, attackRate: 1.3, level: 1, ai: 'melee', loot: 'goblin', radius: 0.35, sound: 'grunt',
  },
  goblin_berserker: {
    name: 'Goblin Berserker', body: { kind: 'human', head: 'goblin', skin: 0x5a6a2a, shirt: 0x6a2a1a, pants: 0x3a2a18, scale: 0.9, hunch: 0.3, sleeves: false, hairStyle: 'mohawk', hair: 0x8a1a10 }, weapon: 'iron_waraxe',
    health: 70, damage: 0, speed: 5.2, reach: 2.3, attackRate: 1.1, level: 6, ai: 'melee', loot: 'goblin', radius: 0.4, sound: 'grunt',
  },
  // ---------------- undead
  skeleton: {
    name: 'Skeleton', body: { kind: 'human', bones: true, skin: 0xe8e0c8, head: 'skull', emissiveEyes: 0x4060ff }, weapon: 'iron_shortsword',
    health: 35, damage: 0, speed: 4.2, reach: 2.4, attackRate: 1.0, level: 1, ai: 'melee', loot: 'skeleton', radius: 0.35, sound: 'rattle', undead: true, gore: 'bone',
  },
  skeleton_guardian: {
    name: 'Skeleton Guardian', body: { kind: 'human', bones: true, skin: 0xd8d0b0, head: 'skull', emissiveEyes: 0x60a0ff }, weapon: 'iron_longsword', shield: 'iron_shield',
    health: 70, damage: 0, speed: 4.2, reach: 2.5, attackRate: 0.9, level: 5, ai: 'melee', loot: 'skeleton', radius: 0.38, sound: 'rattle', undead: true, block: 0.35, gore: 'bone',
  },
  skeleton_champion: {
    name: 'Ayleid Lich-Knight', unique: true, body: { kind: 'human', bones: true, skin: 0xc8d8f0, head: 'skull', emissiveEyes: 0x80c0ff, scale: 1.15 }, weapon: 'elven_longsword', shield: 'steel_shield',
    health: 160, magicka: 150, damage: 0, speed: 4.4, reach: 2.7, attackRate: 0.9, level: 6, fixedLevel: true, ai: 'melee', spells: ['frostbite'], loot: 'chest_boss', radius: 0.42, sound: 'rattle', undead: true, block: 0.4, gore: 'bone',
  },
  zombie: {
    name: 'Zombie', body: { kind: 'human', skin: 0x6a7a5a, shirt: 0x3a3a2a, pants: 0x2a2a20, hunch: 0.45, zombieArms: true, hairStyle: 'bald', emissiveEyes: 0xaaff44 },
    health: 60, damage: 9, speed: 2.4, reach: 2.0, attackRate: 0.8, level: 2, ai: 'melee', attackKind: 'punch', loot: 'zombie', radius: 0.4, sound: 'growl', undead: true,
  },
  ghost: {
    name: 'Ghost', body: { kind: 'human', skin: 0x9ab0e0, shirt: 0x8090c0, pants: 0x8090c0, opacity: 0.45, float: true, robe: true, emissiveEyes: 0xffffff },
    health: 40, damage: 8, speed: 3.6, reach: 2.0, attackRate: 0.9, level: 3, ai: 'melee', attackKind: 'punch', element: 'frost', loot: 'ghost', radius: 0.4, undead: true, ghostly: true,
  },
  bell_warden: {
    name: 'Sister Anwen, the Bell-Warden', unique: true, body: { kind: 'human', race: 'breton', female: true, skin: 0xa8c0e8, shirt: 0x8090c0, opacity: 0.5, float: true, robe: true, emissiveEyes: 0xd0e8ff, hair: 0xc0d0e8 },
    female: true, health: 75, damage: 11, speed: 3.8, reach: 2.1, attackRate: 0.9, level: 4, fixedLevel: true, ai: 'melee', attackKind: 'punch', element: 'frost', loot: 'ghost', radius: 0.4, undead: true, ghostly: true, aggroRange: 16,
    taunts: ['The bell is not yours to ring!', 'She threw it in the water. She threw it in the WATER.', 'Leave the drowned in peace!'],
  },
  archivist: {
    name: 'The Archivist', unique: true, body: { kind: 'human', bones: true, skin: 0xd8e4f8, head: 'skull', emissiveEyes: 0x80e0ff, scale: 1.15 }, weapon: 'elven_longsword', shield: 'steel_shield',
    health: 230, magicka: 160, damage: 0, speed: 4.4, reach: 2.8, attackRate: 0.95, level: 7, fixedLevel: true, ai: 'melee', spells: ['frostbite'], loot: 'chest_ayleid', radius: 0.45, sound: 'rattle', undead: true, block: 0.35, gore: 'bone',
    taunts: ['Your hour is not yet written. Allow me.', 'Nothing leaves the Hall of Hours.', 'He has been so quiet. You will be quiet too.'],
  },
  // ---------------- The Lantern in the Wood
  ashen_dead: {
    name: 'Ashen Dead', body: { kind: 'human', skin: 0x2e2622, shirt: 0x1c1814, pants: 0x1c1814, hunch: 0.35, zombieArms: true, hairStyle: 'bald', emissiveEyes: 0xff7a20 },
    health: 55, damage: 10, speed: 2.9, reach: 2.0, attackRate: 0.85, level: 3, ai: 'melee', attackKind: 'punch', element: 'fire', loot: 'ashen', radius: 0.4, sound: 'growl', undead: true, smoulder: true,
  },
  ilvaine: {
    name: 'Ilvaine Seddrel, the Lamplighter', unique: true, female: true, body: { kind: 'human', race: 'dunmer', robe: true, shirt: 0x34363a, hood: true, kitTint: 0x48584c, hair: 0x9a9aa0 },
    weapon: 'iron_dagger', health: 210, magicka: 320, damage: 0, speed: 4.4, reach: 18, attackRate: 0.75, level: 7, fixedLevel: true, ai: 'caster', spells: ['frostbite', 'shock_bolt', 'flare'],
    loot: 'chest_boss', extraLoot: ['maela_lantern', 'ilvaine_journal', 'gold*80'], radius: 0.4, aggroRange: 15,
    taunts: ['Up, my lovelies. Up out of the ash.', 'Eighty years I have tended this fire.', 'You will make such a bright little light.', 'Burn for me. Everyone burns for me eventually.'],
  },
  // ---------------- The White Hare
  frost_atronach: {
    name: 'Frost Atronach', body: { kind: 'human', skin: 0xb8dcff, shirt: 0x9ac8f0, pants: 0x9ac8f0, opacity: 0.82, scale: 1.25, hunch: 0.15, hairStyle: 'bald', emissiveEyes: 0xd8f4ff },
    health: 110, damage: 15, speed: 3.4, reach: 2.6, attackRate: 0.8, level: 5, ai: 'melee', attackKind: 'punch', element: 'frost', loot: 'frost', radius: 0.55, daedra: true, sound: 'growl', soundPitch: 0.6, armor: 25,
  },
  ice_wraith: {
    name: 'Ice Wraith', body: { kind: 'human', skin: 0xd0e8ff, shirt: 0xb0d0f0, pants: 0xb0d0f0, opacity: 0.4, float: true, robe: true, emissiveEyes: 0xffffff, hairStyle: 'bald' },
    health: 45, damage: 10, speed: 4.6, reach: 2.0, attackRate: 1.1, level: 3, ai: 'melee', attackKind: 'punch', element: 'frost', loot: 'ghost', radius: 0.4, undead: true, ghostly: true,
  },
  // ---------------- A Crown of Starflowers
  dog: {
    name: 'Dog', body: { kind: 'quad', color: 0xc8924e, len: 0.85, height: 0.6, headSize: 0.17, eyes: 0x2a1a10 }, faction: 'ally', pettable: true, essential: true,
    health: 90, damage: 9, speed: 7.6, reach: 1.7, attackRate: 1.3, level: 3, ai: 'beast', loot: 'none', radius: 0.42, sound: 'growl', soundPitch: 1.4,
  },
  mother_dog: {
    name: 'Honey', body: { kind: 'quad', color: 0xc8924e, len: 0.95, height: 0.66, headSize: 0.18, eyes: 0x2a1a10 }, faction: 'wild', pettable: true, essential: true,
    health: 80, damage: 0, speed: 3, reach: 1.5, attackRate: 1, level: 3, ai: 'prey', shy: 0.5, wander: 4, loot: 'none', radius: 0.45,
  },
  puppy: {
    name: 'Puppy', body: { kind: 'quad', color: 0xd8a868, len: 0.42, height: 0.3, headSize: 0.12, eyes: 0x2a1a10 }, faction: 'wild', pettable: true, essential: true,
    health: 20, damage: 0, speed: 3.4, reach: 1, attackRate: 1, level: 1, ai: 'prey', shy: 0.6, wander: 6, loot: 'none', radius: 0.25,
  },
  // ---------------- Ten White Rabbits
  snow_rabbit: {
    name: 'Snow Rabbit', body: { kind: 'rabbit', scale: 0.75 }, faction: 'wild', health: 4, damage: 0, speed: 5.2, reach: 1, attackRate: 1, level: 1, ai: 'prey', shy: 4.5, wander: 12, loot: 'none', radius: 0.2,
  },
  goblin_chief: {
    name: 'Chief Gorbag Skullsnow', unique: true, body: { kind: 'human', head: 'goblin', skin: 0x5a7a4a, shirt: 0x8a8a7a, pants: 0x3a2a18, scale: 1.08, hunch: 0.25, sleeves: false, hairStyle: 'mohawk', hair: 0xe8e8e0, armor: { chest: 0xd8d0c0, head: 0xe0dcd0 } },
    weapon: 'steel_mace', armor: ['fur_cuirass', 'fur_helmet'], health: 170, damage: 0, speed: 4.8, reach: 2.5, attackRate: 0.95, level: 6, fixedLevel: true, ai: 'melee', loot: 'goblin', extraLoot: ['gold*90'], radius: 0.45, sound: 'grunt', block: 0.3,
    faction: 'neutral', band: 'frostfang', dialogue: 'gorbag',
    taunts: ['Gorbag crush tiny thief!', 'Moonfeast will have meat after all!', 'FROSTFANG! To Gorbag!'],
  },
  // ---------------- The Greenheart
  chipmunk: {
    name: 'Chipmunk', body: { kind: 'quad', color: 0xb0743c, len: 0.36, height: 0.2, headSize: 0.09, eyes: 0x1a1008 }, faction: 'wild', taggable: true,
    health: 3, damage: 0, speed: 4.2, reach: 1, attackRate: 1, level: 1, ai: 'prey', shy: 7, wander: 9, loot: 'none', radius: 0.22,
  },
  spirit_deer: {
    name: 'Spirit Hart', body: { kind: 'quad', color: 0xc8ffe8, len: 1.15, height: 1.0, headSize: 0.17, antlers: true, eyes: 0xffffff }, faction: 'ally', summon: true, spirit: 0x7affc0,
    health: 140, damage: 0, speed: 7.5, reach: 1.5, attackRate: 1, level: 5, ai: 'support', loot: 'none', radius: 0.5, ghostly: true,
  },
  // ---------------- The Admiral (Brinewhistle Cove)
  // tame animals never run from you (or your dog), only from things that want to hurt them
  admiral: {
    name: 'Admiral Marmalade', body: { kind: 'quad', color: 0xe0883a, len: 0.62, height: 0.34, headSize: 0.13, eyes: 0x9ad040, fat: 1.45, hat: 'bicorne' }, faction: 'wild', pettable: true, essential: true, tame: true,
    health: 30, damage: 0, speed: 3.4, reach: 1, attackRate: 1, level: 1, fixedLevel: true, ai: 'prey', wander: 2.5, loot: 'none', radius: 0.3,
  },
  kitten: {
    name: 'Kitten', body: { kind: 'quad', color: 0xe0923c, len: 0.3, height: 0.17, headSize: 0.085, eyes: 0x8ac0e0 }, faction: 'wild', pettable: true, essential: true, tame: true,
    health: 12, damage: 0, speed: 4.6, reach: 1, attackRate: 1, level: 1, fixedLevel: true, ai: 'prey', wander: 1.5, loot: 'none', radius: 0.18,
  },
  // Mother Brisk's own cat, forty years drowned: she bolts from anyone who doesn't creep up on her
  crumpet: {
    name: 'Crumpet', body: { kind: 'quad', color: 0xe8a050, len: 0.5, height: 0.3, headSize: 0.11, eyes: 0xd0ffe8, sock: true }, faction: 'wild', spirit: 0x8affc8, essential: true, shyUnlessSneaking: 10,
    health: 10, damage: 0, speed: 4.4, reach: 1, attackRate: 1, level: 1, fixedLevel: true, ai: 'prey', wander: 5, loot: 'none', radius: 0.25,
  },
  drowned: {
    name: 'Drowned', body: { kind: 'human', bones: true, skin: 0xb8c2a4, head: 'skull', emissiveEyes: 0x40ffb0, seaweed: true }, weapon: 'iron_shortsword',
    health: 45, damage: 0, speed: 4.0, reach: 2.4, attackRate: 1.0, level: 2, ai: 'melee', loot: 'drowned', radius: 0.36, sound: 'rattle', undead: true, gore: 'bone', drips: true,
    taunts: ['Ship\'s cat! Where\'s the ship\'s cat?', 'Glub.', 'Forty years we\'ve been looking!', 'Mother wants her cat!'],
  },
  drowned_harpooner: {
    name: 'Drowned Harpooner', body: { kind: 'human', bones: true, skin: 0xaab8a0, head: 'skull', emissiveEyes: 0x40ffb0, seaweed: true }, weapon: 'iron_bow',
    health: 35, damage: 0, speed: 4.0, reach: 22, attackRate: 0.5, level: 3, ai: 'archer', loot: 'drowned', radius: 0.36, sound: 'rattle', undead: true, gore: 'bone', drips: true,
  },
  drowned_bosun: {
    name: 'The Drowned Bosun', unique: true, body: { kind: 'human', bones: true, skin: 0xa8b494, head: 'skull', emissiveEyes: 0x60ffc0, scale: 1.2, seaweed: true, hat: 'tricorn' }, weapon: 'iron_waraxe',
    health: 140, damage: 0, speed: 4.2, reach: 2.6, attackRate: 0.9, level: 5, fixedLevel: true, ai: 'melee', loot: 'drowned', extraLoot: ['brisk_key', 'gold*30'], radius: 0.42, sound: 'rattle', undead: true, gore: 'bone', block: 0.3, drips: true,
    taunts: ['Mother Brisk sends her regards!', 'Belay that! BELAY THAT!', 'Forty years without a cat, and you lot keep a fat one in a hat!'],
  },
  lady_pinch: {
    name: 'Lady Pinch', unique: true, body: { kind: 'crab', color: 0x5a7a6a, scale: 2.6 }, health: 200, damage: 14, speed: 2.6, reach: 3.2, attackRate: 0.8, level: 5, fixedLevel: true,
    ai: 'beast', loot: 'mudcrab', extraLoot: ['pearl*2'], radius: 1.4, armor: 40, sound: 'crab', aggroRange: 14,
    taunts: ['PINCH.', 'My nephew writes that you were RUDE to him.', 'This is MY lantern now, landwalker!'],
  },
  // ---------------- the Mythic Dawn
  dawn_assassin: {
    name: 'Mythic Dawn Agent', body: { kind: 'human', race: 'random', robe: true, shirt: 0x8a1414, hood: true, kitTint: 0xb02020 }, weapon: 'dawn_blade', cultist: true,
    health: 70, damage: 0, speed: 5, reach: 2.6, attackRate: 1.05, level: 4, ai: 'melee', loot: 'dawn', radius: 0.4, block: 0.25, sound: 'grunt',
    taunts: ['For Lord Dagon!', 'Dawn is breaking!', 'Your blood for the New Dawn!', 'The Master sees you!'],
  },
  dawn_cultist: {
    name: 'Mythic Dawn Zealot', body: { kind: 'human', race: 'random', robe: true, shirt: 0x8a1414, hood: true, kitTint: 0xb02020 }, weapon: 'dawn_blade', cultist: true,
    health: 75, damage: 0, speed: 4.8, reach: 2.6, attackRate: 1.0, level: 4, ai: 'melee', loot: 'dawn', radius: 0.4, block: 0.25, sound: 'grunt', aggroRange: 18,
    taunts: ['An infidel in the Shrine!', 'Lord Dagon, guide my blade!', 'You will never leave this place!'],
  },
  dawn_acolyte: {
    name: 'Mythic Dawn Acolyte', body: { kind: 'human', race: 'random', robe: true, shirt: 0x7a1010, hood: true, kitTint: 0x9a1818 }, weapon: 'iron_dagger', cultist: true,
    health: 50, magicka: 120, damage: 0, speed: 4.6, reach: 16, attackRate: 0.7, level: 3, ai: 'caster', spells: ['flare'], loot: 'dawn', radius: 0.4, aggroRange: 18,
    taunts: ['Burn, heretic!', 'Paradise awaits — but not for you.'],
  },
  ruma_camoran: {
    name: 'Ruma Camoran', unique: true, female: true, body: { kind: 'human', race: 'altmer', robe: true, shirt: 0x6a0a0a, hair: 0x1a1010, hairStyle: 'long', kitTint: 0x8a1010 }, weapon: 'dawn_blade', cultist: true,
    health: 220, magicka: 220, damage: 0, speed: 4.8, reach: 2.6, attackRate: 1.0, level: 8, fixedLevel: true, ai: 'melee', spells: ['flare', 'frostbite'], loot: 'chest_boss', radius: 0.42, block: 0.3,
    taunts: ['My father will hear of this!', 'Lord Dagon, send me your servants!', 'You cannot stop the Dawn — you can only die before it.'],
  },
  spectral_wolf: {
    name: 'Spectral Wolf', body: { kind: 'quad', color: 0x9ac8ff, len: 1.1, height: 0.75, eyes: 0xc0e8ff }, faction: 'ally', summon: true,
    health: 60, damage: 10, speed: 8, reach: 2, attackRate: 1.2, level: 3, ai: 'beast', radius: 0.5, sound: 'growl', ghostly: true,
  },
  ghost_knight: {
    name: 'Ghost Knight', body: { kind: 'human', race: 'imperial', skin: 0xb0c8f0, shirt: 0x8aa0c8, armor: { chest: 0x9ab0d0, head: 0x9ab0d0 }, opacity: 0.5, emissiveEyes: 0xd0f0ff }, weapon: 'steel_longsword', shield: 'iron_shield',
    faction: 'ally', summon: true, health: 110, damage: 0, speed: 5, reach: 2.6, attackRate: 1, level: 5, ai: 'melee', radius: 0.4, block: 0.3, undead: true, ghostly: true,
  },
  // ---------------- daedra
  scamp: {
    name: 'Scamp', body: { kind: 'human', head: 'scamp', skin: 0xa04030, shirt: 0xa04030, pants: 0xa04030, scale: 0.8, hunch: 0.3, sleeves: false, tail: true, hairStyle: 'bald', emissiveEyes: 0xffaa00, boots: 0x301010 },
    health: 40, magicka: 80, damage: 7, speed: 4.6, reach: 1.9, attackRate: 1.1, level: 1, ai: 'caster', spells: ['flare'], attackKind: 'punch', loot: 'daedra', radius: 0.35, daedra: true, sound: 'growl', soundPitch: 1.5,
  },
  clannfear: {
    name: 'Clannfear', body: { kind: 'raptor' }, health: 85, damage: 14, speed: 8, reach: 2.4, attackRate: 1.0, level: 3, ai: 'beast', loot: 'daedra', radius: 0.6, daedra: true, sound: 'roar',
  },
  dremora: {
    name: 'Dremora Caitiff', body: { kind: 'human', head: 'dremora', skin: 0x3a2a30, armor: { chest: 0x241418, legs: 0x241418, feet: 0x1a0e10, hands: 0x241418 }, emissiveEyes: 0xff3010, hairStyle: 'bald' },
    weapon: 'steel_longsword', health: 90, damage: 0, speed: 4.8, reach: 2.6, attackRate: 1.0, level: 3, ai: 'melee', loot: 'daedra', radius: 0.42, daedra: true, block: 0.3, sound: 'grunt',
    taunts: ['Mortal! Your soul is mine!', 'Kneel before the Prince of Destruction!', 'The Mythic Dawn sends its regards.'],
  },
  dremora_kynval: {
    name: 'Dremora Kynval, Sigil Keeper', unique: true, body: { kind: 'human', head: 'dremora', skin: 0x3a2028, scale: 1.12, armor: { chest: 0x301010, legs: 0x301010, feet: 0x200808, hands: 0x301010, head: 0x301010 }, emissiveEyes: 0xff4010 },
    weapon: 'daedric_longsword', shield: 'steel_shield', health: 220, magicka: 120, damage: 0, speed: 4.8, reach: 2.8, attackRate: 0.95, level: 8, fixedLevel: true, ai: 'melee', spells: ['flare'], loot: 'chest_boss', radius: 0.45, daedra: true, block: 0.4, sound: 'roar',
    taunts: ['None shall touch the Sigil Stone!', 'Lord Dagon will feast upon your soul!'],
  },
  // ---------------- summons (ally)
  skeleton_summon: {
    name: 'Summoned Skeleton', body: { kind: 'human', bones: true, skin: 0xd0d8ff, head: 'skull', emissiveEyes: 0xa0c0ff }, weapon: 'iron_shortsword',
    health: 40, damage: 0, speed: 5.5, reach: 2.4, attackRate: 1.0, level: 1, ai: 'melee', radius: 0.35, undead: true, faction: 'ally', summon: true, gore: 'bone',
  },
  scamp_summon: {
    name: 'Summoned Scamp', body: { kind: 'human', head: 'scamp', skin: 0xa04030, shirt: 0xa04030, pants: 0xa04030, scale: 0.8, hunch: 0.3, sleeves: false, tail: true, hairStyle: 'bald', emissiveEyes: 0xffaa00 },
    health: 50, magicka: 100, damage: 7, speed: 5.5, reach: 1.9, attackRate: 1.1, level: 1, ai: 'caster', spells: ['flare'], attackKind: 'punch', radius: 0.35, faction: 'ally', summon: true,
  },
};

// Leveled lists: [templateId, minPlayerLevel, weight]
export const LEVELED = {
  forest: [['wolf', 1, 3], ['rat', 1, 1], ['bandit', 1, 2], ['goblin', 1, 2], ['bandit_archer', 2, 1], ['timber_wolf', 4, 2], ['goblin_berserker', 5, 1], ['bandit_mage', 3, 1]],
  shore: [['mudcrab', 1, 4], ['rat', 1, 1], ['mudcrab', 3, 1]],
  wildlife: [['deer', 1, 2], ['doe', 1, 3]],
  bandits: [['bandit', 1, 3], ['bandit_archer', 1, 2], ['bandit_mage', 2, 1]],
  ruin: [['skeleton', 1, 3], ['zombie', 1, 2], ['ghost', 2, 1], ['skeleton_guardian', 4, 2], ['rat', 1, 1]],
  daedra: [['scamp', 1, 3], ['clannfear', 1, 2], ['dremora', 2, 2]],
  undead_night: [['skeleton', 1, 2], ['zombie', 1, 2], ['ghost', 3, 1]],
  dawn: [['dawn_cultist', 1, 3], ['dawn_acolyte', 1, 1]],
  ashen: [['ashen_dead', 1, 4], ['skeleton', 1, 1], ['ghost', 2, 1]],
  snow: [['wolf', 1, 3], ['timber_wolf', 3, 3], ['deer', 1, 1]],
  rime: [['ice_wraith', 1, 3], ['frost_atronach', 2, 2], ['skeleton', 1, 1]],
  rabbits: [['snow_rabbit', 1, 1]],
  greenheart: [['deer', 1, 2], ['doe', 1, 3], ['chipmunk', 1, 4]],
  drowned: [['drowned', 1, 4], ['drowned_harpooner', 2, 2]],
  drowned_grotto: [['mudcrab', 1, 2], ['drowned', 1, 3], ['drowned_harpooner', 2, 1]],
  cove_shore: [['mudcrab', 1, 1]],
};

export function pickLeveled(list, playerLevel, rand = Math.random) {
  const opts = LEVELED[list].filter(([, min]) => min <= playerLevel);
  const total = opts.reduce((s, o) => s + o[2], 0);
  let r = rand() * total;
  for (const [id, , w] of opts) {
    r -= w;
    if (r <= 0) return id;
  }
  return opts[opts.length - 1][0];
}

// ---------------- named townsfolk
const CHORROL = { x: -380, z: -300 };
export const NPCS = [
  // Chorrol guards
  { id: 'guard_chorrol_1', tpl: 'guard', name: 'Chorrol Guard', cell: 'world', x: CHORROL.x - 6, z: CHORROL.z + 64, patrol: [[CHORROL.x - 2, CHORROL.z + 64], [CHORROL.x - 2, CHORROL.z + 22], [CHORROL.x + 16, CHORROL.z + 4], [CHORROL.x + 40, CHORROL.z - 1], [CHORROL.x + 16, CHORROL.z + 4], [CHORROL.x - 2, CHORROL.z + 22]] },
  { id: 'guard_chorrol_2', tpl: 'guard', name: 'Chorrol Guard', cell: 'world', x: CHORROL.x + 6, z: CHORROL.z + 64, patrol: [[CHORROL.x + 6, CHORROL.z + 64], [CHORROL.x + 6, CHORROL.z + 66]] },
  { id: 'guard_chorrol_3', tpl: 'guard', name: 'Chorrol Guard', cell: 'world', x: CHORROL.x + 20, z: CHORROL.z - 20, patrol: [[CHORROL.x + 3, CHORROL.z - 26], [CHORROL.x + 2, CHORROL.z - 16], [CHORROL.x - 16, CHORROL.z - 2], [CHORROL.x - 45, CHORROL.z - 1], [CHORROL.x - 16, CHORROL.z + 3], [CHORROL.x - 2, CHORROL.z + 16], [CHORROL.x + 2, CHORROL.z + 45], [CHORROL.x + 2, CHORROL.z + 16], [CHORROL.x + 16, CHORROL.z + 3], [CHORROL.x + 38, CHORROL.z - 1], [CHORROL.x + 16, CHORROL.z - 3], [CHORROL.x + 2, CHORROL.z - 16]] },
  { id: 'guard_chorrol_4', tpl: 'guard', name: 'Chorrol Guard', cell: 'world', x: CHORROL.x + 64, z: CHORROL.z + 4, patrol: [[CHORROL.x + 64, CHORROL.z + 4], [CHORROL.x + 64, CHORROL.z + 6]] },
  { id: 'captain', tpl: 'guard', name: 'Captain Bernadette Peneles', cell: 'world', x: CHORROL.x + 18, z: CHORROL.z - 38, essential: true, dialogue: 'captain', captain: true, female: true },
  // townsfolk
  { id: 'reynald', tpl: 'citizen', name: 'Reynald Jemane', race: 'breton', cell: 'world', x: CHORROL.x + 6, z: CHORROL.z + 10, wander: 14, dialogue: 'reynald', shirt: 0x6a3a2a, essential: true },
  { id: 'teekeeus', tpl: 'citizen', name: 'Teekeeus', race: 'argonian', cell: 'world', x: CHORROL.x - 10, z: CHORROL.z - 4, wander: 6, dialogue: 'teekeeus', robe: true, shirt: 0x2a3a6a, merchant: 'spells', essential: true },
  { id: 'laythe', tpl: 'citizen', name: 'Laythe Wavrick', race: 'imperial', cell: 'world', x: CHORROL.x - 20, z: CHORROL.z + 20, wander: 20, dialogue: 'citizen', shirt: 0x5a6a3a, female: true },
  { id: 'valus', tpl: 'citizen', name: 'Valus Odiil', race: 'imperial', cell: 'world', x: CHORROL.x + 25, z: CHORROL.z + 25, wander: 18, dialogue: 'citizen', shirt: 0x3a4a6a },
  { id: 'dar_jee', tpl: 'citizen', name: "Dar Jee", race: 'khajiit', cell: 'world', x: CHORROL.x + 30, z: CHORROL.z - 10, wander: 16, dialogue: 'citizen', shirt: 0x6a5a2a },
  { id: 'glarthir', tpl: 'citizen', name: 'Glarthir', race: 'bosmer', cell: 'world', x: CHORROL.x - 35, z: CHORROL.z - 30, wander: 10, dialogue: 'glarthir', shirt: 0x3a5a2a },
  // more of Chorrol's townsfolk, out and about near their homes
  { id: 'honditar', tpl: 'citizen', name: 'Honditar', race: 'bosmer', cell: 'world', x: CHORROL.x + 4, z: CHORROL.z + 30, wander: 12, dialogue: 'citizen', shirt: 0x5a6a2a },
  { id: 'casta', tpl: 'citizen', name: 'Casta Scribonia', race: 'imperial', cell: 'world', x: CHORROL.x + 5, z: CHORROL.z + 40, wander: 10, dialogue: 'citizen', shirt: 0x7a3a5a, female: true },
  { id: 'francois', tpl: 'citizen', name: 'Francois Motierre', race: 'breton', cell: 'world', x: CHORROL.x - 4, z: CHORROL.z + 22, wander: 14, dialogue: 'citizen', shirt: 0x2a4a6a },
  { id: 'earana', tpl: 'citizen', name: 'Earana', race: 'altmer', cell: 'world', x: CHORROL.x - 18, z: CHORROL.z + 18, wander: 10, dialogue: 'citizen', shirt: 0x8a7a3a, female: true },
  { id: 'talasma', tpl: 'citizen', name: 'Talasma', race: 'dunmer', cell: 'world', x: CHORROL.x + 30, z: CHORROL.z + 46, wander: 9, dialogue: 'citizen', shirt: 0x6a2a2a, female: true },
  // interiors
  { id: 'emfrid', tpl: 'citizen', name: 'Emfrid', race: 'nord', cell: 'inn', x: 0, z: -3.5, dialogue: 'innkeeper', merchant: 'inn', shirt: 0x6a4a3a, female: true, essential: true, stationary: true },
  // a very old man who has sat in the same chair for sixty years; once, a long time ago, his name was Tam Corwyn
  { id: 'inn_patron', tpl: 'citizen', name: 'Rimalus Bruiant', race: 'imperial', cell: 'inn', x: -5, z: 3, dialogue: 'rimalus', shirt: 0x4a3a2e, hair: 0xd8d6cc, hairStyle: 'short', beard: true, essential: true, stationary: true, spawnUnless: 'tamFollowing' },
  { id: 'seed_neeus', tpl: 'citizen', name: 'Seed-Neeus', race: 'argonian', cell: 'shop', x: 0, z: -2.5, dialogue: 'seed_neeus', merchant: 'general', shirt: 0x5a5a3a, female: true, essential: true, stationary: true },
  { id: 'jauffre', tpl: 'citizen', name: 'Jauffre', race: 'breton', cell: 'priory', x: 0, z: -5, dialogue: 'jauffre', robe: true, shirt: 0x5a4a3a, hair: 0xb0b0b0, hairStyle: 'bald', beard: true, essential: true, stationary: true },
  { id: 'maborel', tpl: 'citizen', name: 'Prior Maborel', race: 'imperial', cell: 'world', x: -244, z: -140, wander: 10, dialogue: 'maborel', robe: true, shirt: 0x5a4a3a, essential: true },
  // Kvatch survivors
  { id: 'savlian', tpl: 'kvatch_soldier', name: 'Savlian Matius', cell: 'world', x: -360, z: 240, dialogue: 'savlian', essential: true, stationary: true },
  { id: 'kvatch_soldier_1', tpl: 'kvatch_soldier', name: 'Kvatch Soldier', cell: 'world', x: -366, z: 250, stationary: true, dialogue: 'soldier' },
  { id: 'kvatch_soldier_2', tpl: 'kvatch_soldier', name: 'Kvatch Soldier', cell: 'world', x: -352, z: 246, stationary: true, dialogue: 'soldier' },
  // wanderers
  { id: 'maiq', tpl: 'citizen', name: "M'aiq the Liar", race: 'khajiit', cell: 'world', x: -60, z: -10, wander: 40, dialogue: 'maiq', shirt: 0x7a2a2a, essential: true },
  // main quest, act two
  { id: 'martin', tpl: 'citizen', name: 'Martin', race: 'imperial', cell: 'kvatch_chapel', dialogue: 'martin', robe: true, shirt: 0x9a6a20, hair: 0x6a5a4a, hairStyle: 'short', essential: true, stationary: true, spawnUnless: 'martinLeftChapel' },
  { id: 'martin_priory', tpl: 'citizen', name: 'Martin Septim', race: 'imperial', cell: 'priory', dialogue: 'martin', robe: true, shirt: 0x9a6a20, hair: 0x6a5a4a, hairStyle: 'short', essential: true, stationary: true, spawnIf: 'martinAtPriory' },
  { id: 'jakben', tpl: 'citizen', name: 'Jakben, Earl of Imbel', race: 'imperial', cell: 'kvatch_chapel', dialogue: 'jakben', shirt: 0x5a3a6a, hair: 0x8a8a8a, beard: true, essential: true, stationary: true },
  { id: 'tierra', tpl: 'citizen', name: 'Tierra', race: 'redguard', cell: 'kvatch_chapel', dialogue: 'kvatch_refugee', shirt: 0x6a5a3a, female: true, stationary: true },
  { id: 'aurelian', tpl: 'citizen', name: 'Aurelian Vix', race: 'imperial', cell: 'world', x: -373.5, z: -292.5, dialogue: 'recruiter', shirt: 0x3a2a2a, hood: true, stationary: true, weapon: 'dawn_blade', loot: 'dawn', extraLoot: ['mythic_dawn_robe', 'commentaries_1'], activeHours: [23, 3], activeQuest: ['mq_dawn', 10, 19], spawnUnless: 'recruiterGone' },
  // The Libram of Lesser Wonders
  { id: 'aldous', tpl: 'citizen', name: 'Aldous Quillwhistle', race: 'breton', cell: 'quill_spire', dialogue: 'aldous', merchant: 'wizard', robe: true, shirt: 0x5a3a9a, kitTint: 0x8a6ad8, hair: 0xe8e8e0, hairStyle: 'long', beard: true, essential: true, stationary: true, idleAnim: 'Idle_Talking_Loop' },
  // The Ballad of the Hero
  { id: 'tillmon', tpl: 'citizen', name: 'Tillmon Larkspur', race: 'breton', cell: 'world', x: 52, z: 41, wander: 3, dialogue: 'tillmon', shirt: 0x8a2a8a, kitOutfit: 'ranger', kitTint: 0xd040e0, hair: 0xc89040, hairStyle: 'long', essential: true, spawnUnless: 'bardAtInn', idleAnim: 'Idle_Talking_Loop' },
  { id: 'tillmon_inn', tpl: 'citizen', name: 'Tillmon Larkspur', race: 'breton', cell: 'inn', dialogue: 'tillmon', shirt: 0x8a2a8a, kitOutfit: 'ranger', kitTint: 0xd040e0, hair: 0xc89040, hairStyle: 'long', essential: true, stationary: true, spawnIf: 'bardAtInn', spawnUnless: 'bardRevealed' },
  { id: 'sheogorath', tpl: 'citizen', name: 'Sheogorath, Prince of Madness', race: 'imperial', cell: 'inn', dialogue: 'sheogorath', shirt: 0x5a1a7a, kitOutfit: 'ranger', kitTint: 0x8a20d0, hair: 0xd8d8d0, hairStyle: 'short', beard: true, essential: true, stationary: true, spawnIf: 'bardRevealed', spawnUnless: 'sheoGone' },
  // The Unfinished Map
  { id: 'ysolde', tpl: 'citizen', name: 'Ysolde Vane', race: 'breton', cell: 'inn', dialogue: 'ysolde', shirt: 0x4a4a6a, hair: 0xd8d8d8, hairStyle: 'long', female: true, essential: true, stationary: true, spawnUnless: 'ysoldeGone' },
  { id: 'corvin', tpl: 'citizen', name: 'Corvin Ashby', race: 'imperial', cell: 'none', dialogue: 'corvin', shirt: 0x4a5a6a, hair: 0x5a3a20, hairStyle: 'short', beard: true, essential: true },
  { id: 'corvin_home', tpl: 'citizen', name: 'Corvin Ashby', race: 'imperial', cell: 'inn', dialogue: 'corvin', shirt: 0x4a5a6a, hair: 0x5a3a20, hairStyle: 'short', beard: true, essential: true, stationary: true, spawnIf: 'corvinHome' },
  { id: 'old_marrow', tpl: 'citizen', name: 'Old Marrow', race: 'bosmer', cell: 'world', x: -101.5, z: 258, wander: 4, dialogue: 'marrow', shirt: 0x4a3a20, hair: 0x9a9a8a, hairStyle: 'long', beard: true, essential: true },
  // The Lantern in the Wood
  { id: 'bram', tpl: 'citizen', name: 'Bram Hollis', race: 'nord', cell: 'shop', dialogue: 'bram', shirt: 0x5a4a32, hair: 0xc8a060, hairStyle: 'short', essential: true, stationary: true },
  { id: 'maela', tpl: 'citizen', name: 'The Lantern Woman', race: 'imperial', cell: 'world', x: -391, z: -91, wander: 3.5, dialogue: 'maela', female: true, robe: true, shirt: 0x7484b4, hair: 0xb0bcd8, hairStyle: 'long',
    skin: 0x90a2cc, opacity: 0.5, float: true, emissiveEyes: 0xfff0c0, ghostly: true, untouchable: true, essential: true, activeHours: [20, 5], spawnUnless: 'maelaAtRest' },
  // Wintersmeet
  { id: 'sigrun', tpl: 'citizen', name: 'Sigrun Warmhands', race: 'nord', cell: 'snow_hare', dialogue: 'sigrun', merchant: 'snowhare', innkeeper: true, shirt: 0x8a3a3a, kitTint: 0xc85a4a, hair: 0xe8c890, hairStyle: 'long', female: true, essential: true, stationary: true },
  { id: 'erlend', tpl: 'citizen', name: 'Erlend Ice-Fisher', race: 'nord', cell: 'snow_hare', dialogue: 'erlend', shirt: 0x3a4a6a, hair: 0x9a7a5a, beard: true, stationary: true, idleAnim: 'Idle_Talking_Loop' },
  { id: 'gunnar', tpl: 'citizen', name: 'Gunnar Split-Log', race: 'nord', cell: 'world', x: -194, z: -544, wander: 4, dialogue: 'gunnar', shirt: 0x6a3a2a, hair: 0xb06a3a, beard: true },
  { id: 'matilde', tpl: 'citizen', name: 'Matilde Brindle', race: 'breton', cell: 'world', x: -167, z: -553, dialogue: 'matilde', merchant: 'bakery', shirt: 0xd8b8a0, kitTint: 0xe8d0c0, hair: 0x5a3a2a, hairStyle: 'long', female: true, stationary: true },
  { id: 'brynja', tpl: 'citizen', name: 'Old Brynja', race: 'nord', cell: 'world', x: -183, z: -538, wander: 5, dialogue: 'brynja', shirt: 0x5a4a6a, hair: 0xe0e0e0, hairStyle: 'long', female: true },
  // The White Hare
  { id: 'varn', tpl: 'citizen', name: 'Varn Ice-Eye', race: 'nord', cell: 'world', x: -327, z: -537, wander: 3, dialogue: 'varn', shirt: 0x4a3a2a, hair: 0xd8d0c0, hairStyle: 'short', beard: true, weapon: 'iron_waraxe', armor: ['fur_cuirass', 'fur_helmet'], health: 120, level: 6, fixedLevel: true, loot: 'bandit', extraLoot: ['varn_ledger', 'gold*40'], idleAnim: 'Idle_Talking_Loop' },
  { id: 'cassius', tpl: 'citizen', name: 'Magister Cassius Frey', race: 'imperial', cell: 'rime_spire', dialogue: 'cassius', robe: true, shirt: 0x6a6e78, kitTint: 0x8a96a8, hair: 0xd0d0d0, hairStyle: 'short', beard: true, stationary: true,
    ai: 'caster', spells: ['frostbite', 'frostbite', 'shock_bolt'], health: 240, magicka: 320, reach: 18, attackRate: 0.8, level: 8, fixedLevel: true, loot: 'chest_boss', extraLoot: ['frostward_ring', 'cassius_journal'], spawnUnless: 'cassiusLeft',
    taunts: ['I watched Kvatch burn. I will not watch it again!', 'Every flake of this snow is a soldier!', 'You would open the door to Dagon himself!', 'Forgive me. Forgive me.'] },
  { id: 'cassius_home', tpl: 'citizen', name: 'Cassius Frey', race: 'imperial', cell: 'snow_hare', dialogue: 'cassius', robe: true, shirt: 0x6a6e78, kitTint: 0x8a96a8, hair: 0xd0d0d0, hairStyle: 'short', beard: true, stationary: true, essential: true, spawnIf: 'cassiusHome' },
  // A Crown of Starflowers
  { id: 'hob', tpl: 'citizen', name: 'Hob Furrowfield', race: 'imperial', cell: 'world', x: 584, z: 244, wander: 16, dialogue: 'hob', shirt: 0x6a5a3a, kitOutfit: 'ranger', kitTint: 0x8a7a50, hair: 0xb8b0a0, hairStyle: 'short', beard: true, essential: true },
  // Ten White Rabbits
  { id: 'snikkit', tpl: 'citizen', name: 'Snikkit', cell: 'world', x: 63, z: -517, wander: 3, dialogue: 'snikkit', faction: 'neutral', band: 'snikkit',
    head: 'goblin', skin: 0x7a9a5a, shirt: 0x5a4a6a, pants: 0x3a2a18, scale: 0.78, hunch: 0.35, sleeves: false, hairStyle: 'bald',
    ai: 'melee', weapon: 'iron_dagger', health: 70, speed: 5, reach: 2.0, attackRate: 1.3, level: 4, fixedLevel: true, loot: 'goblin', extraLoot: ['snikkit_key'],
    taunts: ['NOT THE RABBITS!', 'Snikkit bites! Snikkit bites HARD!', 'You leave Fluff alone!'] },
  // The Greenheart: the Bosmer of Falinor
  { id: 'eranwe', tpl: 'citizen', name: 'Eranwe Greenfletch', race: 'bosmer', cell: 'greenheart', x: -66, z: -40, dialogue: 'eranwe', female: true, kitOutfit: 'ranger', kitTint: 0x4a7a34, shirt: 0x4a7a34, hair: 0xc89040, hairStyle: 'long', essential: true, stationary: true, weapon: 'elven_bow', idleAnim: 'Idle_FoldArms_Loop' },
  { id: 'velandil', tpl: 'citizen', name: 'Treethane Velandil', race: 'bosmer', cell: 'greenheart', x: 0, z: 0, dialogue: 'velandil', female: true, robe: true, shirt: 0x6a8a3a, kitTint: 0x8aaa4a, hair: 0xe0e0d0, hairStyle: 'long', essential: true, stationary: true, onPlatform: true },
  { id: 'mirieth', tpl: 'citizen', name: 'Mirieth', race: 'bosmer', cell: 'greenheart', x: 16.8, z: 0.4, dialogue: 'mirieth', merchant: 'bosmer', female: true, kitOutfit: 'ranger', kitTint: 0x8a6a3a, shirt: 0x8a6a3a, hair: 0x3a2a1a, hairStyle: 'long', essential: true, stationary: true },
  { id: 'thaldir', tpl: 'citizen', name: 'Thaldir', race: 'bosmer', cell: 'greenheart', x: 18, z: 18, wander: 10, dialogue: 'falinor_folk', kitOutfit: 'ranger', kitTint: 0x5a6a2a, shirt: 0x5a6a2a },
  { id: 'ninwe', tpl: 'citizen', name: 'Ninwe', race: 'bosmer', cell: 'greenheart', x: -16, z: 16, wander: 10, dialogue: 'falinor_folk', female: true, shirt: 0x7a5a2a, hairStyle: 'long' },
  { id: 'aralen', tpl: 'citizen', name: 'Aralen', race: 'bosmer', cell: 'greenheart', x: -6, z: 30, wander: 12, dialogue: 'falinor_folk', kitOutfit: 'ranger', kitTint: 0x3a5a3a, shirt: 0x3a5a3a },
  // The Admiral: the crew of the Indignant Herring, Brinewhistle Cove
  { id: 'gallowglass', tpl: 'citizen', name: 'Captain Rourke Gallowglass', race: 'breton', cell: 'herring', dialogue: 'gallowglass', shirt: 0x8a1a1a, kitTint: 0xa82a22, hair: 0xb8805a, hairStyle: 'long', beard: true, hat: 'tricorn', essential: true, stationary: true, hideWhen: 'captainAway', idleAnim: 'Idle_Talking_Loop' },
  { id: 'gallowglass_pier', tpl: 'citizen', name: 'Captain Rourke Gallowglass', race: 'breton', cell: 'cove', x: COVE.pierWait.x, z: COVE.pierWait.z, dialogue: 'gallowglass', shirt: 0x8a1a1a, kitTint: 0xa82a22, hair: 0xb8805a, hairStyle: 'long', beard: true, hat: 'tricorn', essential: true, stationary: true, activeQuest: ['sq_cat4', 10, 99], activeHours: [20, 4], hideWhen: 'captainFollowing' },
  { id: 'odette', tpl: 'citizen', name: 'Odette "Two-Hooks" Lark', race: 'redguard', cell: 'salty_mitten', dialogue: 'odette', merchant: 'brinewhistle', innkeeper: true, shirt: 0x2a4a6a, kitTint: 0x3a5a8a, hair: 0x1a1410, hairStyle: 'long', female: true, essential: true, stationary: true },
  { id: 'grumm', tpl: 'citizen', name: 'Grumm gro-Shank', race: 'orc', cell: 'cove', x: COVE.grummBeach.x, z: COVE.grummBeach.z, wander: 7, dialogue: 'grumm', shirt: 0xd88a3a, kitTint: 0xe09a4a, hairStyle: 'bald', beard: true, essential: true, activeHours: [6, 20] },
  { id: 'grumm_inn', tpl: 'citizen', name: 'Grumm gro-Shank', race: 'orc', cell: 'salty_mitten', dialogue: 'grumm', shirt: 0xd88a3a, kitTint: 0xe09a4a, hairStyle: 'bald', beard: true, essential: true, stationary: true, activeHours: [20, 6] },
  { id: 'jzhirr', tpl: 'citizen', name: "J'zhirr", race: 'khajiit', cell: 'cove', x: COVE.lighthouseSteps.x, z: COVE.lighthouseSteps.z, wander: 3, dialogue: 'jzhirr', shirt: 0x5a3a6a, kitTint: 0x7a4a8a, essential: true, activeHours: [6, 20], idleAnim: 'Idle_FoldArms_Loop' },
  { id: 'jzhirr_inn', tpl: 'citizen', name: "J'zhirr", race: 'khajiit', cell: 'salty_mitten', dialogue: 'jzhirr', shirt: 0x5a3a6a, kitTint: 0x7a4a8a, essential: true, stationary: true, activeHours: [20, 6], idleAnim: 'Idle_FoldArms_Loop' },
  // one of the drowned, whose legs washed off in the surf; he lives in a barrel by the pier now, and is very sorry
  { id: 'fennick', tpl: 'citizen', name: 'Fishbones Fennick', cell: 'cove', x: COVE.barrel.x, z: COVE.barrel.z, dialogue: 'fennick', bones: true, head: 'skull', skin: 0xc8ccb0, emissiveEyes: 0x60ffc0, seaweed: true, essential: true, stationary: true, spawnIf: 'fennickAshore', noFacePlayer: true },
  { id: 'brisk', tpl: 'citizen', name: 'Mother Agathe Brisk', race: 'breton', cell: 'meringue', dialogue: 'brisk', female: true, shirt: 0x2a3a34, kitTint: 0x4a6a5a, hair: 0xc0d0c8, hairStyle: 'long', hat: 'tricorn',
    skin: 0x9ab8b0, opacity: 0.55, float: true, emissiveEyes: 0xc0ffe0, ghostly: true, stationary: true, spawnUnless: 'briskGone',
    ai: 'caster', spells: ['frostbite', 'frostbite'], health: 260, magicka: 300, reach: 18, attackRate: 0.8, level: 8, fixedLevel: true, loot: 'drowned', extraLoot: ['brisk_tricorn'],
    taunts: ['Give me my CAT!', 'Forty years! FORTY YEARS!', 'All hands! Repel boarders!', 'You\'re no better than that crying cabin boy!'] },
  { id: 'roxey_keeper', tpl: 'citizen', name: 'Mirabelle Monet', race: 'breton', cell: 'world', x: 64, z: 40, wander: 4, dialogue: 'innkeeper_roxey', merchant: 'food', shirt: 0x7a5a6a, female: true, essential: true },
];

// Outfit templates for townsfolk
export const PEOPLE = {
  guard: { body: { armor: { chest: 0x2a5a30, head: 0x8a8a8a, legs: 0x6a6a6a, feet: 0x4a4a4a } }, weapon: 'steel_longsword', shield: 'iron_shield', health: 160, speed: 4.8, reach: 2.6, attackRate: 1.0, level: 10, fixedLevel: true, ai: 'guard', radius: 0.4, block: 0.4, faction: 'town' },
  kvatch_soldier: { body: { armor: { chest: 0x7a5a20, head: 0x8a8a8a, legs: 0x6a6a6a, feet: 0x4a4a4a } }, weapon: 'steel_longsword', shield: 'iron_shield', health: 140, speed: 4.6, reach: 2.6, attackRate: 1.0, level: 8, fixedLevel: true, ai: 'guard', radius: 0.4, block: 0.4, faction: 'town' },
  citizen: { body: {}, health: 50, speed: 3.5, reach: 2.0, attackRate: 0.8, level: 2, fixedLevel: true, ai: 'civilian', radius: 0.38, faction: 'town' },
};
