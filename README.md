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
| **7 Enemy Types + Boss** | Slime, Bat, Skeleton, Spider, Bomber, Healer, Summoner, Necromancer |
| **10 Rooms** | 3 dungeon themes (Crypt to Forest to Lava), rest room at room 5, boss room at room 10 |
| **Level-up System** | Choose 1 of 3 random run upgrades on level-up |
| **Permanent Shop** | Spend crystals between runs for lasting upgrades |
| **Status Effects** | Burn, Freeze, Poison, Shock, Bleed, Slow |
| **Mobile Support** | On-screen joystick + touch buttons |
| **Persistent Save** | Crystals, best run, permanent upgrades, unlocked classes in localStorage |

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
  assets.js                  <- Image preloader with canvas fallbacks (142 assets)
  statusEffects.js           <- Burn / Freeze / Poison / Shock / Bleed / Slow
  upgrades.js                <- 20 run upgrades + 5 permanent upgrades
  projectiles.js             <- Projectile + Particle + spawnExplosion
  abilities.js               <- 43 ability classes + ABILITY_REGISTRY
  classes.js                 <- CLASS_DEFS (12 classes), ClassSystem API, RARITY_COLORS
  enemies.js                 <- 8 enemy types + Necromancer boss
  player.js                  <- Player class (data-driven from ClassSystem)
  rooms.js                   <- Room generation + 3 dungeon themes
  ui.js                      <- All menus, HUD, class collection, roll screen
  game.js                    <- Main game loop + state machine
scripts/
  generate-assets.py         <- Generates all 142 sprites via Pillow
public/generated-assets/     <- 142 PNG pixel-art sprites (auto-generated)
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

Rooms 0-3 and 5-8 are combat rooms (scales +18% per room). Room 4 and 8 are rest/treasure rooms. Room 9 is the Necromancer boss fight.

Killing the boss triggers a Victory screen; crystals earned during the run are added to your permanent stash for the shop and the roll system.
