'use strict';

const TILE = {
    FLOOR: 0,
    WALL: 1,
    SPIKE: 2,
    POISON: 3,
    DOOR: 4,
    RUNE: 5,
    CORRUPTION: 6,
    CRYSTAL: 7
};

const THEMES = {
    crypt:      { floor: 'tile_floor_crypt',      wall: 'tile_wall_crypt',      bgColor: '#1a1525' },
    forest:     { floor: 'tile_floor_forest',     wall: 'tile_wall_forest',     bgColor: '#1a2810' },
    lava:       { floor: 'tile_floor_lava',       wall: 'tile_wall_lava',       bgColor: '#2a1005' },
    corrupted:  { floor: 'tile_floor_corrupted',  wall: 'tile_wall_corrupted',  bgColor: '#130b1d' }
};

const TILE_SIZE = 40;
const GRID_W = 20;
const GRID_H = 15;
const MAX_CORRUPTION_TILE_PLACEMENT_ATTEMPTS = 25;

const ENEMY_SPAWN_RADII = {
    slime: 18, bat: 16, skeleton: 20, spider: 19, bomber: 18, healer: 19, summoner: 21,
    corrupted_slime: 18, corrupted_slimelet: 12, void_bat: 16, cultist: 20, crystal_golem: 24,
    corrupted_archer: 19, void_hound: 20, crystal_turret: 22, corrupted_summoner: 22, corrupted_minion: 14
};

const DUNGEON2_ROOM_TYPES = [
    'corrupted_combat',
    'ritual_chamber',
    'crystal_cavern',
    'corrupted_maze',
    'elite_hunt',
    'treasure_vault',
    'corruption_flood',
    'void_shrine'
];

class Room {
    constructor(roomIndex, options = {}) {
        this.index = roomIndex;
        this.totalRooms = options.totalRooms || 10;
        this.dungeonId = options.dungeonId || 'dungeon1';
        this.theme = options.theme || 'crypt';
        this.roomType = options.roomType || 'combat';
        this.cleared = false;
        this.chests = [];
        this.portal = null;
        this.doorOpen = false;
        this.reinforcementTimer = 0;
        this.reinforcementsSpawned = false;
        this.corruptionTimer = 0;
        this.corruptionSpreadSteps = 0;
        this.tiles = this._generate(roomIndex);
        this._placeHazards(roomIndex);
        this._placeChests(roomIndex);
    }

    _isDungeon2() {
        return this.dungeonId === 'dungeon2';
    }

    _generate(idx) {
        const grid = [];
        for (let r = 0; r < GRID_H; r++) {
            grid[r] = [];
            for (let c = 0; c < GRID_W; c++) {
                if (r === 0 || r === GRID_H - 1 || c === 0 || c === GRID_W - 1) grid[r][c] = TILE.WALL;
                else grid[r][c] = TILE.FLOOR;
            }
        }

        grid[6][GRID_W - 1] = TILE.DOOR;
        grid[7][GRID_W - 1] = TILE.DOOR;
        grid[8][GRID_W - 1] = TILE.DOOR;

        if (!this._isDungeon2()) {
            const pillars = Math.floor(2 + Math.random() * 3 + idx * 0.3);
            for (let p = 0; p < pillars; p++) this._placePillar(grid, 3, GRID_H - 6, 4, GRID_W - 8, Math.random() < 0.4 ? 2 : 1);
            return grid;
        }

        switch (this.roomType) {
            case 'corrupted_maze':
                this._generateMazeWalls(grid);
                break;
            case 'crystal_cavern':
                for (let i = 0; i < 10; i++) this._scatterTile(grid, TILE.CRYSTAL, 2, GRID_H - 4, 3, GRID_W - 5);
                break;
            case 'ritual_chamber':
                this._placeRuneCircle(grid, 10, 7, 3);
                for (let i = 0; i < 4; i++) this._scatterTile(grid, TILE.RUNE, 3, GRID_H - 5, 4, GRID_W - 6);
                break;
            case 'void_shrine':
                this._placeRuneCircle(grid, 10, 7, 2);
                this._scatterTile(grid, TILE.CRYSTAL, 7, 8, 9, 11);
                break;
            case 'elite_hunt':
                for (let i = 0; i < 5; i++) this._placePillar(grid, 3, GRID_H - 6, 5, GRID_W - 10, 1);
                break;
            default: {
                const pillars = Math.floor(3 + Math.random() * 4 + idx * 0.35);
                for (let p = 0; p < pillars; p++) this._placePillar(grid, 2, GRID_H - 5, 3, GRID_W - 6, Math.random() < 0.35 ? 2 : 1);
                break;
            }
        }

        return grid;
    }

