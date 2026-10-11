# Quest Bible

This is the single reference for every quest in the game. For each one it records the story, the steps, who and where, the choices, the rewards, and the flags and code hooks that drive it.

**Keep it current.** Update this file in the same change whenever a quest, stage, quest NPC, quest item or quest location is added, removed or rewritten.

- Journal text lives in `src/data/quests.js`. This file paraphrases it; the code is the source of truth for the exact wording.
- Dialogue lives in `src/data/dialogue.js`.
- Quest NPCs and monsters live in `src/data/actors.js`.
- Quest items live in `src/data/items.js`.
- Scripted beats live in `src/game.js`: the `main quest, act two`, `The Ballad of the Hero`, `The Unfinished Map`, `The Lantern in the Wood` and `The White Hare` sections, plus `updateQuestTriggers`.
- World sites live in `src/world/questSites.js`, interiors in `src/world/interiors.js`, and spawn points in `src/world/cells.js`.

Coordinates are overworld metres: north is −Z and east is +X. Chorrol is at (−380, −300), Weynon Priory at (−250, −150), Kvatch at (−450, 340) and the Imperial City at (260, 260).

---

## At a glance

| Id | Quest | Type | Starts with | Length | Leads to |
|---|---|---|---|---|---|
| `mq_amulet` | Deliver the Amulet | Main, act I | New game (Sewers exit) | 10 min | `mq_gate` |
| `mq_gate` | Breaking the Siege of Kvatch | Main, act I | Jauffre | 20–30 min | `mq_heir` |
| `mq_heir` | Find the Heir | Main, act II | Jauffre (Kvatch topic) | 15 min | `mq_priory` |
| `mq_priory` | Weynon Priory | Main, act II | Arriving at the priory with Martin | 5–10 min | `mq_dawn` |
| `mq_dawn` | The Path of Dawn | Main, act II | Jauffre (orders) | 15 min | `mq_shrine` |
| `mq_shrine` | Dagon Shrine | Main, act II | Entering Fort Sutch | 15–20 min | Ending screen |
| `ms_heirloom` | The Jemane Heirloom | Side | Reynald Jemane (Chorrol) | 15 min | — |
| `ms_bounty` | Bounty: Black Brugo | Side | Captain Peneles (Chorrol) | 15 min | — |
| `sq_map` | The Unfinished Map | Side story | Ysolde Vane (Grey Mare) | 30–60 min | — |
| `sq_bard` | The Ballad of the Hero | Side story, comedy | Tillmon Larkspur (Roxey Inn) | ~20 min | — |
| `sq_wizard` | The Libram of Lesser Wonders | Side quest | Aldous Quillwhistle (Quillwhistle's Spire, Chorrol) | 10–15 min | Unlocks the 27-spell Wonders shop |
| `sq_lantern` | The Lantern in the Wood | Ghost questline, part 1 | Seed-Neeus (Northern Goods and Trade, Chorrol) | 10–15 min | `sq_ashes` |
| `sq_ashes` | Ashes and Embers | Ghost questline, part 2 | Seed-Neeus | 10–15 min | `sq_gloam` |
| `sq_gloam` | The Lamplighter | Ghost questline, part 3 (dungeon) | Maela Corwyn | 15–20 min | `sq_home` |
| `sq_home` | Come Home | Ghost questline, part 4 | Maela Corwyn | 10 min | Maela's Lantern |
| `sq_hare1` | The Hare That Didn't Come | Wintersmeet questline, part 1 | Sigrun Warmhands (the Snow Hare, Wintersmeet) | 10–15 min | `sq_hare2` |
| `sq_hare2` | Tracks in the Snow | Wintersmeet questline, part 2 | Old Brynja | 10–15 min | `sq_hare3` |
| `sq_hare3` | The Three Gifts | Wintersmeet questline, part 3 | Old Brynja | 15–25 min | `sq_hare4` |
| `sq_hare4` | The Rime Spire | Wintersmeet questline, part 4 (dungeon, choice) | Old Brynja | 20–30 min | `sq_hare5` |
| `sq_bunnies` | Ten White Rabbits | Side quest, three paths | Snikkit (goblin, his den NE of Wintersmeet); rumour from Gunnar | 15–25 min | White rabbits across the snows |
| `sq_pup` | A Crown of Starflowers | Side quest, companion | Hob Furrowfield (wandering by his wagon, east of Lake Rumare) | 5–10 min | A dog |
| `sq_hare5` | Lightwatch | Wintersmeet questline, part 5 (festival) | Sigrun Warmhands | 10 min | Mantle of the First Snow |
| `sq_moot` | The Chipmunk Moot | Side quest, archery challenge | Eranwe Greenfletch (Tumbling Grove, Falinor, in the Greenheart) | 5–10 min | Summon Spirit Hart spell |

The QuestLog only moves forward: `set(q, stage)` ignores any stage at or below the current one. A stage marked `done` completes the quest.

**Quest gold:** finishing any quest (reaching any `done` stage) pays **100 gold** (`QUEST_GOLD` in `game.js`), on top of the rewards listed below. It is paid once per quest, even for quests with several ending stages (`flags.questGold[q]`, saved).

---

## Main quest

### Act I

#### `mq_amulet` — Deliver the Amulet
- **Start:** a new game puts the player at the Imperial Sewers exit (30, 128) carrying the **Amulet of Kings**. The Emperor died in the sewers.
- **10:** take the amulet to **Jauffre** in Weynon House, inside Weynon Priory.
- **100:** Jauffre's *Amulet of Kings* topic takes the amulet and starts `mq_gate`. Reward: 100 gold and 2 Potions of Healing.

#### `mq_gate` — Breaking the Siege of Kvatch
- **10:** go to **Savlian Matius** at the siege camp below Kvatch (−360, 240).
- **20:** Savlian's *Oblivion Gate* topic: someone must enter the Gate (−395, 265) and take the Sigil Stone.
- **30:** in the Deadlands, reach the Sigil Keep (the `sigil` interior). The boss is **Dremora Kynval, Sigil Keeper**.
- **40:** take the Sigil Stone. The Gate collapses (`flags.gateClosed`) and the player is sent home.
- **50:** tell Savlian. Reward: Steel Shield and 3 Potions of Healing.
- **100:** report to Jauffre (*Kvatch* topic). Reward: Akaviri Katana and 500 gold. Jauffre then reveals the Emperor's secret son and starts `mq_heir` (sets `flags.chapelOpen`).
- **Old saves:** a save that already finished Kvatch can start act II through Jauffre's *The Emperor's heir* topic.

### Act II — about an hour

#### `mq_heir` — Find the Heir
- **10:** Jauffre explains that Uriel had an illegitimate son, **Martin**, a priest of Akatosh in Kvatch. Survivors are holed up in the Chapel of Akatosh. Savlian's *Chapel of Akatosh* topic points the way.
- **The door:** at the base of the burned steeple in Kvatch (−446, 341). It is barred (examine only) until `flags.chapelOpen`.
- **20:** entering the `kvatch_chapel` interior. Daedra (the `daedra` leveled list) have broken in and are attacking the survivors.
- **30:** the chapel is clear of monsters. Talk to Martin.
  - *Your father* is flavour: he thinks his father was a farmer near Bravil.
  - **Convince him**, either way:
    - *The Blade's katana* (requires the Akaviri Katana): he recognises the Blades' mark, and remembers a man with that sword visiting the farm every year.
    - *Trust me* (requires disposition 65 or more, via persuasion or bribes).
- **40:** Martin becomes a **follower** (`npc.following`, `flags.martinFollowing`, `flags.martinLeftChapel`). Escort him to Weynon Priory.
  - Followers move between cells with the player and catch up if left more than 40 m behind.
  - They are re-created next to the player after loading a save.
- **100:** set automatically when the player comes within 95 m of the priory with stage 40 active. This also starts `mq_priory`.
- **NPCs:** Martin (`martin`), Jakben, Earl of Imbel (`jakben`) and Tierra (`tierra`). Jakben and Tierra are canonical Kvatch survivors.

#### `mq_priory` — Weynon Priory
- **10:** `startPrioryAttack()`.
  - Four **Mythic Dawn Agents** (`dawn_assassin`) spawn around the priory, some attacking Prior Maborel. He is essential.
  - The chapel burns: flame, smoke and light are added to the world cell.
  - One assassin carries the **Mythic Dawn Orders**.
- **20:** all the assassins (`actor.prioryAssassin`) are dead. Go inside to Jauffre.
- **30:** Jauffre's *The attack* topic: the Amulet of Kings was stolen from his chest. Martin stops following and stays at the priory (`flags.martinAtPriory`; after a reload he spawns as `martin_priory` in priory slot 2).
- **100:** Jauffre's *Mythic Dawn orders* topic (requires `dawn_orders`) starts `mq_dawn`.

#### `mq_dawn` — The Path of Dawn
- **10:** the orders say "our brother waits beneath the Great Oak when the night is deepest".
- **15 (optional):** **Glarthir**, the paranoid Bosmer, has been keeping a list (*A stranger at the Oak*). It gives the hours.
- **The recruiter:** **Aurelian Vix** (`aurelian`) stands beside the Great Oak, but only between **23:00 and 03:00** and only while `mq_dawn` is between 10 and 19 (`activeHours` and `activeQuest`).
  - Outside those times he is hidden and can't be talked to (`actor.hiddenNow`).
  - **Join** (*"I want to join."*): he gives the **Mythic Dawn Robe** and the **Commentaries on the Mysterium Xarxes, Book One**, and sets `flags.dawnInitiate`. He then disappears (`flags.recruiterGone`).
  - **Threaten** (*"Tell me where the Amulet is."*): he turns hostile. Killing him isn't a crime because his faction flips to monster first. He drops the robe and the book (`extraLoot`).
- **20:** gaining `commentaries_1`.
- **30:** reading the book (using it from the inventory).
- **The puzzle:**
  - The epigraph says: *"Read me as the Dawn reads the world: by its first light."* The first letters of the nine passages spell **F-O-R-T S-U-T-C-H**.
  - The penultimate passage hints at "where the Emperor's soldiers once watched the Gold Coast road".
- **40:** solved by any of these:
  - Martin's *The Commentaries* topic, at the priory. He also confesses he dabbled in Daedra worship as a youth.
  - Discovering the Fort Sutch map location by exploring.
  - Entering the fort.
- **Jauffre's *The Commentaries* topic** points to Martin.
- **100:** entering `fort_sutch`.

#### `mq_shrine` — Dagon Shrine
- **Where:** the Fort Sutch ruin, west of Kvatch (−580, 380). It has a curtain wall, a standing tower and a collapsed one, a keep with crimson banners, and the door into `fort_sutch`. Outside are `dawn` leveled-list cultists.
- **The disguise:** with the **Mythic Dawn Robe** equipped, anything flagged `cultist` treats the player as faithful (`game.disguisedAmong`) and greets them ("Dawn's beauty, brother.").
  - Attacking a cultist blows the cover for the whole cell (`exposeDisguise`).
  - So does taking the book in view.
- **10:** entering the fort.
- **20:** **Ruma Camoran's sermon.**
  - It plays if the player, disguised, comes within 11 m of Ruma (`startSermon` and `tickSermon`).
  - Six lines: the Septim line is broken; the Amulet has been carried into Paradise by Mankar Camoran; gates will open everywhere.
  - Without a disguise, being near Ruma is enough to reach stage 20.
- **The twist:**
  - An **honest initiate** (`flags.dawnInitiate`) is told to go and pray. The acolytes then walk to the barracks beds and Ruma kneels facing the statue.
  - Wearing a robe **taken from Aurelian's corpse**, Ruma notices "Aurelian's blood is still on the hem", and the shrine attacks.
- **30:** take the **Mysterium Xarxes** from the altar (`xarxes_pickup`). This sets `flags.xarxesStolen`.
  - **Stealth:** if the player is sneaking and no cultist within 12 m is facing them with line of sight, the theft goes unnoticed (`silentTheft`). Walk out.
  - **Otherwise:** every cultist turns hostile, and Ruma summons **two dremora** once (`flags.rumaSummoned`).
- **40:** back in the overworld holding the Xarxes.
- **100:** Martin's *The Mysterium Xarxes* topic.
  - He takes the book, and plans the ritual to reach Paradise: a Daedric artifact, the blood of a Divine, a Great Welkynd Stone.
  - Reward: **Blades Cuirass** and 600 gold.
  - The **ending screen** ("The Path to Paradise") follows.
- **NPCs and monsters:** Ruma Camoran (`ruma_camoran`, boss), Mythic Dawn Zealots (`k` slots), Acolytes (`a` slots), and the statue of Mehrunes Dagon (a stone kit character in a frozen pose).

---

## Side quests

### `ms_heirloom` — The Jemane Heirloom
- **Giver:** **Reynald Jemane**, who wanders central Chorrol (*Jemane Heirloom* topic).
- **10:** recover his grandfather's sword from the Ayleid ruin of **Vilverin** (150, −40). It is guarded by the **Ayleid Lich-Knight** (`skeleton_champion`) behind the iron gate that the **Vilverin Gate Key** opens.
- **20:** pick up the Jemane Heirloom Blade (`jemane_blade_pickup`).
- **100:** return it. Reward: 200 gold and 2 Potions of Healing.
- **Flavour:** Reynald's grandfather **Severus Jemane** has a memorial stone in the Chapel of Stendarr's graveyard in Chorrol ("He went into Vilverin and never came out").
- **Notice board:** the Chorrol notice board by the south gate advertises the Black Brugo bounty, the Fighters Guild's absence, and Tillmon's lost lute. It also carries a note from Glarthir: "They are watching the Oak."

### `ms_bounty` — Bounty: Black Brugo
- **Giver:** **Captain Bernadette Peneles**, north Chorrol (*Black Brugo* topic). She gives the Bounty Notice.
- **10:** kill **Black Brugo**, an Orc chieftain, at the Black Road Camp (340, −360).
- **20:** loot **Brugo's Signet Ring**.
- **100:** hand it in. Reward: 300 gold and a Steel Helmet.

### `sq_map` — The Unfinished Map (30–60 minutes, three endings)

**Premise:** **Ysolde Vane**, a dying Imperial cartographer at the Grey Mare, hands over the last map of her partner **Corvin Ashby**, who vanished 40 years ago while searching for the Ayleid city of **Nenalatha**. The secret is that Ysolde sealed him in herself, out of envy.

1. **10:** Ysolde's *Corvin's Map* topic. She gives **Corvin's Unfinished Map** and 50 gold. Its three marks are a stone ring, a bell and a tree with an eye.
2. **20 — The Hollow Stones** (−600, −380), north-west hills.
   - Nine menhirs and an altar with moon, star and sun glyphs.
   - **Corvin's Waymark** lies on the altar: "the door hears only the bell's true note, in the hour that belongs to no day". It also gives the pedestal order: moon, stars, sun.
3. **30 — The Drowned Bell**, an islet in the south-western shallows of Lake Rumare (90, 403).
   - A ruined chapel tower, a fallen bronze bell scratched "RING ME AND HE COMES HOME", and stepping stones from the shore.
   - Guarded by mudcrabs and **Sister Anwen, the Bell-Warden**, a ghost.
   - The locked strongbox holds the **Bellwright's Tuning Fork** and a **Torn Journal Page** in Ysolde's handwriting.
   - Optional: show Ysolde the page (*The journal page*) and she half-confesses (`flags.ysoldeAdmitted`).
4. **40 — Old Marrow**, a Bosmer hermit in the south-western woods (−100, 260), next to a lean-to and a tree with a carved eye.
   - He talks if given **Cyrodilic Brandy**, which Emfrid sells, or at disposition 70 or more.
   - Midnight is "the hour that belongs to no day"; the order is moon, stars, sun; and a woman went up the path with Corvin and came back alone.
5. **50 — the door.** Use the altar between **23:00 and 01:00** while carrying the fork. A door of light opens between the north trilithons (`flags.nenalathaOpen`). At other hours the note just dies away.
6. **60 — Nenalatha**, a new Ayleid dungeon (`nenalatha` interior), reached on entering.
7. **70 — the pedestal puzzle.** Touch **Moon, Star, Sun** in that order.
   - A wrong order resets the glyphs and spawns two ghosts.
   - Solving it sinks the light gate (`flags.nenGate`).
8. **75 — the Archivist** (`archivist`): a lich-knight boss with a frost spell guards the Hall of Hours.
9. **The choice:**
   - **80 — Free Corvin:** strike the welkynd crystal. The Atlas burns to ash and Corvin becomes a follower (`flags.corvinFreed`, `flags.corvinFollowing`).
   - **85 — Take the Atlas of Hours:** the crystal goes dark (`flags.atlasTaken`). The Atlas fully restores the player once a day when read.
10. **Endings, at the Grey Mare:**
    - **100, Reunion** (Corvin present, *Corvin is here*): Ysolde confesses and Corvin forgives her. She dies before dawn holding his hand.
      - Reward: **Corvin's Waymark Ring** (+20 Health, +20 Magicka), **The Finished Map** (reveals every map location) and 400 gold.
      - Corvin then lives at the inn (`corvin_home`).
    - **110, the kind lie** (*"He died long ago."*): she confesses, gives her purse (500 gold) and dies that night.
    - **110, the truth** (*"I found him. I chose the Atlas."*): "We're the same, you and I." She dies that night with no reward.
- **Flags:** `ysoldeGone`, `corvinHome`, `nenalathaOpen`, `nenGate`, `nenSeq`, `corvinFreed`, `atlasTaken`, `atlasDay`.

### `sq_bard` — The Ballad of the Hero (about 20 minutes, comedy, with a surprise)

**Premise:** **Tillmon Larkspur, Bard of the Third Verse** ("the first two were lost in a puddle") is writing *The Ballad of the Hero of Kvatch*, about the player, outside the Roxey Inn (52, 41).

- **Foreshadowing:** he pays for things in cheese and talks about an uncle on an island who is "Shivering, mostly". Mirabelle notes he paid for his room with a whole wheel of cheese.

1. **10:** *Your ballad*. His lute, **Lady Plucksworth**, was stolen by a mudcrab heading for the lake shore.
2. **20 — Sir Pinchington the Unpleasant**, a giant mudcrab with taunts ("PINCH."), on the shore north-east of the inn (91, 66). He drops the lute and a wheel of cheese.
   - Killing him first and meeting Tillmon later also works: the quest jumps to 20.
3. **30:** *Lady Plucksworth*. Tillmon needs a rhyme for "Oblivion" from three people (*A rhyme for "Oblivion"* topic on each):
   - **M'aiq the Liar** (roads near the Sewers exit): "trivial bun".
   - **Mirabelle Monet** (Roxey Inn): "sad civilian", plus a threat of turnips.
   - **Glarthir** (Chorrol): "grim Vivian".
4. **40:** all three rhymes collected (`flags.rhymeMaiq`, `flags.rhymeMirabelle`, `flags.rhymeGlarthir`).
5. **50:** *Rhymes for "Oblivion"*. Now invite **three** guests from **Reynald Jemane, Laythe Wavrick, Valus Odiil, Dar Jee or Teekeeus** (*Tillmon's premiere* topic; `flags.invited_<id>`). Each has a different reaction.
6. **60:** with three guests, Tillmon moves to the **Grey Mare** (`flags.bardAtInn`; world `tillmon` despawns, `tillmon_inn` appears in inn slot 5).
7. **70 — the premiere.** *Begin the performance*, between **19:00 and 23:00** only.
   - The guests are seated as `aud_<id>`.
   - Tillmon dances and sings ten lines with lute music, one of them deliberately out of tune, and the audience heckles.
8. **80 — the surprise.** On "…except for ME!" there is a purple rune circle, a pillar of light and a storm of butterflies. Tillmon is **Sheogorath, Prince of Madness**.
   - Twelve takeable **Wheels of Cheese** rain onto the floor.
   - "CHEESE FOR EVERYONE!", followed by "Is that… part of the show?" and Dar Jee asking for a refund.
   - Sheogorath's topics:
     - *Who are you?*: he was bored of Dagon's solemn war and wanted a terrible song.
     - *What happened to Tillmon?*: "Tillmon was me… again on Tuesdays."
     - *Sir Pinchington*: he was one of Sheogorath's courtiers, "a Duke now, and dead".
9. **100:** *About my payment…*
   - Reward: 300 gold, 3 Wheels of Cheese, **Tillmon's Songbook** (the full terrible lyrics) and the **Lute of the Mad God**.
   - Sheogorath vanishes in butterflies (`flags.sheoGone`) and the audience drift home.
- **Lute of the Mad God:** use it from the inventory, at most once per in-game hour (`flags.madluteAt`). Each use picks one at random:
  - cheese rain;
  - full health and fatigue, with sparkles;
  - **Bob the Scamp**, a friendly summon for 30 seconds;
  - nearby enemies flee;
  - one gold coin and an IOU.
- **Flags:** `bardAtInn`, `bardRevealed`, `sheoGone`, `rhyme*`, `invited_*`, `madluteAt`. Live state: `game.bardShow`.

### `sq_wizard` — The Libram of Lesser Wonders (10–15 minutes)

**Premise:** **Aldous Quillwhistle**, a cheerful Breton "Wizard of Small Wonders" who was asked to leave the Arcane University after setting off fireworks at the Archmage's birthday, lives in **Quillwhistle's Spire**. It's a crooked lavender-roofed tower in north-west Chorrol (−435, −248), with a door facing the street. A Breeze Charm meant to cool his tea blew three pages out of his spellbook.

1. **10:** *The Libram*. He teaches **Telekinesis** and sets `flags.wizardQuest`, which spawns Henrietta and allows the wisp's spawn point to activate.
2. **The three pages, in any order:**
   - **The Oak page** (`libram_page_oak`): it sparkles, high in the Great Oak (about 7.6 m up). Cast **Telekinesis** at it to pull it into your hands.
   - **Henrietta's page** (`libram_page_hen`): **Henrietta**, a lilac hen trailing sparkles, roams the hen coop yard in north-west Chorrol. She's shy, so sneak or corner her. Get within 1.5 m and you scoop her up (`flags.henCaught`).
   - **The wisp's page** (`libram_page_wisp`): a **will-o'-the-wisp** wanders outside the east gate (−288, −294). Any damaging spell pops it, and the page flutters to the ground.
3. **20 / 30 / 40:** set as each page is collected (`countLibramPages`).
4. **50:** *The pages*. Aldous binds the Libram in a ritual: a rune circle, the book rising and the pages circling it, and a burst of colour (`startWizardRitual`).
5. **100:** reward: 150 gold and **Festival Fireworks**. Sets `flags.wizardShop`, which adds a **Wonders** button to Aldous's dialogue.

**The 27 Wonders** (`WONDERS` in `src/data/spells.js`; effects in `src/fx/spellbook.js`; first-person gestures in `GESTURES` in `src/viewmodel.js`; third-person clips in `CAST_CLIPS` in `src/player.js`):

| Spell | School | Gesture | Effect |
|---|---|---|---|
| Chain Lightning | Destruction | push | Bolt jumps to the target, then up to 3 more foes, losing 30% each hop |
| Frost Nova | Destruction | slam | Rings of ice spikes erupt; frost damage and slow within 6 m |
| Call Meteor | Destruction | raise | A flaming rock falls on the aim point after a warning rune; fire 50 in 6 m, knockback, smouldering crater |
| Acid Spray | Destruction | sweep | A green cone; poison damage every second for 5 s |
| Arcane Missiles | Destruction | flick | Five homing motes of force |
| Wall of Flame | Destruction | sweep | A 9 m line of fire for 8 s that burns anything crossing it |
| Thunderclap | Destruction | slam | A shockwave ring and dome with lightning forks; knocks foes back within 7 m |
| Rejuvenation | Restoration | self | Regenerate health for 10 s; flowers bloom and wilt at your feet |
| Sunbeam | Restoration | raise | A column of sunlight at the aim point; heals you, burns undead hard |
| Turn Undead | Restoration | push | A ring of holy light; undead within 20 m flee |
| Life Drain | Restoration | pull | A writhing red tether; drains health and heals you |
| Leap of the Kestrel | Alteration | raise | A huge jump, then feather-fall with no fall damage for 8 s |
| Stoneskin | Alteration | self | 35% shield for 45 s; stones orbit you |
| Telekinesis | Alteration | pull | Pulls a loose item or herb up to 25 m into your hands |
| Blink | Alteration | flick | Teleports up to 12 m along your view, with a puff and a FOV kick |
| Haste | Alteration | self | +60% move speed for 20 s, with golden afterimage trails |
| Summon Spectral Wolf | Conjuration | slam | A translucent glowing wolf ally for 45 s |
| Bound Sword | Conjuration | self | A glowing blade replaces your weapon for 60 s, then your old weapon returns |
| Bound Flame Blade | Conjuration | self | A dark sword wreathed in living flame for 60 s: +10 fire per hit and the target burns (2.5 every ½ s for 3 s). Battlemages and Mages start with it |
| Bound Storm Blade | Conjuration | self | A sword crawling with lightning for 60 s: +9 shock per hit, arcing to a second foe within 7 m for 60%. Spellswords and Mages start with it |
| Summon Ghost Knight | Conjuration | slam | A spectral sword-and-shield ally |
| Calm | Illusion | push | A foe stops fighting for 30 s; floating hearts |
| Frenzy | Illusion | push | The target fights the nearest creature for 20 s; red aura |
| Night-Eye | Illusion | self | Brightens and tints the dark for 60 s |
| Festival Fireworks | Illusion | raise | Six rockets burst in coloured shells; animals and weak foes flee |
| Mark and Recall | Mysticism | slam | The first cast leaves a glowing rune (it persists, even across cells); the second pulls you back to it |
| Reveal | Mysticism | self | Pillars of light mark containers and loose items within 40 m for 15 s |

**Prices:** about 60–420 gold before mercantile and disposition. Some spells need skill 25.

**Player effect timers:** `effects.regenT`, `hasteT`, `featherT`, `nightEyeT` and `boundT`. **Actor fields:** `calmT` and `frenzyT`. **Mark state:** `game.spellbook.mark`, which is not saved.

### The Lantern in the Wood — the Corwyn questline (four quests, about an hour)

**Premise:** in 3E 349 a Dunmer necromancer, **Ilvaine Seddrel**, set the Great Forest south of Chorrol on fire to fill her soul gems. Two people died at the charcoal-burners' cottage in the woods:
- **Osric Corwyn**;
- **Maela Corwyn**, who went back into the burning trees with her lantern to find her son and never stopped looking.

Ilvaine took Maela's lantern and bound her ghost to it. The son, **Tam**, aged seven, had written "MA FIRE GON FOR HELP GARD TAM" on his slate and run for the road. The wine merchant Marcus Bruiant found him in a ditch, and he grew up as **Rimalus Bruiant**. He is now 91, the old man who has sat in the corner of the Grey Mare for sixty years. Now that the Oblivion Gates have thinned the world, Ilvaine is back in her barrow. She uses Maela's grief to raise the **Ashen Dead**, and Maela's lantern lures travellers off the road.

**Characters:**
- **Seed-Neeus** (`seed_neeus`, the shop, dialogue `seed_neeus`): the quest giver.
- **Bram Hollis** (`bram`, shop slot 2): her shaken Nord courier.
- **The Lantern Woman / Maela Corwyn** (`maela`): a talking ghost in the clearing, visible 20:00–05:00. She is `untouchable`: nothing can target or hit her.
- **Rimalus Bruiant / Tam Corwyn** (`inn_patron`, Grey Mare slot 2, dialogue `rimalus`): now essential, white-haired and bearded.
- **Ilvaine Seddrel, the Lamplighter** (`ilvaine`): the boss, a Dunmer caster using Frostbite, Shock Bolt and Flare.
- **Ashen Dead** (`ashen_dead`): charred, fire-touched undead.

**Locations:**
- **Corwyn's Clearing** (−390, −94), in the forest south of Chorrol and the Priory road:
  - the roofless cottage with its standing chimney and burned cot;
  - two cold kilns, a woodpile, and burned dead trees;
  - two cairns with markers: "OSRIC CORWYN", and "MAELA CORWYN… AND THEIR BOY TAM, WHOM THE WOOD KEPT".
  - Ghostly embers drift through it at night (`state.corwyn.embers`).
- **Gloamwood Barrow** (−357, −112), a grassy mound with a stone doorway and Ilvaine's green lantern on a post. Inside is the `gloam_barrow` interior:
  - an entry hall, a crypt and a ritual chamber;
  - 12 green **soul lanterns** (`g`), ash heaps (`z`) and fire braziers (`l`);
  - the ritual circle (`R`), Ilvaine (`E`) and two chests.

**1. `sq_lantern` — The Lantern in the Wood**
1. **10:** Seed-Neeus, *Lamp oil*. Nobody takes the south road after dark, and Bram came back without his delivery crate.
2. **20:** Bram, *The lantern woman*. He cut through the woods along a charcoal track and met a woman with a lantern calling "Tam!", who called him Tam. This also sets `flags.ashenWalk`, so Ashen Dead walk around the clearing at night.
3. **30:** reaching the clearing (within 24 m).
4. **40:** Maela, *Your son* (at night). She names herself and starts showing as Maela Corwyn (`flags.maelaNamed`).
   - She believes it is still 3E 349 and the woods are burning.
   - She describes Tam and his wooden fox, and the lullaby: "Little fox, little fox, curl up tight — the dark is just the day with its eyes shut at night."
   - This topic shows from any stage below 40, so meeting her first works too.
5. **100:** Seed-Neeus, *The lantern woman*, with **Seed-Neeus's Delivery Crate** (in the clearing). Reward: 75 gold. Starts `sq_ashes`.

**2. `sq_ashes` — Ashes and Embers**
1. **10:** search the cottage and ask Emfrid.
2. **20:** picking up **A Child's Slate** (under the burned cot). This is automatic if you already carry it. **Maela Corwyn's Household Book** (on the hearth) is optional reading: it describes the Dunmer woman with a green lantern and a satchel of black stones.
3. **30:** Emfrid, *The Corwyn fire*, with the slate in hand. Without the slate she tells the legend: "they never found the boy", and the fire "started in the wrong place". With it, she remembers Marcus Bruiant's foundling and points at Rimalus.
4. **40:** Rimalus, *Show him the slate*. He first denies the name (*Tam Corwyn*), then confesses and shows the wooden fox. He won't enter the woods while the burned things walk (`flags.tamAdmitted`).
5. **100:** Maela, *Tam is alive* (at night). She reveals the Dunmer woman who took her lantern and lives under the barrow mound to the east. Starts `sq_gloam`.

**3. `sq_gloam` — The Lamplighter**
1. **10:** go to the Gloamwood Barrow.
2. **20:** entering the barrow. The leveled list `ashen` holds Ashen Dead, skeletons and ghosts.
3. **Ilvaine:** within 17 m she gives a four-line speech while calm (`flags.ilvaineSpoke`), then attacks. Hitting her ends the speech early. At 66% and 33% health she raises two Ashen Dead from the ritual circle.
4. **25:** Ilvaine dies (`flags.lamplighterDead`):
   - the soul lanterns go out one by one and the ritual circle and green door-lamp die;
   - a message describes 31 souls rushing free;
   - the Ashen spawns stop.
5. **30:** picking up **Maela's Lantern** from her body (she also drops **Ilvaine Seddrel's Daybook**, which confesses the fire, and 80 gold).
6. **100:** Maela, *Your lantern* (at night). The lantern becomes real and golden (`flags.maelaFreed`) and the drifting embers stop. Starts `sq_home`.

**4. `sq_home` — Come Home**
1. **10:** tell Rimalus.
2. **20:** Rimalus, *Come and see her*. He becomes a follower (`flags.tamFollowing`; restored on load, like Martin and Corvin).
3. **The reunion** (`startCorwynReunion`) begins automatically when Tam comes within 9 m of Maela at night, or via her *Your son is here* topic. It is a scripted, roughly 75-second subtitled scene:
   - she doesn't know the old man;
   - he shows the fox and starts the lullaby, and she finishes it;
   - "I went for help, Ma"; "You were such a good boy"; "Then I can stop looking now."
   - She rises and fades in golden motes (`corwynFarewell`; `flags.maelaAtRest`). Her lantern is left burning in the grass (pickup `maela_lantern_rest`, which persists through saves).
4. **100:** set as she fades. The **Come Home** epilogue follows. Tam stays on the cairn (`flags.tamHome`) and is back in his chair at the Grey Mare from then on.
5. **Epilogue rewards:** Seed-Neeus, *The woods are quiet*, gives 250 gold and 2 Potions of Healing (`flags.seedPaid`). Tam and Bram get new idle lines.

**Reward — Maela's Lantern** (`maela_lantern`, a `light` item with `lightStyle: 'lantern'`, `rank: 2`): a charcoal-burner's lantern on a carrying pole.
- It is carried in the off hand like the torch, and L prefers it over a torch.
- Its steady gold light is brighter and wider than a torch (17 intensity, 19 m).
- It does not go out in water.

**Flags:** `ashenWalk`, `maelaNamed`, `tamAdmitted`, `ilvaineSpoke`, `lamplighterDead`, `maelaFreed`, `tamFollowing`, `tamHome`, `maelaAtRest`, `seedPaid`.
**Spawns:** `ashen` ×3 near the clearing (`nightOnly`, `needsFlag: ashenWalk`, `needsNoFlag: lamplighterDead`). `needsNoFlag` is a new spawn-point condition.

### The White Hare — the Wintersmeet questline (five quests, about 1½ hours)

**Premise:**
- **The hare:** every winter, on the morning of the first snow, a white hare appears on the roof ridge of the Snow Hare inn in **Wintersmeet** and stays until the thaw. She is a blessing of **Kynareth**, Lady of the Sky, who runs down the mountain ahead of the snow.
- **This year:** the snow came three weeks early and has not stopped for nine days, and the hare never came.
- **The poacher:** **Varn Ice-Eye**, a trapper, snared her at the **Skyward Shrine** and sold her.
- **The buyer:** **Magister Cassius Frey**, a retired Battlemage of the Fourth Legion and a survivor of Kvatch. He keeps her in a cage of frost at the top of the abandoned **Rime Spire**, using her to bury the north in a winter that never ends, a wall of snow that Mehrunes Dagon's fire could never cross. He has also wound Kynareth's stolen wind around the tower as a wall.
- **Weather:** while the hare is caged (from the moment `sq_hare1` starts until `flags.hareFreed`), snow falls constantly over the foothills (`snowBase` 0.5). Once she is free, the sky over Wintersmeet clears (`snowBase` 0 within 160 m).

**Characters:**
- **Sigrun Warmhands** (`sigrun`, Snow Hare slot 1): the innkeeper and quest giver.
- **Old Brynja** (`brynja`, outdoors on the green): keeper of the old rites.
- **Gunnar Split-Log**, **Erlend Ice-Fisher** and **Matilde Brindle**: the village's woodcutter, fisherman and baker.
- **Varn Ice-Eye** (`varn`, at his camp): a Nord trapper. He is a citizen until provoked: axe, fur armour, 120 health. He drops **Varn's Ledger**.
- **Magister Cassius Frey** (`cassius`, Rime Spire slot 1): an Imperial Battlemage, `ai: 'caster'` (Frostbite, Shock Bolt), 240 health. After the quest, as `cassius_home`, he lives at the Snow Hare (slot 3, `spawnIf: cassiusHome`).
- **Creatures:** Frost Atronach (`frost_atronach`, frost-punching icy daedra) and Ice Wraith (`ice_wraith`, a floating frost ghost). Leveled list `rime`.

**Locations:**
- **The Skyward Shrine** (−250, −603), on the slope north-west of the village:
  - six white pillars capped with snow, strung with prayer flags in the four wind colours;
  - a statue, and an altar that is a Shrine of Kynareth (daily blessing);
  - a sprung snare, with pickups `hare_fur_pickup` and `trap_tag_pickup` beside it.
- **The glowing hare tracks:** pale blue prints and frost glitter running from the shrine down to Varn's camp (`state.whiteHare.tracks`, visible from `sq_hare2` 10 until the hare is freed).
- **Varn's Camp** (−330, −540), in the woods west of the village: a lean-to, a pelt rack, three small iron cages (one scrubbed out and rimed with frost), a fire and a woodpile.
- **The Grandfather Fir** (−108, −580), on the knoll east of the village: an enormous lightning-scarred pine. Its fallen branch is the `heartwood` interactable (`flags.heartwoodTaken`). Taking it brings a wolf and a timber wolf out of the roots.
- **Snowberry bushes:** six around the frozen pond (`snowberry_0`…`5`, harvestable, respawn after 1 day).
- **Erlend's ice hole** on the frozen pond (`icehole` interactable): ice fishing.
- **The Rime Spire** (−92, −636), on a ledge cut into the mountainside north-east of the village, reached by the old watch track and a carved ramp:
  - outside: a pale tower with ice crystals, a snow-capped roof and a door facing the village (`requireFlag: windCalmed`);
  - **the wind wall:** two counter-rotating cylinders of streaming snow (15 m radius) and a whirl of flakes. Within 16.5 m it hurls the player back to 18 m, unless they carry the Wind-Charm.
  - The interior is `rime_spire`:
    - **hall 1:** a cold brazier `v` and ice wall `i` #1;
    - **hall 2:** brazier and ice wall #2;
    - **the top chamber:** Cassius and the hare's frost cage `U`;
    - welkynd lights `w` throughout, and `rime` enemies.

**1. `sq_hare1` — The Hare That Didn't Come**
1. **10:** Sigrun, *The white hare*: the legend; nine days of snow; "talk to Brynja".
2. **20:** Brynja, *The missing hare*: the hare is Kynareth's; she sleeps out the summer at the Skyward Shrine. Brynja gives **The Lightwatch Hymn** (needed for one of Cassius's peaceful options).
3. **30:** reaching the shrine (within 14 m).
4. **40:** picking up both the **Tuft of Glowing Fur** and the **Trapper's Tag** ("VARN"). This is automatic if you already hold both.
5. **100:** Brynja, *What I found at the shrine*: she names Varn Ice-Eye and points you at the tracks. Reward: 50 gold.

