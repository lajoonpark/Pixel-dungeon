# Pixel Dungeon

A fully-playable 2D top-down auto-attack roguelite dungeon crawler built with HTML5 Canvas and vanilla JavaScript. All pixel-art sprites are generated programmatically via a Python script — no external image files required.

## Play

Open `index.html` in any modern browser. No build step, no dependencies.

> Or serve locally: `python -m http.server 8080` then visit `http://localhost:8080`

## Features

| Feature | Details |
|---|---|
| **12 Classes + Rarity System** | Common · Rare · Epic · Legendary · Mythic — each with unique stats, passives, and abilities |
| **Class Roll System** | Spend crystals to roll random classes; duplicates convert to bonus crystals |
| **Auto-attack** | Fires homing projectiles at the nearest enemy automatically |
| **2-5 Abilities per class** | Up to 5 keyed abilities (J K L U I); each class has its own dash |
| **15+ Enemy Types + Multi-Boss** | Base dungeon enemies + Corrupted Depths enemy roster (Corrupted Slime, Void Bat, Cultist, Crystal Golem, Corrupted Archer, Void Hound, Crystal Turret, Corrupted Summoner) |
| **2 Dungeons** | Dungeon 1: 10 rooms, Necromancer final boss · Dungeon 2: 20 rooms, Crystal Behemoth mini boss (room 10), Void Herald final boss (room 20) |
| **Level-up System** | Choose 1 of 3 random run upgrades on level-up |
| **Permanent Shop** | Categorized Defense/Offense/Utility upgrade trees with scaling crystal costs |
| **Status Effects** | Burn, Freeze, Poison, Shock, Bleed, Slow |
| **Mobile Support** | On-screen joystick + touch buttons |
| **Persistent Save** | Crystals, best run, permanent upgrades, unlocked classes in localStorage |

## Dungeon Select & Progression

- Flow: **Main Menu → Start Run → Dungeon Select → Class Select**
- **Dungeon 1 (Forgotten Catacombs)** is unlocked by default.
- **Dungeon 2 (The Corrupted Depths)** unlocks permanently after your first Dungeon 1 clear.
- Unlocks are saved in localStorage via `SaveSystem` (`unlockedDungeons`, `selectedDungeon`, `dungeonClears`).

### Dungeon 2: The Corrupted Depths

- **Theme:** cursed stone, purple crystal growths, ritual runes, void corruption.
- **Structure:** 20 rooms total.
  - Rooms 1–5: intro corrupted enemies + hazards
  - Rooms 6–9: higher elite chance + trap pressure
  - **Room 10:** mini boss (**The Crystal Behemoth**)
  - Rooms 11–15: stronger mixed waves + elite pressure
  - Rooms 16–19: hardest standard rooms + dense hazards
  - **Room 20:** final boss (**The Void Herald**)
- **Difficulty/Rewards:** higher XP/coin/crystal gains, more elite enemies, stronger enemy scaling, better class synergy opportunities from denser mixed encounters.

### Dungeon 2 Room Types

- Corrupted Combat Room
- Ritual Chamber (delayed reinforcements)
- Crystal Cavern
- Corrupted Maze Room
- Elite Hunt Room
- Treasure Vault
- Corruption Flood Room (spreading hazard zones)
- Void Shrine

### Dungeon 2 Enemy List

- Corrupted Slime (can split into slimelets)
- Void Bat (high-speed dash style)
- Cultist (ranged dark bolts + minion summon)
- Crystal Golem (tank with vulnerable window)
- Corrupted Archer (long-range volleys + retreat)
- Void Hound (aggressive lunges, enrages at low HP)
- Crystal Turret (stationary beam pressure)
- Corrupted Summoner (summons and buffs nearby enemies)

### Bosses

- **Mini boss (Room 10):** The Crystal Behemoth  
  Crystal slam, radial crystal barrage, charge bursts, crystal summons, phase 2 speed-up and corruption pressure.
- **Final boss (Room 20):** The Void Herald  
  Teleport + projectile patterns (P1), rotating beam patterns + hazard pulses (P2), rapid attacks + high arena pressure (P3).

## Class System

### Rarity & Ability Count

| Rarity | Abilities | Roll Chance | Color |
|---|---|---|---|
| Common | 2 | 60% | Gray |
| Rare | 3 | 25% | Blue |
| Epic | 4 | 10% | Purple |
| Legendary | 5 | 4% | Gold/Orange |
| Mythic | 5 + powerful passive | 1% | Crimson |

### All 12 Classes

| # | Class | Rarity | Passive |
|---|---|---|---|
| 1 | Human Adventurer | Common | +10% movement speed |
| 2 | Fire Mage | Common | +50% ability damage |
| 3 | Ranger | Common | +20% attack range |
| 4 | Frost Knight | Rare | Enemies hit are slowed briefly |
| 5 | Venom Rogue | Rare | Poison deals +100% damage |
| 6 | Stormcaller | Rare | Lightning chains to +1 extra enemy |
| 7 | Necromancer | Epic | Summons gain +50% health and damage |
| 8 | Gunslinger | Epic | Auto attacks fire 25% faster |
| 9 | Paladin | Epic | Healing effects are 50% stronger |
| 10 | Dragon Knight | Legendary | Burn effects last twice as long |
| 11 | Void Assassin | Legendary | Crits deal +150% damage |
| 12 | Chronomancer | Mythic | Time Fracture: CDR +30%, nearby slow, auto-repeat every 12s |

