# Pixel Dungeon

A fully-playable 2D top-down auto-attack roguelite dungeon crawler built with HTML5 Canvas and vanilla JavaScript. All pixel-art sprites are generated programmatically via a Python script — no external image files required.

## Play

Open `index.html` in any modern browser. No build step, no dependencies.

> Or serve locally: `python -m http.server 8080` then visit `http://localhost:8080`

## Features

| Feature | Details |
|---|---|
| **3 Classes** | Knight · Mage · Rogue — each with unique stats and passives |
| **Auto-attack** | Fires homing projectiles at the nearest enemy automatically |
| **3 Abilities** | Fireball (J) · Dash (K) · Ice Nova (L) |
| **7 Enemy Types + Boss** | Slime, Bat, Skeleton, Spider, Bomber, Healer, Summoner, Necromancer |
| **10 Rooms** | 3 dungeon themes (Crypt → Forest → Lava), rest room at room 5, boss room at room 10 |
| **Level-up System** | Choose 1 of 3 random run upgrades on level-up |
| **Permanent Shop** | Spend crystals between runs for lasting upgrades |
| **Status Effects** | Burn, Freeze, Poison, Shock, Bleed |
| **Mobile Support** | On-screen joystick + touch buttons |
| **Persistent Save** | Crystals, best run, permanent upgrades stored in localStorage |

## Controls

| Input | Action |
|---|---|
| WASD / Arrow Keys | Move |
| J | Fireball ability |
| K | Dash ability |
| L | Ice Nova ability |
| Click | Interact with menus, chests, upgrades |
| 1 / 2 / 3 | Select level-up card |
| Esc | Pause / unpause |

## File Structure

```
index.html                   ← Entry point
js/
  saveSystem.js              ← localStorage persistence
  assets.js                  ← Image preloader with canvas fallbacks
  statusEffects.js           ← Burn / Freeze / Poison / Shock / Bleed
  upgrades.js                ← 20 run upgrades + 5 permanent upgrades
  projectiles.js             ← Projectile + Particle + spawnExplosion
  abilities.js               ← FireballAbility / DashAbility / IceNovaAbility
  enemies.js                 ← 8 enemy types + Necromancer boss
  player.js                  ← Player class (Knight / Mage / Rogue)
  rooms.js                   ← Room generation + 3 dungeon themes
  ui.js                      ← All menus, HUD, damage numbers
  game.js                    ← Main game loop + state machine
scripts/
  generate-assets.py         ← Generates all 59 sprites via Pillow
public/generated-assets/     ← 59 PNG pixel-art sprites (auto-generated)
```

## Vercel Deployment

When importing this project into Vercel, use these settings:

| Setting | Value |
|---|---|
| **Framework Preset** | Other |
| **Build Command** | *(leave empty)* |
| **Output Directory** | `.` |
| **Root Directory** | *(repo root)* |

No build step is needed. Vercel serves the files as-is. The `vercel.json` at the repo root configures static file serving for all assets — do **not** add a catch-all rewrite rule, as that would cause JS files to be served as HTML.

## Regenerating Assets

Requires Python 3 + Pillow:

```bash
pip install Pillow
python scripts/generate-assets.py
```

## Game Loop Overview

```
LOADING → MENU → CLASS_SELECT → PLAYING ↔ PAUSED
                                    ↓
                               LEVELUP (pick upgrade)
                                    ↓
                    GAMEOVER ←────────────→ VICTORY → SHOP
```

Rooms 0–3 and 5–8 are combat rooms (scales +18% per room). Room 4 and 8 are rest/treasure rooms. Room 9 is the Necromancer boss fight.

Killing the boss triggers a Victory screen; crystals earned during the run are added to your permanent stash for the shop.