**2. `sq_hare2` — Tracks in the Snow**
1. **10:** follow the glowing tracks west.
2. **20:** reaching Varn's camp (within 22 m).
3. **Getting the truth out of Varn** (any one of these leads to stage 30, via `varnTalks()`):
   - *This tag has your name on it* (requires the tag) sets `flags.varnTalked` and unlocks the next two options;
   - *Pay him for the name* (100 gold);
   - *That hare is Kynareth's* (disposition 55+ or Speechcraft 35+);
   - *Tell me, or else*: he fights. Looting **Varn's Ledger** from his body also reaches stage 30.
4. **30:** the buyer is an old man in a grey Legion cloak at the **Rime Spire**: "Winter is the only wall the Daedra can't burn."
5. **40:** thrown back by the wind wall.
6. **100:** Brynja, *The wind around the spire*: it is Kynareth's stolen breath, and only a **Wind-Charm** can walk through it.

**3. `sq_hare3` — The Three Gifts**
1. **10:** Brynja names the three gifts of winter, which can be gathered in any order. Stages **20 / 30 / 40** come at one, two and three gifts held (`whGiftStage`).
2. **Heartwood:** Gunnar, *The Grandfather Fir* (directions; "take your piece from the branch, never from the tree; mind the wolves"). Then use the lightning-split branch to get **Grandfather Fir Heartwood**, and two wolves attack.
3. **Glimmerfin:** Erlend, *The Glimmerfin*, gives **Erlend's Lucky Lure**. Then use the ice hole **between 20:00 and 04:00**: each try passes an hour, with a 75% chance of a catch, and a sure catch on the second try. By day, or without the lure, it explains why nothing bites.
4. **Kynareth's loaf:** pick 5 **Snowberries** from the bushes round the pond (a new ingredient: Magicka +6, Fatigue +4). Then Matilde, *Kynareth's loaf*, bakes it.
5. **100:** Brynja, *The three gifts*: she braids **Kynareth's Wind-Charm** (heartwood ribs, Glimmerfin scales, a cord of her own hair, and half the loaf burned as an offering). Starts `sq_hare4`.