Only **Human Adventurer** is unlocked at the start. All others must be obtained through the roll system.

## Roll System

- Access via **CLASS SELECT > Roll button**
- Costs crystals; scales per roll: **20 > 30 > 40 > ... > 100 (capped)**
- Duplicate classes convert to **bonus crystals** (scaled by rarity: Common=2, Rare=4, Epic=8, Legendary=12, Mythic=20)
- All unlocked classes visible in the **Collection** screen

## Permanent Upgrade Categories

- **Defense:** Fortified Body, Iron Skin, Fleet Footed, Evasion Training  
  Focused on survivability, mitigation, mobility, and dodge.
- **Offense:** Combat Training, Arcane Mastery, Rapid Strikes  
  Focused on basic attack damage, ability damage scaling, and attack speed.
- **Utility:** Fortune, Crystal Hoarder  
  Focused on class-roll rarity progression and guaranteed crystal income.

## Crystal Rewards

- Dungeon 1 room clear: **+1 crystal**.
- Dungeon 2 room clear: **+2 crystals**.
- **Crystal Hoarder** grants **+1 guaranteed crystal per room per rank**.
  - Dungeon 1 room clear = `1 + Crystal Hoarder rank`
  - Dungeon 2 room clear = `2 + Crystal Hoarder rank`
- **Fortune** slightly shifts class-roll rarity weights each rank:
  - lowers Common chance a bit
  - slightly increases Rare/Epic/Legendary/Mythic chances
  - Mythic increases stay small (not a massive jump)
- Dungeon 2 mini/final boss runs and higher-tier encounters produce higher total crystal income through stronger reward multipliers and guaranteed boss crystal payouts.
- Room-clear crystals are saved to localStorage immediately.

## Controls

| Input | Action |
|---|---|
| WASD / Arrow Keys | Move |
| J | Ability slot 1 |
| K | Ability slot 2 |
| L | Ability slot 3 |
| U | Ability slot 4 (Epic/Legendary/Mythic classes) |
| I | Ability slot 5 (Legendary/Mythic classes) |
| Click | Interact with menus, chests, upgrades |
| 1 / 2 / 3 | Select level-up card |
| Esc | Pause / unpause |

## File Structure

```
index.html                   <- Entry point
js/
  saveSystem.js              <- localStorage persistence (includes class unlock state)
  assets.js                  <- Image preloader with canvas fallbacks (expanded generated asset set)
  statusEffects.js           <- Burn / Freeze / Poison / Shock / Bleed / Slow
  upgrades.js                <- Run upgrades + categorized permanent upgrade trees
  projectiles.js             <- Projectile + Particle + spawnExplosion
  abilities.js               <- 43 ability classes + ABILITY_REGISTRY
  classes.js                 <- CLASS_DEFS (12 classes), ClassSystem API, RARITY_COLORS
  enemies.js                 <- Enemy roster + elite modifiers + dungeon bosses
  player.js                  <- Player class (data-driven from ClassSystem)
  rooms.js                   <- Room generation + 3 dungeon themes
  ui.js                      <- All menus, HUD, class collection, roll screen
  game.js                    <- Main game loop + state machine
scripts/
  generate-assets.py         <- Generates all sprites via Pillow
 public/generated-assets/     <- auto-generated PNG pixel-art sprites
```

## Regenerating Assets

Requires Python 3 + Pillow. The script generates **all** sprites in one pass:

```bash
pip install Pillow
python scripts/generate-assets.py
```

This regenerates:
- 12 class player sprites (player_adventurer.png ... player_chronomancer.png)
- 12 class portraits (portrait_adventurer.png ... portrait_chronomancer.png)
- 43 ability icons (icon_quick_slash.png ... icon_collapse.png)
- 12 passive icons (passive_adventurer.png ... passive_chronomancer.png)
- 5 rarity frames (frame_common.png ... frame_mythic.png)
- All original enemy, tile, upgrade, and UI assets
- **Corrupted Depths assets generated with Pillow**:
  - corrupted floor/wall tiles, ritual runes, corruption puddles, crystal hazard walls
  - Dungeon 2 enemy sprites + mini/final boss sprites
  - corruption effect sprite
  - dungeon select + room-type UI icons
  - corrupted boss-bar frame asset

Assets are saved to `public/generated-assets/`.

## Vercel Deployment

When importing this project into Vercel, use these settings:

| Setting | Value |
|---|---|
| **Framework Preset** | Other |
| **Build Command** | *(leave empty)* |
| **Output Directory** | `.` |
| **Root Directory** | *(repo root)* |

No build step is needed. Vercel serves the files as-is.

## Game Loop Overview

```
LOADING -> MENU -> CLASS_SELECT -> CLASS_COLLECTION
                       |              (view all classes)
                  CLASS_ROLL
                       |
                   PLAYING <-> PAUSED
                       |
                  LEVELUP (pick upgrade)
                       |
       GAMEOVER <-----------> VICTORY -> SHOP
```

Dungeon 1 uses 10 rooms with a final boss in room 10.  
Dungeon 2 uses 20 rooms with a mini boss in room 10 and final boss in room 20.

Killing the boss still grants separate victory rewards; room-clear crystals are awarded and saved immediately during the run.
