'use strict';

const TILE = {
    FLOOR: 0, WALL: 1, SPIKE: 2, POISON: 3, DOOR: 4
};

const THEMES = {
    crypt:  { floor:'tile_floor_crypt',  wall:'tile_wall_crypt',  bgColor:'#1a1525' },
    forest: { floor:'tile_floor_forest', wall:'tile_wall_forest', bgColor:'#1a2810' },
    lava:   { floor:'tile_floor_lava',   wall:'tile_wall_lava',   bgColor:'#2a1005' },
};

const TILE_SIZE = 40;
const GRID_W = 20;
const GRID_H = 15;

class Room {
    constructor(roomIndex, theme) {
        this.index = roomIndex;
        this.theme = theme || 'crypt';
        this.cleared = false;
        this.chests = [];
        this.portal = null;
        this.doorOpen = false;
        this.tiles = this._generate(roomIndex);
        this._placeHazards(roomIndex);
        this._placeChests(roomIndex);
    }

    _generate(idx) {
        const grid = [];
        for (let r = 0; r < GRID_H; r++) {
            grid[r] = [];
            for (let c = 0; c < GRID_W; c++) {
                // Border = wall
                if (r === 0 || r === GRID_H-1 || c === 0 || c === GRID_W-1) {
                    grid[r][c] = TILE.WALL;
                } else {
                    grid[r][c] = TILE.FLOOR;
                }
            }
        }

        // Door opening in right wall center
        grid[6][GRID_W-1] = TILE.DOOR;
        grid[7][GRID_W-1] = TILE.DOOR;
        grid[8][GRID_W-1] = TILE.DOOR;

        // Random interior obstacles (pillar clusters)
        const pillars = Math.floor(2 + Math.random() * 3 + idx * 0.3);
        for (let p = 0; p < pillars; p++) {
            const pr = 3 + Math.floor(Math.random() * (GRID_H-6));
            const pc = 4 + Math.floor(Math.random() * (GRID_W-8));
            // 2x2 or 1x1 pillar
            const s = Math.random() < 0.4 ? 2 : 1;
            for (let dr = 0; dr < s; dr++) for (let dc = 0; dc < s; dc++) {
                if (pr+dr < GRID_H-1 && pc+dc < GRID_W-1) grid[pr+dr][pc+dc] = TILE.WALL;
            }
        }

        return grid;
    }

    _placeHazards(idx) {
        if (idx < 2) return;
        const hazardCount = Math.floor(idx * 1.5);
        const hazardTypes = idx > 5 ? [TILE.SPIKE, TILE.POISON] : [TILE.SPIKE];
        for (let h = 0; h < hazardCount; h++) {
            let r, c, attempts = 0;
            do {
                r = 2 + Math.floor(Math.random() * (GRID_H-4));
                c = 2 + Math.floor(Math.random() * (GRID_W-4));
                attempts++;
            } while (this.tiles[r][c] !== TILE.FLOOR && attempts < 30);
            if (attempts < 30) {
                this.tiles[r][c] = hazardTypes[Math.floor(Math.random()*hazardTypes.length)];
            }
        }
    }

    _placeChests(idx) {
        // Treasure rooms and occasional combat rooms have chests
        if (idx === 4 || idx === 8) {
            // Treasure room: 2 chests
            this.chests = [
                { x: 240, y: 200, open: false },
                { x: 560, y: 380, open: false },
            ];
        } else if (Math.random() < 0.25 && idx > 0) {
            this.chests = [{ x: 300 + Math.random()*200, y: 180 + Math.random()*240, open: false }];
        }
    }

    isWall(wx, wy) {
        const c = Math.floor(wx / TILE_SIZE);
        const r = Math.floor(wy / TILE_SIZE);
        if (r < 0 || r >= GRID_H || c < 0 || c >= GRID_W) return true;
        const t = this.tiles[r][c];
        return t === TILE.WALL || (t === TILE.DOOR && !this.doorOpen);
    }

    tileAt(wx, wy) {
        const c = Math.floor(wx / TILE_SIZE);
        const r = Math.floor(wy / TILE_SIZE);
        if (r < 0 || r >= GRID_H || c < 0 || c >= GRID_W) return TILE.WALL;
        return this.tiles[r][c];
    }

    openDoor() {
        this.doorOpen = true;
        this.tiles[6][GRID_W-1] = TILE.FLOOR;
        this.tiles[7][GRID_W-1] = TILE.FLOOR;
        this.tiles[8][GRID_W-1] = TILE.FLOOR;
        // Place portal beyond door
        this.portal = { x: 790, y: 300, active: true };
    }