**4. `sq_hare4` — The Rime Spire**
1. **10:** go to the spire.
2. **20:** within 16.5 m with the charm, the wind parts (`flags.windCalmed`). The wall dissolves, the door opens, and a message plays.
3. **30:** entering the spire.
4. **The braziers:** each cold brazier `v` is lit with a lit torch, or with a Flare spell (9 magicka). It burns (`flags.rimeBrazier<n>`), and its matching ice wall melts in a gush of steam (`flags.rimeIce<n>`, an `openFlag`). Lit braziers are restored when the cell is rebuilt (`applyRimeState`).
5. **40:** both walls melted.
6. **50:** reaching Cassius (within 12 m) or asking him *Why the hare?*. His topics are *Why the hare?* (his plan) and *Kvatch* (his story: he held the north stair and walked out with forty of eight thousand).
7. **The choice — three ways to talk him down** (each calls `cassiusRelents`: `flags.cassiusSpared`, the frost softens, he gives you his **Frostward Ring**):
   - *The Gates can be closed. I closed one.*, available only if `flags.gateClosed` (the main quest's Kvatch Gate);
   - *Read him the Lightwatch hymn*, with the hymn from part 1: his mother sang it in Bruma;
   - *Your winter will kill Wintersmeet*, which needs Speechcraft 40+ or disposition 70+.
   - All three lead to **70**: he has let go.
8. **The fight:** *Then I'll take her from you* makes him hostile (`cassiusFights`). At half health he summons two Frost Atronachs. While he lives, the cage stays frozen shut. When he dies he drops the Frostward Ring and **Cassius Frey's Journal**, and the quest reaches **60**.
9. **100:** use the frost cage (`freeHare`): the lid lifts, the frost sphere shatters, and the hare glows brighter and brighter, hops, then bounds straight up through the roof as a streak of light (`flags.hareFreed`). The snow over Wintersmeet stops.
   - If he was spared, Cassius goes down to the village (`flags.cassiusLeft`, `flags.cassiusHome`).
   - Starts `sq_hare5`.

**5. `sq_hare5` — Lightwatch**
1. **10:** tell Sigrun.
2. **20:** Sigrun, *The snow has stopped*, proclaims the **Lightwatch** for tonight.
3. **The festival** (`startLightwatch`) begins when you come within 14 m of the town fir **between 19:00 and 23:00**:
   - Sigrun, Erlend and (if spared) Cassius are spawned at the fir as `*_fest` copies; Gunnar, Matilde and Brynja walk over. All of them stand in a ring facing the tree.
   - It is a scripted, roughly 70-second subtitled scene:
     - Sigrun spots Gunnar's rocket;
     - Matilde hands out sweetrolls (2 for you) while Erlend "stands enthusiastically";
     - Cassius apologises, and Gunnar says "Yes";
     - Brynja calls for lights, and nine sky lanterns rise, while she sings the hymn and the village answers "Let her find the way home";
     - "Now?" "NOW, Gunnar.": two volleys of fireworks;
     - Matilde: "Look — the roof!", and **the white hare appears on the Snow Hare's roof ridge**, glowing faintly with a little blue light (`flags.hareOnRoof`);
     - Brynja: "Light the way home."
4. **100:** Sigrun gives the **Mantle of the First Snow** (amulet, +20 Health, +20 Magicka) and 300 gold (`flags.lightwatchDone`). The hare stays on the roof for good. The festival crowd goes back to normal once you are more than 80 m away.

**New items:**
- **Quest items:** `brynja_hymn`, `hare_fur`, `trap_tag`, `varn_ledger`, `fir_heartwood`, `lucky_lure`, `glimmerfin`, `kynareth_loaf`, `wind_charm`.
- **Rewards:** `cassius_journal`, `frostward_ring` (Magicka +30), `first_snow_mantle`.
- **Ingredients:** `snowberry`, and `frost_salts` (dropped by Frost Atronachs).

**Flags:** `varnTalked`, `varnTold`, `heartwoodTaken`, `gunnarFir`, `glimmerTries`, `windCalmed`, `rimeBrazier1/2`, `rimeIce1/2`, `cassiusSpared`, `cassiusLeft`, `cassiusHome`, `hareFreed`, `hareOnRoof`, `lightwatchDone`.

### `sq_pup` — A Crown of Starflowers (5–10 minutes, companion)

**Premise:** **Hob Furrowfield** (`hob`, dialogue `hob`) is an old wandering tinker. He drifts about his sky-blue-and-yellow wagon in a meadow on the far (east) side of Lake Rumare and the Imperial City, at `hobs_wagon` (580, 240), with a 16 m wander radius.
- **His dogs:** his old dog **Honey** (`mother_dog`) and her three pups (`puppy`). Both are `pettable` and `essential`: E pets them, with heart-stars and a line.
- **The custom:** one pup has chosen you. In Hob's family a pup goes to its new home wearing a crown of ten starflowers, and his back won't let him pick them.

1. **10:** Hob, *The puppies*.
2. **20:** holding **10 Starflowers** (`starflower`, an ingredient). There are 16 glowing pale-blue flowers in the meadow round the wagon (`starflower_0`…`15`, harvestable, verb *Pick*, respawn after 2 days). Each pick shows a count (`countStarflowers`).
3. **100:** Hob, *Ten starflowers*: he weaves the crown (`adoptPuppy`) and you choose a name: **Biscuit**, **Bramble**, **Pip** or **Sir Woofington** (`flags.dogName`).
   - One pup leaves the litter (`flags.dogAdopted`; from then on only two spawn).
   - Your dog (`dog` template: faction `ally`, beast AI, 90 health, `essential`) appears wearing the crown.

**Your dog:**
- **Following:** it follows you everywhere, through doors and across saves (`flags.dogFollowing`, rebuilt in `enterCell` by `makeDog`).
- **Fighting:** it attacks anything hostile to you. It is never killed: when knocked down it gets back up and slowly regains health.
- **Growing up:** it starts at 70% size and grows to full size over three days (`flags.dogBornDay`).
- **Petting:** pet it (E) to choose **Stay here** (`flags.dogStaying`; it waits at that spot, `flags.dogStayCell` and `dogStayPos`, which survives saves) or **Come along**.

### `sq_bunnies` — Ten White Rabbits (15–25 minutes, three ways through)

**Premise:**
- **Snikkit** (`snikkit`, dialogue `snikkit`) is a small, soft-hearted goblin at **Snikkit's Den** (60, −520) in the snowy hills north-east of Wintersmeet. He sits beside a hide tent, a little fire, a cage of ten white rabbits, and a sign reading "NO RABITS HEER".
- **Faction:** he is `faction: 'neutral'`, `band: 'snikkit'`. Neutral folk can be talked to and only fight once provoked. Striking one turns their whole band hostile (`provokeBand`), and never adds a bounty.
- **The demand:** **Chief Gorbag Skullsnow** (`goblin_chief`, `band: 'frostfang'`) of the **Frostfang** goblins at **Frostfang Hollow** (205, −552) ordered ten white rabbits for the Moonfeast stew, or Snikkit goes in the pot himself.
- **The problem:** Snikkit has named them all: Fluff, Other Fluff, Snowball, Lord Thumpington, Dave, Nibbles, Big Ears, Small Ears, Crumpet and Moonpie.
- **Frostfang Hollow:** five hide tents, a bonfire, the empty Moonfeast pot, and Gorbag's throne under a bear skull. Gorbag sits there with four goblins (`frostfang_0`…`3`), all neutral (`flags.frostfangHostile` once provoked).

**Stages:**
1. **5:** Gunnar, *Snow rabbits*: the snares are empty, and there are goblin tracks and a squeaking sack to the north-east.
2. **10:** coming within 22 m of the den.
3. **20:** Snikkit, *The rabbits*: his plight. **The choice:**
   - **Help:** *"I'll help you fool the Chief"*. Go to **30**; he gives **Snikkit's Mark** (`snikkit_token`).
   - **Fight:** *"Hand over those rabbits"* (also available at 30 and 40) makes Snikkit hostile.
   - **Steal:** pick the cage lock (lock 3, `snikkit_cage`) behind his back. When it opens he cries "THIEF!" and turns hostile, but the rabbits go free anyway.
4. **30:** Matilde, *Mock Rabbit Pie*: she needs 2 Potatoes, 3 Snowberries and 1 Venison (Sigrun sells potatoes and venison; the berries grow at the pond). She bakes the **Mock Rabbit Pie** (`mock_rabbit_pie`).
5. **40:** take it to Gorbag and *Present the "rabbit stew"* (`gorbagFeast`):
   - **With the Mark:** a subtitled scene. "Is... RABBIT!" The camp chants "RAB-BIT!", and Snikkit is pardoned and promoted to "assistant stew-finder" (`flags.gorbagFed`). Goes to **50**.
   - **Without the Mark:** Gorbag calls you a poisoner and the camp attacks.
   - **Alternatively:** *"Snikkit is under my protection"* starts a fight with the whole Hollow. Killing Gorbag goes to **55**.
6. **50 / 55:** Snikkit, *You're free*. He opens the cage himself, and the rabbits leave one at a time while he says goodbye to each by name (`releaseRabbits('blessing')`).
7. **100:** reward **Snikkit's Lucky Stone** (ring: Health +15, Magicka +10) and 60 gold. Snikkit stays at his den as a "rabbit-watcher".
8. **60:** Snikkit is killed. He drops **Snikkit's Cage Key**.
9. **110:** the cage is opened by force: by key after killing him, or by picking the lock.

**Afterwards (`flags.rabbitsFreed`):**
- The ten freed rabbits (`snow_rabbit`, a hopping rig built from the hare mesh) bound away in every direction, trailing snowflakes.
- Eleven spawn points (`rabbits` list, 3 each) fill the snowy hills from (−380, −505) to (260, −520) and up toward the Rime Spire.
- Gunnar notices ("Haven't set a snare since"), and Snikkit has named forty-one of their babies.
- The cage stays open across saves (`applyRabbitWorld`).

**Snow region:** expanded. Besides everything north of the wandering snowline, snow now lies on all high ground above 58 m (`SNOW_HEIGHT`) everywhere in the world, so the mountain ring and every ridge wear white caps. The highest peaks hold snow even on their steep faces. The same rule is used by the terrain, the frosted trees and rocks (`SNOW_GLSL`), the grass, the footsteps and the snowfall.

### `sq_moot` — The Chipmunk Moot (5–10 minutes, archery challenge)

**Premise:**
- **The Greenheart** (cell `greenheart`) is a pocket of Valenwood that Y'ffre "told" into the north. You reach it through **the Hollow Elder** (`hollow_elder`, −565, −95), a colossal split oak deep in the western woods below the mountains, whose doorway glows green and gold. Inside, the forest is 430 m across: graht-oaks 60–100 m tall, a closed roof of leaves, shafts of light, glowing mushrooms, fireflies and a lily pond. You leave through the glowing hollow in the giant behind the arrival glade (it returns you to the Hollow Elder). There is no fast travel out of the Greenheart.
- **Falinor** is the Bosmer town around the **Great Tree**: a ring platform 8 m up, reached by a spiral stair, with two pods and the (locked) Treethane's Hall. Five more pod-houses stand on the ground. The town also has Mirieth's stall, the Shrine of Y'ffre, an archery range and lantern posts.
- **The Moot:** every Falinor child sits the Moot before being allowed a real bow. You must tag ten chipmunks with arrows in **the Tumbling Grove** (−78, −48), west of town, before Eranwe's song ends.

**Stages:**
1. **10:** Eranwe, *The Chipmunk Moot*. She gives you a **Greenheart Practice Bow** (`practice_bow`) and 40 **Blunted Practice Arrows** (`blunt_arrow`). *The rules* explains the contest.
2. **The contest:** say *"I'm ready. Start the Moot."* (only in the Greenheart). After the dialogue closes, `startMoot` runs:
   - It equips a bow and blunt arrows, topping you up to 20 if you are low.
   - 16 chipmunks (`moot_chip_0`…`15`) appear around the grove.
   - A HUD counter shows tags and a 2:00 timer.
   - **Tagging:** chipmunks (`chipmunk` template, `taggable: true`) take no damage at all. Only an arrow fired by the player tags one (`tagChipmunk`): a gold glint and star-sparkles, then it is renamed *Very Offended Chipmunk*, flees, and vanishes after 1.3 s. Swords, spells and fists do nothing.
   - **Losing:** if the timer runs out, Eranwe announces your score. Talk to her to try again (any number of times). Leaving the Greenheart mid-contest quietly cancels it.
3. **20:** ten tagged before the song ends (`endMoot(true)`).
4. **100:** Eranwe, *The Spirit Hart*. She teaches you **Summon Spirit Hart** (`spirit_deer`, Conjuration, 38 magicka, 60 s) and gives 75 gold.

**The Spirit Hart (`spirit_deer`):**
- A deer of translucent green light (`spirit` material, faction `ally`, `ai: 'support'`) that follows you and never fights.
- While you are hurt and within 28 m, every 3 s it heals you for 10 + 6% of your max health (`tickSpiritHarts`). A stream of green motes arcs from it to you, with a glint and a chime. It trails sparkles as it walks.

**People of Falinor** (all Bosmer, cell `greenheart`):
- **Eranwe Greenfletch** (`eranwe`): the bow-master. She stands in the Tumbling Grove.
- **Treethane Velandil** (`velandil`): on the Great Tree's ring platform.
- **Mirieth** (`mirieth`): runs a stall (merchant `bosmer`) selling blunt and real arrows, bows, potions, venison and mead.
- **Thaldir, Ninwe and Aralen:** wander the town (dialogue `falinor_folk`).

Everyone shares the topics *The Greenheart* and *The Green Pact*. Deer, does and chipmunks roam the forest (`greenheart` spawn list).

**New items:** `practice_bow`, `blunt_arrow`. **New spell:** `spirit_deer`. **New templates:** `chipmunk`, `spirit_deer`. **Flags:** none (the contest state is `game.moot`, which is never saved).

---

## Quest locations

| Location | Map id | Coordinates | Used by |
|---|---|---|---|
| Imperial Sewers exit | `sewer` | (30, 128) | `mq_amulet` start |
| Weynon Priory / Weynon House | `priory` | (−250, −150) | `mq_amulet`, `mq_gate`, act II hub |
| Chorrol, Great Oak | `chorrol` | (−380, −300) | `ms_*`, `mq_dawn`, `sq_bard` guests, `sq_map` (Grey Mare) |
| Kvatch, Chapel of Akatosh | `kvatch` | door (−446, 341) | `mq_heir` |
| Kvatch siege camp | — | (−360, 240) | `mq_gate`, `mq_heir` |
| Oblivion Gate | `gate` | (−395, 265) | `mq_gate` |
| Fort Sutch | `fort_sutch` | (−580, 380) | `mq_dawn`, `mq_shrine` |
| Vilverin | `vilverin` | (150, −40) | `ms_heirloom` |
| Black Road Camp | `bandit_camp` | (340, −360) | `ms_bounty` |
| Roxey Inn | `roxey_inn` | (60, 30) | `sq_bard` start |
| Quillwhistle's Spire | — | (−435, −248), door east | `sq_wizard` |
| Henrietta's coop yard | — | (−426, −327) | `sq_wizard` |
| The wisp | — | (−288, −294), outside the east gate | `sq_wizard` |
| Sir Pinchington's shore | — | (91, 66) | `sq_bard` |
| The Hollow Stones | `hollow_stones` | (−600, −380) | `sq_map` |
| The Drowned Bell | `drowned_bell` | (90, 403) | `sq_map` |
| Old Marrow's Camp | `old_marrow` | (−100, 260) | `sq_map` |
| Corwyn's Clearing | `corwyn_clearing` | (−390, −94) | `sq_lantern`, `sq_ashes`, `sq_home` |
| Gloamwood Barrow | `gloamwood_barrow` | (−357, −112), door faces the clearing | `sq_gloam` (`gloam_barrow` interior) |
| Wintersmeet | `wintersmeet` | (−180, −548) | `sq_hare1`, `sq_hare3`, `sq_hare5` (the Snow Hare inn, the fir, the pond) |
| The Skyward Shrine | `skyward_shrine` | (−250, −603) | `sq_hare1` |
| Varn's Camp | `varns_camp` | (−330, −540) | `sq_hare2` |
| The Grandfather Fir | — | (−108, −580) | `sq_hare3` |
| Snikkit's Den | `snikkits_den` | (60, −520) | `sq_bunnies` |
| Frostfang Hollow | `frostfang_hollow` | (205, −552) | `sq_bunnies` (Chief Gorbag) |
| Hob's Wagon | `hobs_wagon` | (580, 240), the meadow east of Lake Rumare | `sq_pup` |
| The Rime Spire | `rime_spire` | (−92, −636), on a ledge NE of Wintersmeet | `sq_hare2`, `sq_hare4` (`rime_spire` interior) |
| The Hollow Elder | `hollow_elder` | (−565, −95), deep in the western woods; door faces east | entrance to the Greenheart (`sq_moot`) |
| Falinor / the Tumbling Grove | — | Greenheart cell: town (0, −12), grove (−78, −48), range (−50, 20) | `sq_moot` |

**Interiors:**
- `inn`: the Grey Mare. Slots 1 Emfrid, 2 Rimalus Bruiant (Tam Corwyn), 3 Ysolde, 4 Corvin (home), 5 Tillmon, 6 Sheogorath.
- `shop`: Northern Goods and Trade. Slots 1 Seed-Neeus, 2 Bram Hollis.
- `gloam_barrow`: the Lamplighter's barrow (`ashen` spawn list, boss `ilvaine`).
- `snow_hare`: the Snow Hare, Wintersmeet. Slots 1 Sigrun, 2 Erlend, 3 Cassius (after `sq_hare4`). Beds are rentable (`rentable: true`).
- `rime_spire`: Cassius Frey's tower (`rime` spawn list). Slot 1 is Cassius. It has braziers `v`, ice walls `i` and the frost cage `U`.
- `priory`: slots 1 Jauffre, 2 Martin.
- `kvatch_chapel`: slots 1 Martin, 2 Jakben, 3 Tierra.
- `quill_spire`: slot 1 Aldous. Also has an orrery (`q`) and a cauldron (`j`).
- `fort_sutch` and `nenalatha`: quest dungeons.
- Also `vilverin` and `sigil`.

---

## How quests are built (for future quests)

- **Stages:** add them to `QUESTS` in `src/data/quests.js`.
  - Each stage takes `text` and optional `target` for the compass and map: `{ npc: id | [ids], cell, world: {x, z}, item, x, z, crystal, sigil }`.
  - Mark the final stage `done: true`.
- **Dialogue:** topics are `{ id, label, show(g, npc), say(g, npc) }` in `src/data/dialogue.js`.
  - `say` can advance quests, give and take items, and set `g.ui.queueAfterDialogue = fn` to run a scene once the player closes the conversation.
- **NPC spawn rules** in `NPCS`:
  - `cell` places them: `'world'` uses `x`/`z`; an interior id uses an `npcs` slot digit in the map; `'none'` means spawned by script.
  - `spawnIf` and `spawnUnless` take a flag name.
  - `activeHours: [from, to]` and `activeQuest: [quest, minStage, maxStage]` hide an NPC outside a window.
- **Followers:** set `actor.following = true`, plus a `flags.<x>Following` flag and an entry in the follower list in `enterCell` so they reload.
- **Item hooks:** `game.onItemGained(id)`. **Death hooks:** `game.onActorDeath`. **Location hooks:** `updateDiscovery`. **Per-tick beats:** `updateQuestTriggers`, which runs four times a second.
- **Persistent world switches:** interactables can carry:
  - `requireFlag` (hidden or disabled until the flag is set);
  - `requireNoFlag`;
  - `openFlag` (a gate that is open once the flag is set).
  These are applied in `applyPersistentState`.
- **Tests:** `tests/world.test.js` checks that every interior NPC has a slot and every map is reachable. Run `npx vitest run`.
