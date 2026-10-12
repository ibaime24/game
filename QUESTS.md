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
| `sq_cat1` | Cat Overboard | The Admiral, part 1 | A LOST CAT poster (Smugglers' Cut, Grey Mare) or entering Brinewhistle Cove | 15–20 min | `sq_cat2` |
| `sq_cat2` | Articles of the Admiral | The Admiral, part 2 (three trials) | Captain Gallowglass | 20–30 min | `sq_cat3` |
| `sq_cat3` | The Fog Comes In | The Admiral, part 3 (night raid, dungeon) | Captain Gallowglass | 25–35 min | `sq_cat4` |
| `sq_cat4` | The Dread Meringue | The Admiral, part 4 (ghost ship, three endings) | Captain Gallowglass | 25–35 min | `sq_cat5` |
| `sq_cat5` | Naming Night | The Admiral, part 5 (festival) | The Admiral bolting | 10–15 min | A kitten, Purrsuit |
| `sq_mg1` | The Sealed Hall | The Hollow King, part 1 (Mages Guild) | Teekeeus (Chorrol square) | 20–30 min | `sq_mg2` |
| `sq_mg2` | Starfall | The Hollow King, part 2 | Magister Ondine Vell | 20–30 min | `sq_mg3` |
| `sq_mg3` | Three Hearts | The Hollow King, part 3 (any order) | Magister Ondine Vell | 35–45 min | `sq_mg4` |
| `sq_mg4` | The Hollow Road | The Hollow King, part 4 (gate rite, dungeon, choice) | Magister Ondine Vell | 25–35 min | `sq_mg5` |
| `sq_mg5` | The Hollow King | The Hollow King, part 5 (boss) | The throne doors | 15–20 min | Magister of the Chorrol Chapter |

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

**Your dog:** (the dog and the kitten from `sq_cat5` share one pet system, `PETS` in `game.js`: see **Pets** at the end of the Admiral section)
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

### The Admiral — the Brinewhistle Cove questline (five quests, about 1½–2 hours)

**Premise:**
- **Brinewhistle Cove** (cell `cove`) is a pirate town on the Abecean coast. Like the Greenheart, it is a separate outdoor cell with its own terrain, sea and sky. You reach it through **the Smugglers' Cut** (`smugglers_cut`, (−470, 640)), a timbered door set in the rocks at the foot of the southern mountains, south of Fort Sutch. Inside, a tunnel mouth opens high on the north cliff of the cove. There is no fast travel out of the cove; leaving through the tunnel puts you back outside the door (`COVE.worldReturn`).
- **The crew:** the pirates of the *Indignant Herring* ran aground here eleven years ago and never left. The ship lies heeled over on the sand and is now the Captain's house.
- **The cat:** by the ship's Articles, the crew's commanding officer is **Admiral Marmalade**, a very fat orange cat in a tiny admiral's bicorne. **Captain Rourke Gallowglass** is merely the captain: a terror of the Abecean by reputation, and the softest man alive about his cat.
- **The secret:** forty years ago Rourke was cabin boy on the ***Dread Meringue***, under **Mother Agathe Brisk**. When the *Meringue* struck the Gullstack, Brisk put her cat **Crumpet** into his arms and told him not to let go. In the black water, he did.
- **The arc:** the Admiral goes missing; you find her, and she prefers you, which the Captain takes badly. You earn a place in the crew. Then the *Dread Meringue* comes out of the night fog crewed by the drowned, and Brisk's ghost steals the Admiral, sure she is Crumpet. You row out with the Captain. Back home, the Admiral vanishes again, and this time it is kittens.
- **The fog** (`updateCoveEnv` in `src/admiral.js`): from `sq_cat3` 10 until `flags.fogLifted`, the cove fogs in every night (and always during the raid): the fog closes to ~160 m, turns sea-green-grey, and greys the sky. The offshore *Meringue* shows in the fog from `sq_cat3` 20, glowing through it.
- **Starting:** reading any of the three **LOST CAT** posters (beside the Smugglers' Cut, inside the tunnel mouth, and on the Grey Mare's east wall: `catposter`), or simply entering the cove, starts `sq_cat1` at 10.

**The cove** (`src/world/cove.js`, `createCoveCell`; positions in `COVE` in `layout.js`):
- **Brinewhistle:** shacks on stilts along the beach, the bonfire ring (`COVE.fire`, lit at night and for Naming Night), lantern posts, nets, boats and driftwood.
- **The Salty Mitten** (`salty_mitten`): the tavern, in half a ship's stern. Slot 1 Odette, 2 J'zhirr (evenings), 3 Grumm (evenings). Beds can be rented.
- **The *Indignant Herring*** (`herring`): the beached ship. The Admiral's sunning spot is on its top rail (`COVE.rail`). Inside: the cabin (slot 1 the Captain, the **Captain's Armchair** `lapchair`, the Admiral's cushion) and the hold (the **Captain's Sea Chest** `seachest` and a wool nest).
- **The pier:** fishing off the end (`fishspot`, half an hour per try, herring at any time) and the **jolly boat** (`jollyboat`).
- **Crumpet's Nook** (`COVE.nook`): a sea arch on the west beach with a rotten rowboat painted *CRUMPET* and a heap of stolen wool. Mudcrabs.
- **The lighthouse** on the east headland, where J'zhirr "navigates" by day; **the Gullstack** offshore; **the Drowned Grotto** (`drowned_grotto`) in the west cliffs; and, in the fog, the ***Dread Meringue*** (`meringue`: main deck, gun deck, flooded hold, and the stern cabin behind a locked door `briskdoor`).
- Every cove interior's exit door carries an `at` point outside its own door in the cove.