    _placePillar(grid, rowMin, rowSpan, colMin, colSpan, size) {
        const pr = rowMin + Math.floor(Math.random() * Math.max(1, rowSpan));
        const pc = colMin + Math.floor(Math.random() * Math.max(1, colSpan));
        for (let dr = 0; dr < size; dr++) {
            for (let dc = 0; dc < size; dc++) {
                if (pr + dr < GRID_H - 1 && pc + dc < GRID_W - 1 && pc + dc > 1) grid[pr + dr][pc + dc] = TILE.WALL;
            }
        }
    }

    _scatterTile(grid, tile, rowMin, rowMax, colMin, colMax) {
        const r = rowMin + Math.floor(Math.random() * Math.max(1, rowMax - rowMin + 1));
        const c = colMin + Math.floor(Math.random() * Math.max(1, colMax - colMin + 1));
        if (grid[r] && grid[r][c] === TILE.FLOOR) grid[r][c] = tile;
    }

    _placeRuneCircle(grid, cx, cy, radius) {
        for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2;
            const c = Math.round(cx + Math.cos(a) * radius);
            const r = Math.round(cy + Math.sin(a) * radius);
            if (r > 1 && r < GRID_H - 1 && c > 1 && c < GRID_W - 1 && grid[r][c] === TILE.FLOOR) grid[r][c] = TILE.RUNE;
        }
    }

    _generateMazeWalls(grid) {
        for (let c = 4; c < GRID_W - 2; c += 3) {
            const gapRow = 2 + Math.floor(Math.random() * (GRID_H - 4));
            for (let r = 1; r < GRID_H - 1; r++) {
                if (r === gapRow || r === gapRow + 1) continue;
                if (grid[r][c] === TILE.FLOOR) grid[r][c] = TILE.WALL;
            }
        }
    }

    _placeHazards(idx) {
        if (!this._isDungeon2()) {
            if (idx < 2) return;
            const hazardCount = Math.floor(idx * 1.5);
            const hazardTypes = idx > 5 ? [TILE.SPIKE, TILE.POISON] : [TILE.SPIKE];
            for (let h = 0; h < hazardCount; h++) this._placeHazardRandom(hazardTypes);
            return;
        }

        const roomNum = idx + 1;
        let hazardCount = Math.floor(4 + roomNum * 0.9);
        if (this.roomType === 'corruption_flood') hazardCount += 6;
        if (this.roomType === 'corrupted_maze') hazardCount += 3;
        if (this.roomType === 'treasure_vault') hazardCount = Math.max(1, Math.floor(hazardCount * 0.25));
        if (this.roomType === 'void_shrine') hazardCount = Math.max(2, Math.floor(hazardCount * 0.4));

        const hazardTypes = [TILE.SPIKE, TILE.POISON, TILE.CORRUPTION];
        if (this.roomType === 'ritual_chamber') hazardTypes.push(TILE.RUNE);
        if (this.roomType === 'crystal_cavern') hazardTypes.push(TILE.CRYSTAL);

        for (let h = 0; h < hazardCount; h++) this._placeHazardRandom(hazardTypes);
    }

    _placeHazardRandom(hazardTypes) {
        let r, c, attempts = 0;
        do {
            r = 2 + Math.floor(Math.random() * (GRID_H - 4));
            c = 2 + Math.floor(Math.random() * (GRID_W - 4));
            attempts++;
        } while (this.tiles[r][c] !== TILE.FLOOR && attempts < 40);
        if (attempts < 40) this.tiles[r][c] = hazardTypes[Math.floor(Math.random() * hazardTypes.length)];
    }

    _placeChests(idx) {
        if (!this._isDungeon2()) {
            if (idx === 4 || idx === 8) {
                this.chests = [{ x: 240, y: 200, open: false }, { x: 560, y: 380, open: false }];
            } else if (Math.random() < 0.25 && idx > 0) {
                this.chests = [{ x: 300 + Math.random() * 200, y: 180 + Math.random() * 240, open: false }];
            }
            return;
        }

        if (this.roomType === 'treasure_vault') {
            this.chests = [
                { x: 220, y: 180, open: false },
                { x: 400, y: 310, open: false },
                { x: 580, y: 420, open: false }
            ];
        } else if (this.roomType === 'void_shrine') {
            this.chests = [{ x: 400, y: 300, open: false }];
        } else if (Math.random() < 0.28 && idx > 1) {
            this.chests = [{ x: 280 + Math.random() * 240, y: 170 + Math.random() * 250, open: false }];
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
        this.tiles[6][GRID_W - 1] = TILE.FLOOR;
        this.tiles[7][GRID_W - 1] = TILE.FLOOR;
        this.tiles[8][GRID_W - 1] = TILE.FLOOR;
        this.portal = { x: 790, y: 300, active: true };
    }

    getSafeSpawnPosition(enemyRadius, playerX, playerY) {
        const minPlayerDist = 150;
        const validTiles = [];
        for (let row = 1; row < GRID_H - 1; row++) {
            for (let col = Math.floor(GRID_W / 2); col < GRID_W - 2; col++) {
                if (this.tiles[row][col] !== TILE.FLOOR) continue;
                const wx = (col + 0.5) * TILE_SIZE;
                const wy = (row + 0.5) * TILE_SIZE;
                if (playerX !== undefined && playerY !== undefined) {
                    const ddx = wx - playerX;
                    const ddy = wy - playerY;
                    if (ddx * ddx + ddy * ddy < minPlayerDist * minPlayerDist) continue;
                }
                validTiles.push({ x: wx, y: wy });
            }
        }
        if (validTiles.length === 0) return null;
        for (let attempt = 0; attempt < 40; attempt++) {
            const pos = validTiles[Math.floor(Math.random() * validTiles.length)];
            const checks = [
                [pos.x - enemyRadius, pos.y], [pos.x + enemyRadius, pos.y],
                [pos.x, pos.y - enemyRadius], [pos.x, pos.y + enemyRadius]
            ];
            if (checks.every(([cx, cy]) => !this.isWall(cx, cy))) return pos;
        }
        return validTiles[Math.floor(Math.random() * validTiles.length)];
    }

    spawnEnemies(roomIndex, scaleFactor, playerX, playerY) {
        const types = this._enemyTable(roomIndex);
        if (!types.length) return [];
        const enemies = [];

        let count = this._isDungeon2()
            ? Math.min(4 + Math.floor(roomIndex * 0.65), 16)
            : Math.min(3 + Math.floor(roomIndex * 0.8), 12);

        if (this.roomType === 'ritual_chamber') count += 2;
        if (this.roomType === 'corrupted_combat') count += 1;
        if (this.roomType === 'corruption_flood') count += 1;
        if (this.roomType === 'elite_hunt') count = 2 + Math.floor(Math.random() * 2);

        for (let i = 0; i < count; i++) {
            const type = types[Math.floor(Math.random() * types.length)];
            let eliteChance = this._isDungeon2() ? 0.12 + roomIndex * 0.035 : 0.05 + roomIndex * 0.03;
            if (this.roomType === 'elite_hunt') eliteChance = 0.95;
            if (this.roomType === 'treasure_vault' || this.roomType === 'void_shrine') eliteChance *= 0.2;
            const isElite = Math.random() < Math.min(0.92, eliteChance);
            const radius = ENEMY_SPAWN_RADII[type] || 20;
            const pos = this.getSafeSpawnPosition(radius, playerX, playerY);
            if (!pos) continue;
            const e = createEnemy(type, pos.x, pos.y, { isElite });
            e.hp = Math.floor(e.hp * scaleFactor);
            e.maxHp = e.hp;
            e.atk = Math.floor(e.atk * scaleFactor);
            enemies.push(e);
        }

        return enemies;
    }

    _enemyTable(idx) {
        if (!this._isDungeon2()) {
            if (idx <= 2) return ['slime', 'bat'];
            if (idx <= 4) return ['slime', 'bat', 'skeleton'];
            if (idx <= 6) return ['skeleton', 'spider', 'bomber'];
            if (idx <= 8) return ['skeleton', 'spider', 'bomber', 'healer', 'summoner'];
            return ['skeleton', 'bomber', 'healer', 'summoner'];
        }

        if (this.roomType === 'treasure_vault') return [];
        if (this.roomType === 'void_shrine') return Math.random() < 0.45 ? [] : ['cultist', 'void_bat'];
        if (this.roomType === 'elite_hunt') return ['crystal_golem', 'void_hound', 'corrupted_archer', 'corrupted_summoner'];

        if (idx <= 4) return ['corrupted_slime', 'void_bat', 'cultist'];
        if (idx <= 8) return ['corrupted_slime', 'void_bat', 'cultist', 'void_hound', 'corrupted_archer'];
        if (idx <= 14) return ['cultist', 'crystal_golem', 'corrupted_archer', 'void_hound', 'corrupted_summoner'];
        return ['crystal_golem', 'corrupted_archer', 'void_hound', 'crystal_turret', 'corrupted_summoner', 'cultist'];
    }

    update(dt, game) {
        if (!this._isDungeon2() || this.cleared || !game || game.state !== 'playing') return;

        if (this.roomType === 'ritual_chamber' && !this.reinforcementsSpawned) {
            this.reinforcementTimer += dt;
            if (this.reinforcementTimer >= 6) {
                this.reinforcementsSpawned = true;
                const extraCount = 2 + Math.floor(Math.random() * 3);
                for (let i = 0; i < extraCount; i++) {
                    const table = ['cultist', 'void_bat', 'corrupted_slime', 'corrupted_minion'];
                    const type = table[Math.floor(Math.random() * table.length)];
                    const pos = this.getSafeSpawnPosition(ENEMY_SPAWN_RADII[type] || 18, game.player.x, game.player.y);
                    if (!pos) continue;
                    const enemy = createEnemy(type, pos.x, pos.y, { isElite: Math.random() < 0.35 });
                    enemy.hp = Math.floor(enemy.hp * (1 + this.index * 0.1));
                    enemy.maxHp = enemy.hp;
                    game.enemies.push(enemy);
                    spawnExplosion(game.particles, pos.x, pos.y, 8, ['#aa44ff', '#cc66ff'], 90, 5);
                }
            }
        }

        if (this.roomType === 'corruption_flood' && this.corruptionSpreadSteps < 16) {
            this.corruptionTimer += dt;
            if (this.corruptionTimer >= 1.5) {
                this.corruptionTimer = 0;
                this.corruptionSpreadSteps++;
                this.spreadCorruptionTile(game);
            }
        }
    }

    _spreadCorruption(game) {
        for (let attempt = 0; attempt < MAX_CORRUPTION_TILE_PLACEMENT_ATTEMPTS; attempt++) {
            const r = 2 + Math.floor(Math.random() * (GRID_H - 4));
            const c = 2 + Math.floor(Math.random() * (GRID_W - 4));
            if (this.tiles[r][c] === TILE.FLOOR || this.tiles[r][c] === TILE.POISON) {
                this.tiles[r][c] = TILE.CORRUPTION;
                spawnExplosion(game.particles, c * TILE_SIZE + 20, r * TILE_SIZE + 20, 4, ['#6c2ab5', '#c94dff'], 45, 3);
                return;
            }
        }
    }

    spreadCorruptionTile(game) {
        this._spreadCorruption(game);
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

                if (t === TILE.WALL) Assets.draw(ctx, th.wall, x, y, TILE_SIZE, TILE_SIZE);
                else {
                    Assets.draw(ctx, th.floor, x, y, TILE_SIZE, TILE_SIZE);
                    if (t === TILE.DOOR && !this.doorOpen) Assets.draw(ctx, 'tile_door', x, y, TILE_SIZE, TILE_SIZE);
                    if (t === TILE.SPIKE) Assets.draw(ctx, 'tile_spike', x, y, TILE_SIZE, TILE_SIZE);
                    if (t === TILE.POISON) Assets.draw(ctx, 'tile_poison_puddle', x, y, TILE_SIZE, TILE_SIZE);
                    if (t === TILE.RUNE) Assets.draw(ctx, 'tile_ritual_rune', x, y, TILE_SIZE, TILE_SIZE);
                    if (t === TILE.CORRUPTION) Assets.draw(ctx, 'tile_corruption_puddle', x, y, TILE_SIZE, TILE_SIZE);
                    if (t === TILE.CRYSTAL) Assets.draw(ctx, 'tile_crystal_wall', x, y, TILE_SIZE, TILE_SIZE);
                }
            }
        }

        for (const ch of this.chests) {
            const key = ch.open ? 'chest_open' : 'chest';
            Assets.draw(ctx, key, ch.x - 18, ch.y - 18, 36, 36);
        }

        if (this.portal && this.portal.active) {
            const t = Date.now() / 1000;
            ctx.save();
            ctx.shadowColor = this._isDungeon2() ? '#d22fff' : '#aa44ff';
            ctx.shadowBlur = 16 + Math.sin(t * 3) * 6;
            Assets.draw(ctx, 'portal', this.portal.x - 20, this.portal.y - 24, 40, 48);
            ctx.restore();
        }
    }
}