    // Returns a { x, y } world-position on a floor tile safe for spawning,
    // or null if none could be found.
    getSafeSpawnPosition(enemyRadius, playerX, playerY) {
        const minPlayerDist = 150;
        const r = Math.ceil(enemyRadius / TILE_SIZE);
        const validTiles = [];

        // Gather walkable floor tiles — right half of room, away from player start
        for (let row = 1; row < GRID_H - 1; row++) {
            for (let col = Math.floor(GRID_W / 2); col < GRID_W - 2; col++) {
                if (this.tiles[row][col] !== TILE.FLOOR) continue;
                const wx = (col + 0.5) * TILE_SIZE;
                const wy = (row + 0.5) * TILE_SIZE;
                // Minimum distance from player
                if (playerX !== undefined && playerY !== undefined) {
                    const ddx = wx - playerX, ddy = wy - playerY;
                    if (ddx * ddx + ddy * ddy < minPlayerDist * minPlayerDist) continue;
                }
                validTiles.push({ x: wx, y: wy });
            }
        }

        if (validTiles.length === 0) return null;

        // Try random picks and verify radius clearance
        for (let attempt = 0; attempt < 30; attempt++) {
            const pos = validTiles[Math.floor(Math.random() * validTiles.length)];
            // Check corners of bounding box aren't in walls
            const checks = [
                [pos.x - enemyRadius, pos.y],
                [pos.x + enemyRadius, pos.y],
                [pos.x, pos.y - enemyRadius],
                [pos.x, pos.y + enemyRadius],
            ];
            if (checks.every(([cx, cy]) => !this.isWall(cx, cy))) {
                return pos;
            }
        }

        // Fallback: any valid tile center
        return validTiles[Math.floor(Math.random() * validTiles.length)] || null;
    }

    spawnEnemies(roomIndex, scaleFactor, playerX, playerY) {
        const types = this._enemyTable(roomIndex);
        const enemies = [];
        const count = Math.min(3 + Math.floor(roomIndex * 0.8), 12);

        for (let i = 0; i < count; i++) {
            const type = types[Math.floor(Math.random() * types.length)];
            const isElite = Math.random() < (0.05 + roomIndex * 0.03);
            // Determine approximate enemy radius for safe spawn check
            const radiusMap = { slime:18, bat:16, skeleton:20, spider:19, bomber:18, healer:19, summoner:21 };
            const radius = radiusMap[type] || 20;
            const pos = this.getSafeSpawnPosition(radius, playerX, playerY);
            if (!pos) continue; // skip rather than spawn in a wall
            const e = createEnemy(type, pos.x, pos.y, isElite);
            // Scale HP and ATK with room index
            e.hp = Math.floor(e.hp * scaleFactor);
            e.maxHp = e.hp;
            e.atk = Math.floor(e.atk * scaleFactor);
            enemies.push(e);
        }
        return enemies;
    }

    _enemyTable(idx) {
        if (idx <= 2) return ['slime','bat'];
        if (idx <= 4) return ['slime','bat','skeleton'];
        if (idx <= 6) return ['skeleton','spider','bomber'];
        if (idx <= 8) return ['skeleton','spider','bomber','healer','summoner'];
        return ['skeleton','bomber','healer','summoner'];
    }

    render(ctx) {
        const th = THEMES[this.theme] || THEMES.crypt;
        ctx.fillStyle = th.bgColor;
        ctx.fillRect(0, 0, 800, 600);

        for (let r = 0; r < GRID_H; r++) {
            for (let c = 0; c < GRID_W; c++) {
                const t = this.tiles[r][c];
                const x = c * TILE_SIZE;
                const y = r * TILE_SIZE;

                if (t === TILE.WALL) {
                    Assets.draw(ctx, th.wall, x, y, TILE_SIZE, TILE_SIZE);
                } else if (t === TILE.FLOOR || t === TILE.DOOR) {
                    Assets.draw(ctx, th.floor, x, y, TILE_SIZE, TILE_SIZE);
                    if (t === TILE.DOOR && !this.doorOpen) {
                        Assets.draw(ctx, 'tile_door', x, y, TILE_SIZE, TILE_SIZE);
                    }
                } else if (t === TILE.SPIKE) {
                    Assets.draw(ctx, th.floor, x, y, TILE_SIZE, TILE_SIZE);
                    Assets.draw(ctx, 'tile_spike', x, y, TILE_SIZE, TILE_SIZE);
                } else if (t === TILE.POISON) {
                    Assets.draw(ctx, th.floor, x, y, TILE_SIZE, TILE_SIZE);
                    Assets.draw(ctx, 'tile_poison_puddle', x, y, TILE_SIZE, TILE_SIZE);
                }
            }
        }

        // Chests
        for (const ch of this.chests) {
            const key = ch.open ? 'chest_open' : 'chest';
            Assets.draw(ctx, key, ch.x - 18, ch.y - 18, 36, 36);
        }

        // Portal
        if (this.portal && this.portal.active) {
            const t = Date.now() / 1000;
            ctx.save();
            ctx.shadowColor = '#aa44ff';
            ctx.shadowBlur = 16 + Math.sin(t*3)*6;
            Assets.draw(ctx, 'portal', this.portal.x - 20, this.portal.y - 24, 40, 48);
            ctx.restore();
        }
    }
}

function generateRooms(totalRooms) {
    const themeOrder = ['crypt','forest','lava'];
    const rooms = [];
    for (let i = 0; i < totalRooms; i++) {
        const theme = themeOrder[Math.floor(i / 4) % 3];
        rooms.push(new Room(i, theme));
    }
    return rooms;
}