**People and creatures:**
- **Captain Rourke Gallowglass** (`gallowglass`, `herring` slot 1; red coat, tricorn): hidden while he is away (`hideWhen: 'captainAway'`: aboard with you, or waiting on the pier at night during `sq_cat4`). **`gallowglass_pier`** waits at `COVE.pierWait` 20:00–04:00 during `sq_cat4`. Aboard the *Meringue* he is **`gallowglass_follow`** (`makeCaptainFollower`): an ally with a cutlass who fights beside you and can't be killed.
- **Admiral Marmalade** (`admiral`): a fat orange cat (`fat: 1.45`) in a bicorne. `tame` (she never runs from you, your dog or the crew, only from things that would hurt her), `pettable`, `essential`. Where she is at each point of the story is `admiralSpot()`; `syncCove` puts her there.
- **Odette "Two-Hooks" Lark** (`odette`, Redguard, merchant `brinewhistle`: smoked herring, herring, fish stew, rum, bread, potions); **Grumm gro-Shank** (`grumm` on the beach 06:00–20:00, `grumm_inn` in the tavern otherwise; Orc bosun, knitter, insult champion); **J'zhirr** (`jzhirr` at the lighthouse steps by day, `jzhirr_inn` evenings; Khajiit navigator, *"ALSO a cat"*).
- **Fishbones Fennick** (`fennick`): a legless drowned sailor in a barrel by the pier, from the end of the raid (`flags.fennickAshore`). Very sorry.
- **Mother Agathe Brisk** (`brisk`, `meringue` slot 1): a ghost captain (`ghostly`, caster, 260 health). At half health in a fight she calls up two drowned.
- **Crumpet** (`crumpet`, in the *Meringue*'s hold): a glowing ghost cat with one white sock (`sock`, `spirit`). `shyUnlessSneaking: 10`: she bolts from anyone within 10 m who isn't sneaking.
- **Creatures:** **Drowned** (`drowned`, seaweed-hung skeletons with cutlasses), **Drowned Harpooner** (`drowned_harpooner`, archer), **The Drowned Bosun** (`drowned_bosun`, carries **Brisk's Cabin Key**), and **Lady Pinch** (`lady_pinch`, a mudcrab the size of a rowboat, the Grotto's boss). Leveled lists `drowned`, `drowned_grotto` and `cove_shore` (mudcrabs).

**1. `sq_cat1` — Cat Overboard**
1. **10:** a poster, or arriving in the cove. Find the Captain aboard the *Herring*.
2. **20:** Captain, *The Admiral*: two days gone; ask the crew.
3. **30:** Odette, *Have you seen the Admiral?*: she stole a smoked herring and went west. Odette gives you a **Smoked Herring** (and another, free, if you lose it). Sandy **paw prints** show on the beach from here until 50. Grumm (fat, grumpy, stealing wool: the first hint of kittens) and J'zhirr add colour.
4. **40:** within 12 m of Crumpet's Nook.
5. **50:** use the Admiral while holding a Smoked Herring. She eats it, slowly, while looking at you, and follows you (`flags.admiralFollowing`; she follows through doors and across saves). Under her is **an old brass collar** (`crumpet_collar`): *CRUMPET — D. MERINGUE*. Without a herring: *"She looks at you as if YOU were the one who was lost."*
6. **60:** bring her inside the *Herring* within 10 m of the Captain.
7. **100:** Captain, *She's back*: joy, then jealousy (she sits on your foot), then he goes pale at the collar. 50 gold; the Admiral goes to her rail; he gives you **The Articles of the *Indignant Herring*** and starts `sq_cat2`.

**2. `sq_cat2` — Articles of the Admiral** (stages 20 / 30 / 40 at one, two, three trials passed, `catTrialStage`)
- **Trial of Tribute:** J'zhirr, *The Golden Sardine*, gives **J'zhirr's Proper Hook**. Fish off the pier **between 05:00 and 08:00**: 60% per try, sure on the third, misses give a herring. Use the Admiral holding the **Golden Sardine** (`flags.trialSardine`).
- **Trial of Patience:** Odette, *The Lap*. Sit in the Captain's armchair (`player.seated`: eye lowered, held in place). The Admiral comes out from her cushion, settles on your knees, and a meter fills over **45 seconds**. Any movement key, jump, attack, block, spell, sneak or sheathe gets you up, and she leaves in disgust ("She will remember this."); sit again to retry (`flags.trialLap`). Passing teaches the fifth retort.
- **Trial of Tongues:** Grumm, *I challenge you!* Three of his five insults, drawn at random; answer each from the retorts you have learned (`flags.retorts`), or *"...Er."*. Three right wins (`flags.trialTongues`); one wrong and he laughs you off (rematch any time). Retorts: Odette teaches two, J'zhirr two, and the Lap the last:

  | Insult | Retort |
  |---|---|
  | "My grandmother had a sharper wit than you, and she was a barnacle." | "That explains the family resemblance." |
  | "I've seen sardines with more courage than you!" | "And you ate them all, by the look of you." |
  | "When I'm done with you, they'll use you as a mop!" | "Good. Then this deck will finally get cleaned." |
  | "Your knots are so loose the tide unties them!" | "At least my knots don't come with a pom-pom." |
  | "Not even the Admiral would sit on you!" | "She did, this morning. Ask her." |

- **100:** Captain, *The trials are done*: the Admiral taps your boot with her paw. You are **Cat's-Paw**: the **Cat's-Paw Bandana** and 100 gold. *"Fog's coming in. Haven't seen fog like that in forty years."* Starts `sq_cat3`.

**3. `sq_cat3` — The Fog Comes In**
1. **10:** stay in the cove after dark. The night fog begins.
2. **20:** the raid (`startRaid`), the first time you are in the cove **between 21:00 and 03:00**: a ship's bell tolls three times and the *Meringue* looms out of the fog. Drowned wade out of the surf at `COVE.beach` in three waves (4, 4, then 5 with **The Drowned Bosun**). Odette and Grumm fight beside you (`*_raid` copies). Leaving the cove mid-raid calls it off; it starts again the next night.
3. **30:** after the last wave the Captain finds the Admiral gone; wet prints run from the *Herring* into the sea, and Fennick is in his barrel. **A Soggy Note** (`brisk_note`) lies on her cushion.
4. **35:** the note picked up. **40:** Fennick, *Where is the Admiral?*: Brisk thinks she's Crumpet; a ginger cabin boy was meant to save her.
5. **50:** Captain, *Mother Brisk*: the confession. The *Meringue* can only be found in fog, by someone carrying a drowned light.
6. **60:** Fennick, *A ghost-lantern*: he lost his in the Drowned Grotto, "beside a lady of some size".
7. **70:** the **Ghost-Lantern** (`ghost_lantern`, a lantern-style light that burns green and keeps burning when you swim, `lightStyle: 'ghost'`) taken from its rock beside Lady Pinch.
8. **100:** Captain, *The ghost-lantern*: he ties on his old cabin-boy's scarf. *"We row tonight."* `flags.jollyReady`; starts `sq_cat4`.

**4. `sq_cat4` — The Dread Meringue**
1. **10:** the jolly boat, **between 20:00 and 04:00**, holding the Ghost-Lantern (the Captain waits on the pier). By day: "Come back after dark"; without the lantern: "nothing out there but fog".
2. **20:** aboard (`meringue`), the Captain beside you. If you never took Brisk's key from the Bosun after the raid, another Bosun is aboard (`bosun_meringue`). Rowing back early (the *Meringue*'s exit, *The Jolly Boat*) sends the Captain home; he waits on the pier again.
3. **Crumpet (optional):** sneak up on her in the hold and use her; she follows you (`flags.crumpetFound`), but never leaves the ship.
4. **40:** the stern cabin opened with Brisk's key (`flags.briskDoor`), within 10 m of Brisk, who has the Admiral on her lap.
5. **The endings:**
   - ***Show her Crumpet*** (with `crumpetFound`): Crumpet shoulders the Admiral off Brisk's lap. Brisk gives you **Brisk's Tricorn** and **Brisk's Compass**. Best ending.
   - ***Let Rourke speak*** (the Captain present, after `sq_cat3` 50): he confesses. With the **brass collar** in your pack, or Speechcraft 40+, she forgives the boy and lets go, and you get the Tricorn. Otherwise she refuses, once and for all (`flags.rourkeRefused`).
   - ***Then I'll take her from you*** (`briskFights`): she fights; killing her gives **60** and drops the Tricorn (`flags.briskFought`).
   - The two peaceful endings (`briskRests`) give **70**: her crew lay down their cutlasses and vanish, and Brisk (with Crumpet) fades away over a few seconds (`flags.briskRested`, `briskGone`).