function getDungeon2RoomType(roomNumber) {
    if (roomNumber === 10) return 'mini_boss';
    if (roomNumber === 20) return 'final_boss';
    const early = ['corrupted_combat', 'ritual_chamber', 'corrupted_maze', 'crystal_cavern'];
    const mid = ['corrupted_combat', 'ritual_chamber', 'crystal_cavern', 'elite_hunt', 'corrupted_maze', 'corruption_flood'];
    const late = ['corrupted_combat', 'elite_hunt', 'corrupted_maze', 'corruption_flood', 'void_shrine', 'ritual_chamber'];
    if (roomNumber === 5 || roomNumber === 15) return 'treasure_vault';
    const pool = roomNumber <= 5 ? early : (roomNumber <= 15 ? mid : late);
    return pool[Math.floor(Math.random() * pool.length)];
}

function generateRooms(totalRooms, dungeonId = 'dungeon1') {
    const rooms = [];
    if (dungeonId === 'dungeon2') {
        for (let i = 0; i < totalRooms; i++) {
            rooms.push(new Room(i, {
                totalRooms,
                dungeonId,
                theme: 'corrupted',
                roomType: getDungeon2RoomType(i + 1)
            }));
        }
        return rooms;
    }

    const themeOrder = ['crypt', 'forest', 'lava'];
    for (let i = 0; i < totalRooms; i++) {
        const theme = themeOrder[Math.floor(i / 4) % 3];
        rooms.push(new Room(i, { totalRooms, dungeonId, theme, roomType: (i === 4 || i === 8) ? 'treasure' : 'combat' }));
    }
    return rooms;
}