6. **100:** use the Admiral to pick her up (`finishMeringue`): you row home and arrive on the pier at the next 06:00. Peaceful: the *Meringue* sails into the sunrise; fight: she sinks. `flags.fogLifted`, and the fog never returns. The Admiral bolts the moment the boat touches the pier. Starts `sq_cat5`.

**5. `sq_cat5` — Naming Night**
1. **10:** the Admiral has bolted. **20:** Grumm, *The Admiral's run off again*: his wool's gone; prints lead into the *Herring*.
2. **30:** the Captain's Sea Chest (its lid now open): the Admiral and **four kittens** (orange; orange with a white sock; black; grey) on Grumm's wool.
3. **40:** Captain, *Kittens!*: Naming Night at the bonfire at sundown.
4. **The party** (`startNamingNight`): within 14 m of the bonfire **between 19:00 and 23:00**. The Captain, Odette, Grumm and J'zhirr (`*_fest` copies) stand round the fire with the Admiral and the litter, for a scripted ~60-second scene: two bowls of **Odette's Fish Stew**; Grumm's **A Very Small Jumper** for you; J'zhirr names the black kitten **Also-A-Cat**; Fennick sings a shanty and the crew roar the chorus; the Captain names the white-socked kitten **Crumpet**; two volleys of fireworks from the *Herring*'s cannons.
5. **100:** pick of the litter: the orange one or the grey one (named **Kipper**, **Mizzen**, **Bilge** or **Captain Fluffbeard**), or Also-A-Cat herself (`flags.kittenName`, `kittenColor`). The Captain gives you **Purrsuit** and 300 gold (`flags.namingNightDone`). Afterwards the Admiral and the three other kittens live on the *Herring*'s rail. The party breaks up once you are 35 m from the fire.

**Your kitten** (`kitten` pet): exactly like the dog (see **Pets** below): follows you everywhere, can't be killed, *Stay here* / *Come along*, and grows from kitten to cat (×1.66) over three days. It never fights; when something hostile comes near it scampers away from it.

**Rewards:** **Purrsuit** (`purrsuit`: a quick one-handed blade with a gold cat's-head pommel; each hit has a 1 in 5 chance to startle the foe into running for 3 s, `startle: 0.2`); **Brisk's Tricorn** (head, +20 Health, +10 Magicka); **Brisk's Compass** (amulet, +15 Health, +15 Magicka; best ending only); **Cat's-Paw Bandana** (head, +10 Health); a kitten; and `QUEST_GOLD` for each of the five quests.

**New items:** quest: `lost_cat_poster`, `crumpet_collar`, `herring_articles`, `proper_hook`, `golden_sardine`, `brisk_note`, `brisk_key`, `ghost_lantern`; rewards: `purrsuit`, `brisk_tricorn`, `brisk_compass`, `catspaw_bandana`, `tiny_jumper`; food: `smoked_herring`, `herring`, `fish_stew`, `rum`; ingredient: `sea_salt` (loot list `drowned`).

**New templates:** `admiral`, `kitten`, `crumpet`, `drowned`, `drowned_harpooner`, `drowned_bosun`, `lady_pinch`. Body options: `hat: 'tricorn' | 'bicorne'`, `seaweed`, `fat`, `sock`. AI options: `tame`, `shyUnlessSneaking`. Actors can `perch` at a fixed height (the rail, a lap).

**Flags:** `admiralFollowing`, `trialSardine`, `sardineTries`, `trialLap`, `trialTongues`, `retorts`, `fennickAshore`, `jollyReady`, `gallowglassFollowing`, `crumpetFound`, `briskDoor`, `briskRested`, `briskFought`, `briskGone`, `briskHow`, `rourkeRefused`, `fogLifted`, `kittenName`, `kittenColor`, `namingNightDone`, and the pet flags `kittenAdopted`, `kittenFollowing`, `kittenStaying`, `kittenStayCell`, `kittenStayPos`, `kittenBornDay`.

**Pets** (`PETS` in `game.js`: the dog from `sq_pup`, the kitten from `sq_cat5`):
- **Immortal:** `essential`, so a killing blow only knocks them down; they regain health steadily, and `tickPets` stands them straight back up if anything ever does mark them dead.
- **Everywhere you go:** a following pet is carried through every door, into every cell (the overworld, interiors, the Greenheart, the cove, the *Meringue*, Oblivion), on fast travel, and is rebuilt from flags when you load a save. A pet told to *Stay here* waits in that cell, at that spot, across saves.

### The Hollow King — the Mages Guild questline (five quests, about 2–2½ hours)

**Premise:**
- **The sealed hall:** the Chorrol Mages Guild has been shut for nine days. Its door is sealed with a shimmering ward (the `locked` door in `structures.js` already says so), and Teekeeus does the Guild's business in the square because nobody else can get in or out. The official story is "a scrying accident".
- **The truth:** the chapter keeps the **Founders' Pool**, a scrying basin built into the hall's floor. Nine days ago, during the Oblivion crisis, the pool froze solid in a heartbeat, and the face of a crowned skeleton looked up out of the ice at the apprentice on watch. Guild-Magister **Ondine Vell** sealed the hall with everyone inside, in case whatever looked out could also look *in*.
- **The villain:** **Severin Ashgrave**, the First Magister of the Chorrol chapter, four hundred years dead. In 2E 270 he bound his soul into three **Hearts**, black ice in silver cages, and became a lich. His own chapter found out, and three of its founders sealed him alive-in-death under the Jerall Mountains, in the halls he had dug for himself. They couldn't destroy him, because a lich can't die while his Hearts beat, and they couldn't destroy the Hearts, because only the **Founders' Flame** burns hot enough and they hadn't kindled it yet. So each founder took one Heart and hid it as far from the others as they could.
  - **Hrolfa Stonevoice**, a Nord battlemage, hid hers in the foundations of a watchtower she was building in the north: the **Rime Spire**.
  - **Thalindor of the Greenward**, a Bosmer, hid his in an Ayleid ruin by the Imperial lake: **Vilverin**.
  - **Ilsabet Corve**, an Imperial, hid hers in a cave under the Jerall that she sealed with a rockfall. Four centuries later a goblin tribe dug into it: **Frostfang Hollow**.
- **Why now:** the Oblivion Gates thin the world (the same reason Ilvaine's ash-dead could rise). The seal is failing, Ashgrave is awake, and he has found someone to fetch his Hearts for him.
- **The arc:** get into the sealed hall and re-kindle the Founders' Flame; follow a missing apprentice to a ruined observatory in the snow; race the lich's servants to the three Hearts; go down into the mountain with the Magister; and end the Hollow King on his throne.

**Places:**
- **The Chorrol Mages Guild** (interior `mages_guild`, the existing locked door at Chorrol (C.x + 15, C.z + 48)): a two-room hall. The **Founders' Pool** sits in the middle of the floor, a basin of black ice (`U`-style set piece). Round it stand three **Warding Lamps** (`v`, cold braziers, reused from the Rime Spire), plus a library, a study and the apprentices' cots. The door stays locked (`requireFlag: guildWardToken` on a second door interactable) until `sq_mg1` 10.
- **Starfall Observatory** (world site `starfall`, about (40, −640), on a high shoulder of the Jerall north of Snikkit's Den; interior `starfall_observatory`):
  - **Outside:** a squat Guild tower with a cracked bronze dome and a telescope pointed at nothing, reached by an old switchback road from the Wintersmeet track.
  - **Inside:** two floors. The cracked **Seal-Orrery** (a big welkynd orrery, the `q` piece from Quillwhistle's Spire, scaled up and frosted) is on the upper floor. `ashgrave` spawn list.
- **The three hiding places** (existing cells; each Heart is placed by script when its stage begins):
  - **Rime Spire** (`rime_spire`): under a flagstone (`heartstone` interactable) beside the frost cage, which Cassius once felt "humming cold through the floor".
  - **Vilverin** (`vilverin`): in a sealed niche behind the locked iron gate's chamber, with Thalindor's glyph on it.
  - **Frostfang Hollow** (`frostfang_hollow`, the goblin camp): gone already. Bastien traded the goblins a sack of sweetrolls for it (see `sq_mg3`).
- **The Hollow Gate** (world site `hollow_gate`, about (330, −640), at the foot of the north-east Jerall, beyond Frostfang Hollow): a great door of black ice set into a cliff, carved with three founders holding three hearts. It opens only to the Founders' Ember and the Magister's rite.
- **The Hollow Halls** (three linked interiors, going down):
  1. `hollow_gate_hall`: the frozen antechamber, the old founders' camp (bones and a journal) and the first thralls.
  2. `bone_stair`: a long descending dungeon of ossuary niches and frozen waterfalls. Bastien is here.
  3. `ashgrave_throne`: a vast round hall under the mountain, with a throne of black ice on a dais, three pillars of blue welkynd light, and a ring of founders' wards in the floor.

**People:**
- **Teekeeus** (`teekeeus`, existing, Chorrol square): the Argonian spell merchant, stuck outside the hall. He is the hook. *"Teekeeus is a member of the Guild. Teekeeus is also a member of the street, apparently."*
- **Guild-Magister Ondine Vell** (`ondine`, `mages_guild` slot 1): a Breton in her sixties, dry, exhausted, holding the ward up for nine days on tea and stubbornness. She is your guide; in `sq_mg4`–`sq_mg5` she comes with you as a follower (`flags.ondineFollowing`, essential, a caster with Frostbite and Heal).
- **Apprentice Bastien Lorne** (`bastien`): a gifted Imperial apprentice, eighteen, who was on watch when the pool froze. Ashgrave spoke to him through the ice and offered him what every apprentice wants: to never stop learning. He slipped out of the hall before the ward closed and has been fetching his new master's Hearts ever since. The Guild thinks he was taken.
- **Apprentice Merle Hask** (`merle`, `mages_guild` slot 2): Bastien's friend, a nervous Nord alchemist. She gives you the letter from Bastien's mother (`bastien_letter`), which matters at the end.
- **Aldous Quillwhistle** (`aldous`, existing, Quillwhistle's Spire): expelled from the Chorrol chapter forty years ago "for frivolity". He can read Ashgrave's cipher, and is delighted to be asked. (Comic relief, and a tie-in to *The Libram of Lesser Wonders*.)
- **Cassius Frey** (`cassius_home`, existing, only if spared in *The White Hare*): tells you about the cold under the Rime Spire's floor and gives a frost-ward potion. If he's dead, his journal entry says the same.
- **Chief Gorbag Skullsnow** (existing, Frostfang Hollow): if the Frostfang are friendly, he cheerfully tells you he sold "the cold shiny rock" to "a sad human boy" for sweetrolls. If they're hostile, his hut holds Bastien's receipt.
- **Severin Ashgrave, the Hollow King** (`hollow_king`, `ashgrave_throne` slot 1): a tall lich in rotted magister's robes, with a crown of black ice and blue fire in his eyes. He talks, and he is courteous and patient, every bit the scholar he was. `ai: 'caster'`; 500 health; Frostbite, Shock Bolt, Fireball.
- **Creatures (leveled list `ashgrave`):**
  - **Ashgrave Thralls** (`hollow_thrall`): frost-rimed skeletons in tattered Guild robes;
  - **Bone Knights** (`bone_knight`): skeleton champions in black-iron armour;
  - **Frost Wraiths** (the existing `ice_wraith`);
  - **Heartwardens** (`heartwarden`): one tough thrall that rises beside each Heart when you take it.

**1. `sq_mg1` — The Sealed Hall** (20–30 minutes)
1. **10:** Teekeeus, *The Guild hall*: it has been sealed nine days, he hears knocking on the window shutters at night, and the Magister slipped a note under the door asking for "someone who can be trusted with fire". He gives you a **Ward-Token** (`ward_token`, a sigil that lets one person through the ward) and a crate of supplies to carry in (`guild_supplies`).
2. **20:** entering the hall. It is freezing inside: frost on the books, the pool a disc of black ice, and the apprentices wrapped in blankets. Ondine, *The pool*: what Bastien saw, and that he is missing (gone before the ward closed; she assumes taken). The three **Warding Lamps** round the pool have gone out and won't relight from an ordinary flame.
3. **30:** Merle, *The lamps*: the lamps were lit from the **Founders' Flame**, which "lives in the stone". The founders' rite is written in the *Charter of the Chorrol Chapter*, which is in the locked study (`lock` level 2, key from Ondine, or pick it).
4. **40:** reading the **Charter** (`guild_charter`, a book): kindle the lamps in the founders' order, *sun, moon, star* (east, west, north lamp), each with a flame you made yourself (a lit torch or a Flare spell, like the Rime Spire braziers). Wrong order: the lamps gutter and go out, and a cold gust knocks you down for 10 damage. Retry any time.
5. **50:** all three lamps lit in order (`flags.mgLamps`). The ice on the pool cracks and steams, and a blue-white flame stands up out of it: the **Founders' Flame**. In it, for a moment, you see a crowned skeleton look up, *and look at you*.
6. **100:** Ondine, *The Founders' Flame*: she tells you who Severin Ashgrave was, what the Hearts are, and that only this flame can break them. She draws an ember of it into a lantern and gives it to you: the **Founders' Ember** (`founders_ember`, a lantern-style light that burns blue-white and never goes out, `lightStyle: 'founder'`). She makes you an **Associate** of the Guild (`flags.mgMember`; guild beds and the hall's library are yours to use), and asks you to find Bastien, who was obsessed with the old **Starfall Observatory** in the mountains, "where the Guild used to watch the seal". The ward comes down (`flags.guildOpen`): the hall door opens to everyone from now on.

**2. `sq_mg2` — Starfall** (20–30 minutes)
1. **10:** travel to Starfall Observatory (the switchback road climbs from the Wintersmeet track).
2. **20:** entering the observatory. The thralls in it have been dead a long time; Bastien has not. His bedroll is warm-ish and his things are scattered round the cracked **Seal-Orrery**.
3. **30:** examining the Seal-Orrery (`sealorrery`): three of its nine spheres are black ice, and a brass dial reads *ASHGRAVE — 3 — UNBROKEN*. The founders built the observatory to watch the Hearts; the black spheres mark where they lie.
4. **40:** finding **Bastien's Notebook** (`bastien_notes`, on the desk upstairs). Its first pages are careful notes on the seal. In its last pages the handwriting changes, and the notes are written in a cipher of interlocking circles.
5. **50:** Aldous, *Bastien's notebook* (back in Chorrol, at Quillwhistle's Spire). He is thrilled ("Ashgrave's Sigil-Script! Nobody has used this in four hundred years! Oh, this is *wonderful*, oh, this is *terrible*"). He reads it: *"The Master says: the Spire, the Ruin, the Hollow. Fetch my hearts and I will teach you everything. I will teach you to never stop."*
6. **100:** Ondine, *Bastien* (or Aldous, if you show him first and he insists on coming to tell her): the realisation that Bastien isn't a captive but a courier. Ondine is hurt and very quiet. Reward: the Guild spell **Sunbolt** (`sunbolt`, Destruction: a bolt of white fire, 30 damage, ×2 against undead). Starts `sq_mg3`.

**3. `sq_mg3` — Three Hearts** (35–45 minutes; the three can be done in any order, stages 20 / 30 / 40 at one, two, three Hearts accounted for, `mgHeartStage`)
- **How to break a Heart:** use it (from the inventory, `usable`) while the **Founders' Ember** is lit in your hand. The Heart shrieks, cracks, and dies (`flags.heartRime` / `heartVilverin`). With the Ember out, the Heart only hums: *"You need fire older than the cold."*
- **The Rime Spire's Heart:**
  - If Cassius lives, Cassius, *Ashgrave's Heart*: *"There was always a cold under that floor that wasn't mine. I thought it was guilt."* He gives you two **Frost Ward** potions.
  - In the spire's top chamber, a flagstone by the cage now has a founder's rune on it (`heartstone`, `requireFlag: mgHearts`). Use it to lift out the **Heart of Ashgrave** (`ashgrave_heart`).
  - A **Heartwarden** and two Frost Wraiths rise out of the floor at once.
- **Vilverin's Heart:**
  - Behind the iron gate (the existing `vilverin_key` lock), a niche in the wall shows Thalindor's oak-leaf glyph (`heartniche`). Lighting the Founders' Ember near it (within 4 m) makes the glyph shine and the stone slide back.
  - A Heartwarden and two Thralls appear out of the niche.
- **Frostfang Hollow's Heart:**
  - **If the Frostfang are friendly:** Gorbag, *The cold shiny rock*. He's sorry, and he isn't. *"Sad human boy. Gave Gorbag forty sweetrolls. FORTY. Gorbag is not made of stone."* He gives you **Bastien's Receipt** (a sweetroll-stained IOU with Bastien's signature) and points you north-east.
  - **If they are hostile or dead:** the receipt is on Gorbag's body (added to his `extraLoot`).
  - Either way, the Heart is gone, and this "counts" as accounting for it (`flags.heartFrostfang`).
- **100:** Ondine, *The Hearts*. Two are broken, and the third is with Bastien, on his way to his master. She knows the founders' rite to open the **Hollow Gate**, and she's coming with you. *"I made that boy an apprentice. I'll bring him home or I'll bury him myself."* Starts `sq_mg4`.

**4. `sq_mg4` — The Hollow Road** (25–35 minutes)
1. **10:** Ondine joins you as a follower (`flags.ondineFollowing`). Travel to the Hollow Gate in the north-east foothills; Thralls and Frost Wraiths walk the snow round it.
2. **20:** at the gate, Ondine, *The founders' rite*. She speaks the rite while you hold up the lit Founders' Ember for 20 seconds (a short scripted scene, like the Lightwatch: ice cracking, the three carved founders lighting up one by one). Thralls attack in two small waves while it runs, and Ondine can't fight during the rite. The gate opens (`flags.hollowGateOpen`).
3. **30:** the antechamber (`hollow_gate_hall`): the founders' old camp, and **Ilsabet Corve's Last Entry** (`corve_journal`). They sealed the door from outside after they hid the Hearts: *"Hrolfa says it is cruel to leave him awake in the dark. I say it is cruel to let him out. We are both right."*
4. **40:** halfway down the **Bone Stair** (`bone_stair`) you find Bastien on a landing, kneeling by a brazier of blue cold-fire, gaunt and shaking, the third Heart in his hands. He has been ordered to wait for you.
5. **The choice:**
   - ***Talk him down:*** show him **his mother's letter** (from Merle, `sq_mg1`), or Speechcraft 50+, or Ondine present and unhurt plus Speechcraft 30+. *"She… she still writes. Every week. I stopped opening them."* He gives you the Heart, and you break it with the Ember on the spot. He joins you to the end (`flags.bastienSaved`; an essential follower who casts Frostbite).
   - ***Make him an offer of his own:*** *"Come with us and learn something real."* Needs `flags.mgMember` and a Speechcraft or disposition check (40+ / 60+). The same outcome as above, but he keeps the Heart: he wants to break it himself, in front of his master.
   - ***Fight him:*** he's an apprentice with a lich's gifts: Frostbite, Shock Bolt, 160 health, two summoned Thralls. If he dies he drops the Heart (`flags.bastienDead`), and Ondine says nothing for the rest of the descent.
   - **However it goes:** if the Heart is in your hands it gets broken, here or at the throne. If Bastien kept it (the second option), he breaks it at the throne at the start of the fight.
6. **100:** at the bottom of the stair, the throne-room doors (`openFlag: hollowThroneOpen`, opened by the Ember). Starts `sq_mg5`.

**5. `sq_mg5` — The Hollow King** (15–20 minutes)
1. **10:** entering the throne hall. Ashgrave is seated. He talks first; he is never in a hurry.
   - *The Guild:* *"I built your chapter. I chose its stone. I lit its first lamp. Ask your Magister whose name is under the floor of her pool."* (It is his.)
   - *Bastien* (if saved): *"You have taken my apprentice. A pity. He listened so beautifully."*
   - *Why:* *"Because a mind is the only thing in the world worth keeping, and the world insists on throwing them away."*
   - **Offer:** he offers you what he offered Bastien. Accepting is a trap: the dialogue ends in a curse (a Silence for 30 s, no casting) and the fight begins anyway, with him taunting you. There is no evil ending; this is Oblivion's Mages Guild, not Skyrim's.
2. **20:** the fight (`hollowKingFights`):
   - **Phase one (100%–60%):** he duels from the dais: Frostbite, Shock Bolt and Fireball, and a ring of frost every 12 s that slows anyone within 5 m. The three welkynd pillars shield him (`shieldPillars`). While any pillar stands he takes half damage. Each pillar is an interactable you shatter with a Sunbolt, a power attack, or the Ember (use it within 2 m). Ondine calls this out after his first ward flare.
   - **Phase two (60%–0%):** he rises and floats, summons two Bone Knights at 60% and two more at 30%, and teleports between the pillar bases every 15 s.
   - **The last Heart:** if it is still unbroken (that is, Bastien kept it), Bastien breaks it in a blue flash at the start of phase two, and Ashgrave screams. If the Heart is somehow still whole, Ashgrave can't die: at 0 health he kneels, re-forms over 5 seconds (`reforming`, with a *Shatter the crown* interactable while he kneels) and stands again at half health. Using the lit Ember on him while he kneels ends it. This is the fallback for any route that left the Heart intact.
3. **30:** Ashgrave falls. His crown cracks down the middle, the blue fire goes out of his eyes, and the whole mountain sighs. The ice in the hall begins, very slowly, to melt (`flags.ashgraveDead`).
4. **100:** take the **Crown of the Hollow King** from the throne steps. Return to Chorrol (the Ember lights you a way out through a side door straight onto the slope outside the Hollow Gate). Ondine, *It's over*, back at the hall:
   - the Founders' Pool has thawed and shows only the sky;
   - you are named **Magister** of the Chorrol chapter (`flags.mgMagister`), and the Magister's study is yours (a bed, a safe chest `magister_chest` that never resets);
   - 500 gold;
   - **Ashgrave's Grimoire** (`ashgrave_grimoire`), which teaches **Summon Bone Knight** (Conjuration, a Bone Knight that fights for you for 45 s).
   - **If Bastien was saved:** he is in the hall as a sheepish apprentice again (`bastien_home`), and has written his mother. **If not:** Merle keeps his desk exactly as he left it, and says so.

**Rewards:**
- **The Founders' Ember** (`founders_ember`): a lantern that burns blue-white, never goes out, works in water, and (beyond the questline) makes undead within 6 m take 25% more damage from you.
- **Sunbolt** (`sunbolt`): a white-fire bolt for 22 magicka, 30 damage, doubled against the undead.
- **Crown of the Hollow King** (`hollow_crown`, head, cloth): +50 Magicka, −15 Health. *"It is very cold, and it is very quiet inside your head while you wear it."*
- **Summon Bone Knight** (from Ashgrave's Grimoire).
- **The Guild spell table** (Merle, `merchant: 'guild'`, opens to Associates; `GUILD_SPELLS` in `spells.js`, effects in `spellbook.js`):
  - **Starfall** (Destruction 25, 60 magicka): seven stars fall one after another round where you aim, shock 22 in 3 m each.
  - **Founders' Light** (Restoration, 30): a blue-white orb circles you for 60 s, lighting the dark and burning undead within 6 m for 8 a second.
  - **Hollow Step** (Alteration, 26): step up to 18 m through the cold; frost bursts where you leave and land (15, slow).
  - **Founders' Ward** (Alteration, 40): Shield 50% for 20 s with the sun, moon and star circling you; undead that hit you are burned for 10.
  - **Ring of Rime** (Destruction, 50; Magister only): a ring of frost rolls out to 14 m, frost 30 with slow and stagger on everything it passes.
- **Guild rank:** Associate (`sq_mg1`), then Magister (`sq_mg5`). The hall's library, beds and spell shop are open to members, and the Magister gets the study and its safe chest.
- `QUEST_GOLD` for each of the five quests.

**New items:**
- **Quest items:** `ward_token`, `guild_supplies`, `guild_charter`, `bastien_letter`, `bastien_notes`, `bastien_receipt`, `ashgrave_heart`, `corve_journal`.
- **Rewards:** `founders_ember`, `hollow_crown`, `ashgrave_grimoire`.
- **Potions:** `frost_ward` (Shield 30%, 60 s).

**New templates:** `hollow_thrall`, `bone_knight`, `heartwarden`, `hollow_king`; plus NPCs `ondine`, `merle`, `bastien`, `bastien_home`. **Leveled list:** `ashgrave`. **New spells:** `sunbolt`, `summon_bone_knight`.

**Flags:** `guildWardToken`, `mgLamps`, `mgLampOrder`, `mgMember`, `guildOpen`, `mgHearts`, `heartRime`, `heartVilverin`, `heartFrostfang`, `ondineFollowing`, `hollowGateOpen`, `bastienSaved`, `bastienKeepsHeart`, `bastienDead`, `hollowThroneOpen`, `ashgraveDead`, `mgMagister`.

**As built** (`src/guild.js`, mixed into `game`; places in `src/world/hollowking.js` and `interiors.js`):
- **The ward:** the Guild door (`guildDoor`) is blocked until you carry the Ward-Token; it opens for everyone once `flags.guildOpen`.
- **The lamps:** lighting one out of order douses all of them, costs 10 health and knocks you back from the pool. Any flame of your own counts: a lit torch or lantern in your hand, or a Flare (9 magicka). Lighting the third wakes the Flame even if you never read the Charter.
- **Hearts:** the Rime Spire's flagstone and Vilverin's niche only appear once `flags.mgHearts` is set (at the end of `sq_mg2`); Vilverin's niche needs the Ember lit. Each raises a Heartwarden with two wraiths or thralls. Breaking a Heart is `useAshgraveHeart` (the item's `onUse`). If the Frostfang are hostile, the receipt is on Gorbag's body (`extraLoot`).
- **Bastien's choices:** *Give him his mother's letter* always works; *Come home, Bastien* needs Speechcraft 50+, or 30+ with Ondine beside you (one try); *Come with us and learn something real* needs Guild membership and Speechcraft 40+ or disposition 60+ (one try), and he keeps the Heart; *Then I'll take it from you* is the fight. Saved, he follows you (`flags.bastienFollowing`, essential) to the throne.
- **The fight:** while any ward-pillar stands he takes half damage (`pillarWarded`, `hollowShielded`). Shatter a pillar by using it with the Ember lit, or by spending a Sunbolt's 22 magicka on it point-blank. A frost ring every 12 s hurts anyone within 5 m. At 60% he summons two Bone Knights (and, if Bastien kept the Heart, Bastien breaks it); at 30%, two more; from 60% on he teleports between the pillars every 15 s. If his last Heart still beats when he falls (`preventDeath`), he kneels for 6 s and rises at half health until you break it from your pack. Accepting his offer (*Teach me*) silences you for 30 s, and the fight begins anyway.
- **Afterwards:** a crack of daylight opens in the hall (an exit straight out to the Gate); the crown lies on the dais steps; Ondine and Bastien go home ahead of you as you leave; if Bastien was saved he is back in the hall (`bastien_home`).

**What's new in code, and what is reused:**
- **Reused as-is:**
  - cold braziers lit with fire (the Warding Lamps, with an order check added);
  - lantern lights (`lightStyle` with a new `founder` style, beside `lantern` and `ghost`);
  - followers that rebuild on load (Ondine and Bastien, like the Captain);
  - interiors built from ASCII maps, leveled spawn lists, unique bosses, `openFlag` doors;
  - scripted scenes on a timeline (the gate rite, like the Lightwatch);
  - Speechcraft and disposition checks, items that start or advance stages on pickup;
  - the existing Rime Spire, Vilverin, Frostfang Hollow, Gorbag, Cassius and Aldous.
- **New, each small:**
  1. **The lamp-order puzzle:** three braziers that must be lit in sequence (`mgLampOrder`).
  2. **Usable quest items** that check for a lit Ember (breaking a Heart).
  3. **Shield pillars:** three interactable crystals; while any stands, the boss takes half damage.
  4. **`undying` bosses:** at 0 health, while a flag is unset, they kneel and re-form instead of dying, with a timed interactable.
  5. **A Silence effect** (no casting for N seconds) for the false offer.
  6. **The founder light style:** a blue-white flame, plus the undead damage bonus.
- **Biggest asset jobs:**
  - the Mages Guild interior with its pool;
  - the Starfall Observatory, outside and in;
  - the Hollow Gate's carved ice door;
  - the three Hollow interiors, the throne hall above all;
  - the lich model: a scaled skeleton in a robe with a black-ice crown (a new `crown` hat kind beside `tricorn` and `bicorne`).

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
| The Smugglers' Cut | `smugglers_cut` | (−470, 640), south of Fort Sutch | entrance to Brinewhistle Cove (`sq_cat*`) |
| Brinewhistle Cove | — | cove cell (about 100 m across): plaza and bonfire (−2, 6), the Herring (21, 12), the Mitten (−21, −6), pier (4, 16)–(4, 62), the Nook (−36, 21), Grotto door (−49, 10), lighthouse (56, 44), tunnel mouth (0, −57) | `sq_cat1`–`sq_cat5` |

**Interiors:**
- `inn`: the Grey Mare. Slots 1 Emfrid, 2 Rimalus Bruiant (Tam Corwyn), 3 Ysolde, 4 Corvin (home), 5 Tillmon, 6 Sheogorath.
- `shop`: Northern Goods and Trade. Slots 1 Seed-Neeus, 2 Bram Hollis.
- `gloam_barrow`: the Lamplighter's barrow (`ashen` spawn list, boss `ilvaine`).
- `snow_hare`: the Snow Hare, Wintersmeet. Slots 1 Sigrun, 2 Erlend, 3 Cassius (after `sq_hare4`). Beds are rentable (`rentable: true`).
- `rime_spire`: Cassius Frey's tower (`rime` spawn list). Slot 1 is Cassius. It has braziers `v`, ice walls `i` and the frost cage `U`.
- `priory`: slots 1 Jauffre, 2 Martin.
- `kvatch_chapel`: slots 1 Martin, 2 Jakben, 3 Tierra.
- `salty_mitten`: the Salty Mitten, Brinewhistle. Slots 1 Odette, 2 J'zhirr (evenings), 3 Grumm (evenings). Rentable beds.
- `herring`: the Indignant Herring. Slot 1 Captain Gallowglass; the armchair, the Admiral's cushion, the sea chest.
- `drowned_grotto`: sea cave (`drowned_grotto` spawn list, boss `lady_pinch`), the ghost-lantern's rock.
- `meringue`: the Dread Meringue (`drowned` spawn list). Slot 1 Mother Brisk; Crumpet in the hold; the locked stern cabin.
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
