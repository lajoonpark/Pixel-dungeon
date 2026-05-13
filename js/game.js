'use strict';

const STATES = {
    LOADING:           'loading',
    MENU:              'menu',
    DUNGEON_SELECT:    'dungeon_select',
    CLASS_SELECT:      'class_select',
    CLASS_COLLECTION:  'class_collection',
    CLASS_ROLL:        'class_roll',
    PLAYING:           'playing',
    PAUSED:            'paused',
    LEVELUP:           'levelup',
    GAMEOVER:          'gameover',
    VICTORY:           'victory',
    SHOP:              'shop',
    HELP:              'help',
    SETTINGS:          'settings',
};

const DUNGEON_DEFS = {
    dungeon1: {
        id: 'dungeon1',
        name: 'Forgotten Catacombs',
        difficulty: 'Normal',
        totalRooms: 10,
        miniBossRoom: null,
        finalBossRoom: 10,
        rewardLabel: '+1 crystal / room',
        crystalPerRoom: 1,
        victoryBaseCrystals: 5,
        victoryKillDivisor: 10,
        victoryMultiplier: 1,
        enemyScalePerRoom: 0.18,
        eliteBias: 1,
        coinMultiplier: 1,
        xpMultiplier: 1,
        crystalDropBonus: 0,
        roomBosses: { 10: 'boss_necromancer' },
        treasureRooms: [5, 9]
    },
    dungeon2: {
        id: 'dungeon2',
        name: 'The Corrupted Depths',
        difficulty: 'Hard',
        totalRooms: 20,
        miniBossRoom: 10,
        finalBossRoom: 20,
        rewardLabel: '+2 crystals / room',
        crystalPerRoom: 2,
        victoryBaseCrystals: 5,
        victoryKillDivisor: 10,
        victoryMultiplier: 1.7,
        enemyScalePerRoom: 0.2,
        eliteBias: 1.25,
        coinMultiplier: 1.35,
        xpMultiplier: 1.4,
        crystalDropBonus: 0.06,
        roomBosses: { 10: 'boss_crystal_behemoth', 20: 'boss_void_herald' },
        treasureRooms: [5, 15]
    }
};
const DEFAULT_ABILITY_KEY_COUNT = 2;
const ABILITY_HINT_KEYS = ['J', 'K', 'L', 'U', 'I'];
const CRYSTAL_FINDER_BONUS_CHANCE_PER_LEVEL = 0.10;

const Game = {
    state: STATES.LOADING,
    canvas: null,
    ctx: null,
    keys: {},
    mouse: { x: 0, y: 0 },
    lastTime: 0,
    screenShake: 0,

    // Run state
    player: null,
    enemies: [],
    allies: [],
    projectiles: [],
    particles: [],
    damageNumbers: [],
    rooms: [],
    currentRoom: null,
    roomIndex: 0,
    currentDungeonId: 'dungeon1',
    currentDungeon: null,
    coins: 0,
    killCount: 0,
    runCrystalsEarned: 0,
    startingCrystals: 0,
    crystalTransactions: [],
    isRunActive: false,
    upgradeChoices: [],
    scaleFactor: 1,

    // Roll animation state
    rollAnimTimer: 0,
    rollAnimActive: false,
    rollAnimResult: null,
    rollAnimPhase: 'idle', // 'idle', 'spinning', 'reveal'

    // Hover state for UI clicks
    hoverBtn: null,
    hoverDungeon: null,
    hoverClass: null,
    hoverCard: -1,
    hoverShopItem: -1,

    // Mobile joystick
    joystick: { active: false, startX: 0, startY: 0, dx: 0, dy: 0 },
    isMobile: false,

    // Persistent save data
    saveData: null,
    crystals: 0,

    // Stability flags
    _loopRunning: false,
    _transitionInProgress: false,
    _fatalError: null,
    claimedRoomCrystalRewards: new Set(),

    init() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.saveData = SaveSystem.load();
        if (!this.saveData.selectedDungeon || !DUNGEON_DEFS[this.saveData.selectedDungeon]) this.saveData.selectedDungeon = 'dungeon1';
        this.currentDungeonId = this.saveData.selectedDungeon;
        this.currentDungeon = DUNGEON_DEFS[this.currentDungeonId] || DUNGEON_DEFS.dungeon1;
        this.crystals = this.saveData.crystals || 0;
        this.isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        this._updateControlHintText();

        this._setupInput();
        this._setupMobileControls();

        // Global error handlers for stability
        window.onerror = (msg, src, line, col, err) => {
            const text = `JS Error: ${msg} (${src}:${line})`;
            console.error('[PixelDungeon]', text, err);
            this._fatalError = text;
        };
        window.addEventListener('unhandledrejection', ev => {
            const text = `Unhandled rejection: ${ev.reason}`;
            console.error('[PixelDungeon]', text);
            this._fatalError = text;
        });

        // Show loading screen immediately
        this._renderLoadingFrame(0);

        Assets.load(() => {
            this.state = STATES.MENU;
            if (!this._loopRunning) {
                this._loopRunning = true;
                requestAnimationFrame(t => this._loop(t));
            }
        });

        // Poll loading progress
        const loadInterval = setInterval(() => {
            if (Assets.progress() >= 1) { clearInterval(loadInterval); return; }
            this._renderLoadingFrame(Assets.progress());
        }, 100);
    },

    _renderLoadingFrame(p) {
        UI.renderLoading(this.ctx, p);
    },

    _setupInput() {
        document.addEventListener('keydown', e => {
            this.keys[e.code] = true;
            this._onKeyPress(e.code, e);
        });
        document.addEventListener('keyup', e => { this.keys[e.code] = false; });

        this.canvas.addEventListener('mousemove', e => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            this.mouse.x = (e.clientX - rect.left) * scaleX;
            this.mouse.y = (e.clientY - rect.top) * scaleY;
            this._updateHover();
        });

        this.canvas.addEventListener('click', e => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            const mx = (e.clientX - rect.left) * scaleX;
            const my = (e.clientY - rect.top) * scaleY;
            this._onClick(mx, my);
        });
    },

    _setupMobileControls() {
        const addTouch = (el) => {
            el.addEventListener('touchstart', e => {
                e.preventDefault();
                for (const t of e.changedTouches) {
                    const x = t.clientX, y = t.clientY;
                    if (x < 150 && y > 400) {
                        this.joystick.active = true;
                        this.joystick.startX = x;
                        this.joystick.startY = y;
                    }
                }
            }, { passive: false });
            el.addEventListener('touchmove', e => {
                e.preventDefault();
                for (const t of e.changedTouches) {
                    if (this.joystick.active) {
                        const dx = t.clientX - this.joystick.startX;
                        const dy = t.clientY - this.joystick.startY;
                        const len = Math.sqrt(dx*dx+dy*dy);
                        const max = 50;
                        this.joystick.dx = len > max ? dx/len : dx/max;
                        this.joystick.dy = len > max ? dy/len : dy/max;
                    }
                }
            }, { passive: false });
            el.addEventListener('touchend', () => {
                this.joystick.active = false;
                this.joystick.dx = 0;
                this.joystick.dy = 0;
            });
        };
        addTouch(this.canvas);
    },

    _onKeyPress(code, e) {
        if (this.state === STATES.PLAYING) {
            if (code === 'Escape') { this.state = STATES.PAUSED; return; }
            if (this.player && this.player.abilities) {
                if (code === 'KeyJ' && this.player.abilities[0]) this.player.abilities[0].use(this);
                if (code === 'KeyK' && this.player.abilities[1]) this.player.abilities[1].use(this);
                if (code === 'KeyL' && this.player.abilities[2]) this.player.abilities[2].use(this);
                if (code === 'KeyU' && this.player.abilities[3]) this.player.abilities[3].use(this);
                if (code === 'KeyI' && this.player.abilities[4]) this.player.abilities[4].use(this);
            }
        } else if (this.state === STATES.PAUSED) {
            if (code === 'Escape') { this.state = STATES.PLAYING; }
        } else if (this.state === STATES.LEVELUP) {
            if (code === 'Digit1') this._selectUpgrade(0);
            if (code === 'Digit2') this._selectUpgrade(1);
            if (code === 'Digit3') this._selectUpgrade(2);
        } else if (this.state === STATES.CLASS_COLLECTION || this.state === STATES.CLASS_ROLL) {
            if (code === 'Escape') { this.state = STATES.CLASS_SELECT; }
        } else if (this.state === STATES.DUNGEON_SELECT) {
            if (code === 'Escape') { this.state = STATES.MENU; }
        } else if (this.state === STATES.SETTINGS) {
            if (code === 'Escape') { this.state = STATES.MENU; }
        }
    },

    _updateHover() {
        const mx = this.mouse.x, my = this.mouse.y;
        if (this.state === STATES.MENU) {
            const btns = [
                { id:'play', y:245 }, { id:'shop', y:300 }, { id:'help', y:355 }, { id:'settings', y:410 }
            ];
            this.hoverBtn = null;
            for (const b of btns) {
                if (mx >= 260 && mx <= 540 && my >= b.y && my <= b.y + 44) { this.hoverBtn = b.id; break; }
            }
        } else if (this.state === STATES.DUNGEON_SELECT) {
            this.hoverDungeon = null;
            const ids = ['dungeon1', 'dungeon2'];
            ids.forEach((id, i) => {
                const x = 130 + i * 280, y = 170;
                if (mx >= x && mx <= x + 240 && my >= y && my <= y + 300) this.hoverDungeon = id;
            });
        } else if (this.state === STATES.CLASS_SELECT) {
            // Hover on unlocked class cards
            this.hoverClass = null;
            const unlocked = this.saveData.unlockedClasses || ['human_adventurer'];
            const perRow = Math.min(unlocked.length, 4);
            const cardW = 160, cardH = 200, gapX = 20;
            const totalW = perRow * cardW + (perRow-1)*gapX;
            const startX = (800 - totalW) / 2;
            unlocked.forEach((id, i) => {
                const col = i % perRow, row = Math.floor(i / perRow);
                const cx = startX + col*(cardW+gapX), cy = 100 + row*220;
                if (mx >= cx && mx <= cx+cardW && my >= cy && my <= cy+cardH) this.hoverClass = id;
            });
        } else if (this.state === STATES.LEVELUP) {
            const choices = this.upgradeChoices;
            const cardW = 180;
            const totalW = choices.length * cardW + (choices.length-1)*20;
            const startX = (800 - totalW) / 2;
            this.hoverCard = -1;
            choices.forEach((_, i) => {
                const x = startX + i * (cardW+20);
                if (mx >= x && mx <= x+cardW && my >= 160 && my <= 390) this.hoverCard = i;
            });
            UI._hoveredCard = this.hoverCard;
        } else if (this.state === STATES.SHOP) {
            this.hoverShopItem = -1;
            PERMANENT_UPGRADES.forEach((_, i) => {
                const col = i % 3, row = Math.floor(i/3);
                const x = 130 + col*220, y = 100 + row*160;
                if (mx >= x && mx <= x+200 && my >= y && my <= y+140) this.hoverShopItem = i;
            });
        }
    },

    _onClick(mx, my) {
        if (this.state === STATES.MENU) {
            const btns = [
                { id:'play', y:245 }, { id:'shop', y:300 }, { id:'help', y:355 }, { id:'settings', y:410 }
            ];
            for (const b of btns) {
                if (mx >= 260 && mx <= 540 && my >= b.y && my <= b.y + 44) {
                    if (b.id === 'play')  this.state = STATES.DUNGEON_SELECT;
                    if (b.id === 'shop')  this.state = STATES.SHOP;
                    if (b.id === 'help')  this.state = STATES.HELP;
                    if (b.id === 'settings') this.state = STATES.SETTINGS;
                    return;
                }
            }
        } else if (this.state === STATES.DUNGEON_SELECT) {
            if (my >= 525 && mx >= 20 && mx <= 160) { this.state = STATES.MENU; return; }
            const ids = ['dungeon1', 'dungeon2'];
            for (let i = 0; i < ids.length; i++) {
                const id = ids[i];
                const x = 130 + i * 280, y = 170, w = 240, h = 300;
                if (mx >= x && mx <= x + w && my >= y && my <= y + h) {
                    const unlocked = (this.saveData.unlockedDungeons || ['dungeon1']).includes(id);
                    if (!unlocked) return;
                    this.saveData.selectedDungeon = id;
                    this.currentDungeonId = id;
                    this.currentDungeon = DUNGEON_DEFS[id] || DUNGEON_DEFS.dungeon1;
                    SaveSystem.save(this.saveData);
                    this.state = STATES.CLASS_SELECT;
                    return;
                }
            }
        } else if (this.state === STATES.CLASS_SELECT) {
            // Back button
            if (my >= 555 && mx >= 20 && mx <= 160) { this.state = STATES.DUNGEON_SELECT; return; }
            // Roll button
            if (mx >= 600 && mx <= 780 && my >= 530 && my <= 565) { this.state = STATES.CLASS_ROLL; return; }
            // Collection button
            if (mx >= 600 && mx <= 780 && my >= 490 && my <= 525) { this.state = STATES.CLASS_COLLECTION; return; }
            // Click a class card to play
            const unlocked = this.saveData.unlockedClasses || ['human_adventurer'];
            const perRow = Math.min(unlocked.length, 4);
            const cardW = 160, cardH = 200, gapX = 20;
            const totalW = perRow * cardW + (perRow-1)*gapX;
            const startX = (800 - totalW) / 2;
            unlocked.forEach((id, i) => {
                const col = i % perRow, row = Math.floor(i / perRow);
                const cx = startX + col*(cardW+gapX), cy = 100 + row*220;
                if (mx >= cx && mx <= cx+cardW && my >= cy && my <= cy+cardH) {
                    this.saveData.selectedClass = id;
                    SaveSystem.save(this.saveData);
                    this._updateControlHintText(id);
                    this._startRun(id, this.currentDungeonId || this.saveData.selectedDungeon || 'dungeon1');
                }
            });
        } else if (this.state === STATES.CLASS_COLLECTION) {
            // Back button (bottom centre or bottom bar)
            if (my >= 555) { this.state = STATES.CLASS_SELECT; return; }
        } else if (this.state === STATES.CLASS_ROLL) {
            if (my >= 555) { this.state = STATES.CLASS_SELECT; return; }
            // Roll button
            if (mx >= 300 && mx <= 500 && my >= 430 && my <= 470) {
                this._doRoll();
            }
        } else if (this.state === STATES.LEVELUP) {
            const choices = this.upgradeChoices;
            const cardW = 180;
            const totalW = choices.length * cardW + (choices.length-1)*20;
            const startX = (800 - totalW) / 2;
            choices.forEach((_, i) => {
                const x = startX + i*(cardW+20);
                if (mx >= x && mx <= x+cardW && my >= 160 && my <= 390) this._selectUpgrade(i);
            });
        } else if (this.state === STATES.GAMEOVER) {
            if (my >= 390 && my <= 430 && mx >= 290 && mx <= 510) { this.state = STATES.CLASS_SELECT; }
            if (my >= 450 && my <= 490 && mx >= 290 && mx <= 510) { this.state = STATES.MENU; }
        } else if (this.state === STATES.VICTORY) {
            if (my >= 390 && my <= 430 && mx >= 290 && mx <= 510) { this.state = STATES.SHOP; }
            if (my >= 450 && my <= 490 && mx >= 290 && mx <= 510) { this.state = STATES.MENU; }
        } else if (this.state === STATES.SHOP) {
            if (my >= 560) { this.state = STATES.MENU; return; }
            PERMANENT_UPGRADES.forEach((pu, i) => {
                const col = i % 3, row = Math.floor(i/3);
                const x = 130 + col*220, y = 100 + row*160;
                if (mx >= x+50 && mx <= x+150 && my >= y+100 && my <= y+128) {
                    this._buyPermanentUpgrade(pu, i);
                }
            });
        } else if (this.state === STATES.PAUSED) {
            if (my >= 410 && my <= 450 && mx >= 290 && mx <= 510) { this.state = STATES.PLAYING; }
            if (my >= 465 && my <= 505 && mx >= 290 && mx <= 510) { this.state = STATES.MENU; }
        } else if (this.state === STATES.HELP) {
            if (my >= 540 && mx >= 290 && mx <= 510) { this.state = STATES.MENU; }
        } else if (this.state === STATES.SETTINGS) {
            if (my >= 300 && my <= 340 && mx >= 290 && mx <= 510) {
                if (window.confirm('Delete all save data? This cannot be undone.')) {
                    this.saveData = SaveSystem.reset();
                    this._updateControlHintText();
                    this.state = STATES.MENU;
                }
                return;
            }
            if (my >= 360 && my <= 400 && mx >= 290 && mx <= 510) { this.state = STATES.MENU; }
        }
    },

    _doRoll() {
        if (this.rollAnimActive) return;
        const cost = this.saveData.rollCost || 10;
        if (!this.spendCrystals(cost, 'class_roll_cost')) return; // can't afford
        this.saveData.rollCount = (this.saveData.rollCount || 0) + 1;
        // Scale cost: +3 per roll, cap at 50
        this.saveData.rollCost = Math.min(50, cost + 3);

        const result = (typeof ClassSystem !== 'undefined') ? ClassSystem.roll() : { id: 'human_adventurer' };
        const unlocked = this.saveData.unlockedClasses || ['human_adventurer'];
        const isDuplicate = unlocked.includes(result.id);

        if (!isDuplicate) {
            this.saveData.unlockedClasses = [...unlocked, result.id];
        } else {
            // Duplicate: award crystals
            this.saveData.classShards = this.saveData.classShards || {};
            this.saveData.classShards[result.id] = (this.saveData.classShards[result.id] || 0) + 1;
            const shardsBonus = { common:2, rare:4, epic:8, legendary:12, mythic:20 }[result.rarity] || 2;
            this.addCrystals(shardsBonus, `class_roll_duplicate_${result.id}`, { countForRun: false });
        }

        SaveSystem.save(this.saveData);

        // Trigger roll animation
        this.rollAnimActive = true;
        this.rollAnimTimer = 0;
        this.rollAnimResult = { ...result, isDuplicate };
        this.rollAnimPhase = 'spinning';
    },

    _startRun(playerClass, dungeonId) {
        this.currentDungeonId = (dungeonId && DUNGEON_DEFS[dungeonId]) ? dungeonId : 'dungeon1';
        this.currentDungeon = DUNGEON_DEFS[this.currentDungeonId] || DUNGEON_DEFS.dungeon1;
        this.saveData.selectedDungeon = this.currentDungeonId;
        this.player = new Player(playerClass);
        this.coins = 0;
        this.killCount = 0;
        this.runCrystalsEarned = 0;
        this.startingCrystals = this.crystals || 0;
        this.crystalTransactions = [];
        this.isRunActive = true;
        this.projectiles = [];
        this.particles = [];
        this.damageNumbers = [];
        this.allies = [];
        this.claimedRoomCrystalRewards = new Set();

        // Apply permanent upgrades
        UpgradeSystem.applyPermanent(this.player, this.saveData);

        // Generate rooms
        this.rooms = generateRooms(this.currentDungeon.totalRooms, this.currentDungeonId);
        this.roomIndex = 0;
        this._loadRoom(0);

        this.saveData.totalRuns = (this.saveData.totalRuns || 0) + 1;
        SaveSystem.save(this.saveData);

        this.state = STATES.PLAYING;
    },

    _loadRoom(idx) {
        this.roomIndex = idx;
        this.currentRoom = this.rooms[idx];
        this.player.x = 80;
        this.player.y = 300;
        this.projectiles = [];
        this.particles = [];
        this._transitionInProgress = false;

        // Scale factor increases with room index
        const dungeon = this.currentDungeon || DUNGEON_DEFS.dungeon1;
        this.scaleFactor = 1 + idx * (dungeon.enemyScalePerRoom || 0.18);

        const roomNumber = idx + 1;
        const bossType = dungeon.roomBosses && dungeon.roomBosses[roomNumber];
        const isTreasureRoom = Array.isArray(dungeon.treasureRooms) && dungeon.treasureRooms.includes(roomNumber);
        if (bossType) {
            this.enemies = [createEnemy(bossType, 500, 300)];
        } else if (isTreasureRoom || this.currentRoom.roomType === 'treasure_vault') {
            // Treasure/rest room: no enemies
            this.enemies = [];
            this.currentRoom.doorOpen = true;
            this.currentRoom.openDoor();
        } else {
            this.enemies = this.currentRoom.spawnEnemies(idx, this.scaleFactor, this.player.x, this.player.y);
        }

        console.log(`[PixelDungeon] Room ${idx + 1} start — enemies: ${this.enemies.length}`);
    },

    _nextRoom() {
        if (this._transitionInProgress) return;
        this._transitionInProgress = true;
        this.awardRoomClearCrystals(this.roomIndex);
        const nextIdx = this.roomIndex + 1;
        if (nextIdx >= this.rooms.length) {
            this.victory();
            return;
        }
        console.log(`[PixelDungeon] Room ${this.roomIndex + 1} cleared — transitioning to room ${nextIdx + 1}`);
        this._loadRoom(nextIdx);
    },

    triggerLevelUp() {
        const prevState = this.state;
        this.upgradeChoices = UpgradeSystem.roll(this.player, 3);
        this.state = STATES.LEVELUP;
        this.hoverCard = -1;
        UI._hoveredCard = -1;
    },

    _selectUpgrade(i) {
        if (i >= 0 && i < this.upgradeChoices.length) {
            this.upgradeChoices[i].apply(this.player);
            this.state = STATES.PLAYING;
        }
    },

    _buyPermanentUpgrade(pu, i) {
        const rank = this.saveData.permanentUpgrades[pu.id] || 0;
        const cost = UpgradeSystem.permanentCost(pu, rank);
        if (rank < pu.maxRank && this.spendCrystals(cost, `shop_upgrade_${pu.id}`)) {
            this.saveData.permanentUpgrades[pu.id] = rank + 1;
            SaveSystem.save(this.saveData);
        }
    },

    _updateControlHintText(classId) {
        const infoEl = document.getElementById('info');
        if (!infoEl) return;

        const activeClassId = classId || (this.saveData && this.saveData.selectedClass) || 'human_adventurer';
        let abilityCount = DEFAULT_ABILITY_KEY_COUNT;
        if (typeof ClassSystem !== 'undefined') {
            const classDef = ClassSystem.get(activeClassId) || ClassSystem.get('human_adventurer');
            if (classDef && Array.isArray(classDef.abilityIds)) {
                abilityCount = classDef.abilityIds.length;
            }
        }
        abilityCount = Math.max(0, Math.min(5, abilityCount));
        const keyLabels = ABILITY_HINT_KEYS.slice(0, abilityCount).join(' ');
        infoEl.textContent = `WASD/Arrows · ${keyLabels} Abilities · Click to interact`;
    },

    nearestEnemy(x, y, maxDist) {
        let best = null, bestDist = maxDist * maxDist;
        for (const e of this.enemies) {
            if (e.dead) continue;
            const dx = e.x - x, dy = e.y - y;
            const d2 = dx*dx + dy*dy;
            if (d2 < bestDist) { bestDist = d2; best = e; }
        }
        return best;
    },

    addDamageNumber(x, y, amount, color, options) {
        if (!Array.isArray(this.damageNumbers)) this.damageNumbers = [];

        const opts = (typeof options === 'boolean')
            ? { big: options }
            : ((options && typeof options === 'object') ? options : {});

        const safeX = Number.isFinite(x) ? x : 0;
        const safeY = Number.isFinite(y) ? y : 0;
        const safeAmount = Number.isFinite(amount) ? amount : 0;
        let role = null;
        if (opts.role === 'player' || opts.role === 'enemy') role = opts.role;
        const fallbackColor = role === 'player' ? '#ff4444' : '#ffcc44';

        this.damageNumbers.push({
            x: safeX + (Math.random()-0.5)*20,
            y: safeY,
            text: (opts.text != null ? String(opts.text) : Math.ceil(safeAmount).toString()),
            color: color || opts.color || fallbackColor,
            life: 0,
            maxLife: Number.isFinite(opts.maxLife) ? Math.max(0.1, opts.maxLife) : 1.1,
            big: !!opts.big
        });
    },

    addCrystals(amount, reason, options = {}) {
        amount = Math.max(0, Math.floor(amount || 0));
        if (amount <= 0) return false;

        const countForRun = options.countForRun !== false;
        this.crystals = (this.crystals || 0) + amount;
        this.saveData.crystals = this.crystals;

        if (this.isRunActive && countForRun) {
            this.runCrystalsEarned = (this.runCrystalsEarned || 0) + amount;
        }

        const tx = {
            amount,
            reason: reason || 'unknown',
            roomNumber: this.isRunActive ? (this.roomIndex + 1) : null,
            totalAfter: this.crystals,
            runEarnedAfter: this.runCrystalsEarned || 0,
            timestamp: new Date().toISOString()
        };
        if (!Array.isArray(this.crystalTransactions)) this.crystalTransactions = [];
        this.crystalTransactions.push(tx);

        SaveSystem.save(this.saveData);
        console.log(`[PixelDungeon] +${amount} crystals (${tx.reason}). Run earned: ${tx.runEarnedAfter}, Total: ${this.crystals}`);
        return true;
    },

    spendCrystals(amount, reason) {
        amount = Math.max(0, Math.floor(amount || 0));
        if (amount <= 0) return true;
        if ((this.crystals || 0) < amount) return false;

        this.crystals -= amount;
        this.saveData.crystals = this.crystals;
        SaveSystem.save(this.saveData);
        console.log(`[PixelDungeon] -${amount} crystals (${reason || 'unknown'}). Total: ${this.crystals}`);
        return true;
    },

    _finalizeRunCrystalAccounting(outcome) {
        const actualDelta = (this.crystals || 0) - (this.startingCrystals || 0);
        if (actualDelta !== (this.runCrystalsEarned || 0)) {
            console.warn('[PixelDungeon] Crystal accounting mismatch detected: run-earned crystals do not match actual crystal delta', {
                outcome,
                startingCrystals: this.startingCrystals || 0,
                currentCrystals: this.crystals || 0,
                actualDelta,
                runCrystalsEarned: this.runCrystalsEarned || 0,
                transactions: this.crystalTransactions || []
            });
        }
        if (Array.isArray(this.crystalTransactions) && this.crystalTransactions.length > 0) {
            console.table(this.crystalTransactions);
        }
        this.isRunActive = false;
    },

    awardRoomClearCrystals(roomIndex) {
        if (!Number.isInteger(roomIndex)) return;
        if (this.claimedRoomCrystalRewards.has(roomIndex)) return;

        const dungeon = this.currentDungeon || DUNGEON_DEFS.dungeon1;
        let amount = dungeon.crystalPerRoom || 1;
        const crystalFinderLevel = (this.saveData && this.saveData.permanentUpgrades && this.saveData.permanentUpgrades.p_crystal) || 0;
        // Keep this capped for forward compatibility if Crystal Finder max rank increases later.
        const bonusChance = Math.min(1, crystalFinderLevel * CRYSTAL_FINDER_BONUS_CHANCE_PER_LEVEL);

        if (Math.random() < bonusChance) {
            amount += 1;
            if (this.player) {
                this.addDamageNumber(this.player.x, this.player.y - 30, 0, '#a855f7', { text: 'Crystal Finder +1' });
            }
        }

        this.addCrystals(amount, `room_clear_${roomIndex + 1}`);

        if (this.player) {
            this.addDamageNumber(
                this.player.x,
                this.player.y - 50,
                0,
                '#c084fc',
                { text: `+${amount} crystal${amount > 1 ? 's' : ''}` }
            );
        }

        this.claimedRoomCrystalRewards.add(roomIndex);
    },

    gameOver() {
        const dungeon = this.currentDungeon || DUNGEON_DEFS.dungeon1;
        // Update best run
        if (this.roomIndex + 1 > this.saveData.bestRun.floor) {
            this.saveData.bestRun = { floor: this.roomIndex + 1, kills: this.killCount, crystals: this.runCrystalsEarned || 0 };
        }
        this.saveData.bestRunsByDungeon = this.saveData.bestRunsByDungeon || {};
        const existing = this.saveData.bestRunsByDungeon[dungeon.id];
        if (!existing || (this.roomIndex + 1) > (existing.floor || 0)) {
            this.saveData.bestRunsByDungeon[dungeon.id] = { floor: this.roomIndex + 1, kills: this.killCount, crystals: this.runCrystalsEarned || 0 };
        }
        SaveSystem.save(this.saveData);
        this._finalizeRunCrystalAccounting('game_over');
        this.state = STATES.GAMEOVER;
    },

    victory() {
        const dungeon = this.currentDungeon || DUNGEON_DEFS.dungeon1;
        const bonusCrystals = Math.floor(
            ((dungeon.victoryBaseCrystals || 5) + Math.floor(this.killCount / (dungeon.victoryKillDivisor || 10)))
            * (dungeon.victoryMultiplier || 1)
        );
        this.addCrystals(bonusCrystals, 'victory_bonus');
        this.saveData.bestRun = { floor: this.rooms.length, kills: this.killCount, crystals: this.runCrystalsEarned || 0 };
        this.saveData.bestRunsByDungeon = this.saveData.bestRunsByDungeon || {};
        this.saveData.bestRunsByDungeon[dungeon.id] = this.saveData.bestRun;
        this.saveData.dungeonClears = this.saveData.dungeonClears || {};
        this.saveData.dungeonClears[dungeon.id] = (this.saveData.dungeonClears[dungeon.id] || 0) + 1;
        if (dungeon.id === 'dungeon1') {
            this.saveData.unlockedDungeons = this.saveData.unlockedDungeons || ['dungeon1'];
            if (!this.saveData.unlockedDungeons.includes('dungeon2')) this.saveData.unlockedDungeons.push('dungeon2');
        }
        SaveSystem.save(this.saveData);
        this._finalizeRunCrystalAccounting('victory');
        this.state = STATES.VICTORY;
    },

    _loop(timestamp) {
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
        this.lastTime = timestamp;

        try {
            this._update(dt);
            this._render();
        } catch (err) {
            console.error('[PixelDungeon] Loop error:', err);
            this._fatalError = String(err);
            // Render error overlay so the player sees what happened
            try { this._renderErrorOverlay(); } catch (_) {}
        }

        requestAnimationFrame(t => this._loop(t));
    },

    _update(dt) {
        // Update roll animation regardless of state
        if (this.rollAnimActive) {
            this.rollAnimTimer += dt;
            if (this.rollAnimPhase === 'spinning' && this.rollAnimTimer >= 1.5) {
                this.rollAnimPhase = 'reveal';
            }
            if (this.rollAnimPhase === 'reveal' && this.rollAnimTimer >= 3.5) {
                this.rollAnimActive = false;
                this.rollAnimPhase = 'idle';
            }
        }

        if (this.state !== STATES.PLAYING) return;

        const p = this.player;
        const room = this.currentRoom;

        // Player
        p.update(dt, this);
        if (this.currentRoom && typeof this.currentRoom.update === 'function') this.currentRoom.update(dt, this);

        // Enemies
        for (const e of this.enemies) {
            if (!e.dead) e.update(dt, p, this);
        }

        // Allies (minions)
        if (!this.allies) this.allies = [];
        for (const a of this.allies) {
            if (!a.dead) a.update(dt, this);
        }
        this.allies = this.allies.filter(a => !a.dead);

        // Projectiles
        for (const pr of this.projectiles) {
            pr.update(dt);
            if (pr.dead) continue;

            if (pr.owner === 'player') {
                // Check hit on enemies
                for (const e of this.enemies) {
                    if (e.dead) continue;
                    if (pr.distanceTo(e.x, e.y) < e.size + pr.size * 0.5) {
                        const dmg = pr.damage;
                        e.takeDamage(dmg, 'physical', this);
                        if (pr.onHit) pr.onHit(e, this);
                        // Knockback
                        e.knockback(pr.x - pr._vx*dt*2, pr.y - pr._vy*dt*2, 80);
                        // Life steal
                        if (p.lifeSteal > 0) p.hp = Math.min(p.maxHp, p.hp + dmg*p.lifeSteal);
                        // Thorns
                        if (p.thorns > 0) {
                            // Reflected as xp-worthy damage number
                        }
                        pr.dead = true;
                        if (e.dead) {
                            if (typeof e.onDeath === 'function') e.onDeath(this);
                            if (e.type === 'corrupted_slime' && Math.random() < 0.45) {
                                for (let si = 0; si < 2; si++) {
                                    this.enemies.push(createEnemy('corrupted_slimelet', e.x + (Math.random() - 0.5) * 28, e.y + (Math.random() - 0.5) * 28));
                                }
                            }
                            if (e.isBoss && this.currentDungeonId === 'dungeon2') {
                                const bossCrystalBonus = e.type === 'boss_crystal_behemoth' ? 6 : 14;
                                this.addCrystals(bossCrystalBonus, `boss_bonus_${e.type}`);
                                this.addDamageNumber(e.x, e.y - 70, 0, '#d7a7ff', { text: `+${bossCrystalBonus} boss crystals`, big: true });
                            }
                            this.killCount++;
                            const dungeon = this.currentDungeon || DUNGEON_DEFS.dungeon1;
                            p.gainXp(Math.floor((e.xpReward || 0) * (dungeon.xpMultiplier || 1)), this);
                            this.coins += Math.floor((e.coinReward || 0) * (dungeon.coinMultiplier || 1));
                            // Crystal drop
                            if (Math.random() < 0.08 + (e.crystalChance || 0) + (dungeon.crystalDropBonus || 0)) {
                                this.addCrystals(1, 'enemy_crystal_drop');
                                this.addDamageNumber(e.x, e.y-50, 1, '#cc88ff');
                            }
                            spawnExplosion(this.particles, e.x, e.y, 8, ['#ffcc44','#ff8844','#ffffff'], 80, 4);
                        }
                        break;
                    }
                }
            } else if (pr.owner === 'enemy') {
                // Check hit on player
                if (!p.invincible && pr.distanceTo(p.x, p.y) < 24 + pr.size * 0.5) {
                    p.takeDamage(pr.damage, this);
                    pr.dead = true;
                }
            }

            // Wall collision
            if (room && room.isWall(pr.x, pr.y)) {
                pr.dead = true;
                spawnExplosion(this.particles, pr.x, pr.y, 4, ['#888888'], 60, 3);
            }
        }

        // Particles & damage numbers
        for (const pt of this.particles) pt.update(dt);
        if (!Array.isArray(this.damageNumbers)) this.damageNumbers = [];
        for (const dn of this.damageNumbers) {
            dn.life += dt;
            dn.y -= 40 * dt;
        }

        // Decay screen shake
        if (this.screenShake > 0) this.screenShake = Math.max(0, this.screenShake - dt * 2.5);

        // Cleanup dead — filter after iterating to avoid mid-loop removal
        this.enemies    = this.enemies.filter(e => !e.dead || e.isBoss);
        this.projectiles = this.projectiles.filter(p => !p.dead);
        this.particles   = this.particles.filter(p => !p.dead);
        this.damageNumbers = this.damageNumbers.filter(d => d.life < d.maxLife);

        // Remove truly dead boss
        this.enemies = this.enemies.filter(e => !(e.isBoss && e.dead));

        // Hard caps to prevent unbounded array growth
        const MAX_ENEMIES = 40;
        const MAX_PROJECTILES = 300;
        const MAX_PARTICLES = 600;
        if (this.enemies.length > MAX_ENEMIES) {
            // First pass: remove excess non-boss, non-elite enemies
            const toRemove = this.enemies.length - MAX_ENEMIES;
            let removed = 0;
            this.enemies = this.enemies.filter(e => {
                if (removed < toRemove && !e.isBoss && !e.isElite) { removed++; return false; }
                return true;
            });
            // Fallback: if cap still exceeded (e.g. all are elite/boss), trim from the end
            if (this.enemies.length > MAX_ENEMIES) this.enemies.length = MAX_ENEMIES;
        }
        if (this.projectiles.length > MAX_PROJECTILES) this.projectiles.length = MAX_PROJECTILES;
        if (this.particles.length > MAX_PARTICLES)    this.particles.length = MAX_PARTICLES;

        // Check room cleared
        const aliveEnemies = this.enemies.filter(e => !e.dead);
        if (aliveEnemies.length === 0 && !this.currentRoom.cleared) {
            this.currentRoom.cleared = true;
            this.currentRoom.openDoor();
            // Bonus coin drop
            const dungeon = this.currentDungeon || DUNGEON_DEFS.dungeon1;
            this.coins += Math.floor((1 + Math.floor(this.roomIndex * 0.5)) * (dungeon.coinMultiplier || 1));
        }

        // Check portal entry
        const portal = this.currentRoom.portal;
        if (portal && portal.active) {
            const dx = p.x - portal.x, dy = p.y - portal.y;
            if (dx*dx + dy*dy < 900) {
                portal.active = false;
                this._nextRoom();
            }
        }

        // Chest interaction
        for (const ch of this.currentRoom.chests) {
            if (!ch.open) {
                const dx = p.x - ch.x, dy = p.y - ch.y;
                if (dx*dx + dy*dy < 1600) {
                    ch.open = true;
                    // Random reward
                    const roll = Math.random();
                    if (roll < 0.4) {
                        p.hp = Math.min(p.maxHp, p.hp + 25);
                        this.addDamageNumber(ch.x, ch.y - 30, 25, '#44ff88');
                    } else if (roll < 0.7) {
                        const dungeon = this.currentDungeon || DUNGEON_DEFS.dungeon1;
                        this.coins += Math.floor((3 + Math.floor(Math.random() * 4)) * (dungeon.coinMultiplier || 1));
                    } else {
                        const dungeon = this.currentDungeon || DUNGEON_DEFS.dungeon1;
                        const crystalAmount = dungeon.id === 'dungeon2' ? 2 : 1;
                        this.addCrystals(crystalAmount, 'chest_crystal_reward');
                        this.addDamageNumber(ch.x, ch.y - 30, crystalAmount, '#cc88ff');
                    }
                    spawnExplosion(this.particles, ch.x, ch.y, 12, ['#ffcc44','#ffffff'], 100, 5);
                }
            }
        }

        // Spider attack: poison player on contact
        for (const e of this.enemies) {
            if (e.dead || e.type !== 'spider') continue;
            const dx = e.x - p.x, dy = e.y - p.y;
            if (dx*dx + dy*dy < (e.size + 24)*(e.size + 24)) {
                if (Math.random() < dt * 0.5) p.applyEffect('poison');
            }
        }
    },

    _render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, 800, 600);

        // Screen shake
        if (this.screenShake > 0) {
            ctx.save();
            ctx.translate(
                (Math.random()-0.5) * this.screenShake * 10,
                (Math.random()-0.5) * this.screenShake * 10
            );
        }

        switch (this.state) {
            case STATES.LOADING:
                UI.renderLoading(ctx, Assets.progress());
                break;
            case STATES.MENU:
                UI.renderMenu(ctx, this.saveData, this.hoverBtn);
                break;
            case STATES.DUNGEON_SELECT:
                UI.renderDungeonSelect(ctx, this.saveData, this.hoverDungeon, DUNGEON_DEFS);
                break;
            case STATES.CLASS_SELECT:
                UI.renderClassSelect(ctx, this.saveData, this.hoverClass, this.currentDungeon || DUNGEON_DEFS.dungeon1);
                break;
            case STATES.CLASS_COLLECTION:
                UI.renderClassCollection(ctx, this.saveData);
                break;
            case STATES.CLASS_ROLL:
                UI.renderClassRoll(ctx, this.saveData, this.rollAnimActive, this.rollAnimPhase, this.rollAnimResult, this.rollAnimTimer);
                break;
            case STATES.HELP:
                UI.renderHelp(ctx);
                break;
            case STATES.PLAYING:
            case STATES.LEVELUP:
            case STATES.PAUSED:
                this._renderGame(ctx);
                if (this.state === STATES.LEVELUP) UI.renderLevelUp(ctx, this.upgradeChoices);
                if (this.state === STATES.PAUSED)   UI.renderPause(ctx);
                break;
            case STATES.GAMEOVER:
                this._renderGame(ctx);
                UI.renderGameOver(ctx, this);
                break;
            case STATES.VICTORY:
                UI.renderVictory(ctx, this);
                break;
            case STATES.SHOP:
                UI.renderShop(ctx, this.saveData, this.hoverShopItem);
                break;
            case STATES.SETTINGS:
                UI.renderSettings(ctx, this.saveData);
                break;
        }

        if (this.screenShake > 0) ctx.restore();

        // Error overlay (shown on top of everything)
        if (this._fatalError) this._renderErrorOverlay();
    },

    _renderGame(ctx) {
        // Room tiles
        if (this.currentRoom) this.currentRoom.render(ctx);

        // Particles (behind entities)
        for (const pt of this.particles) pt.render(ctx);

        // Enemies
        for (const e of this.enemies) if (!e.dead) e.render(ctx);

        // Allies (minions)
        if (this.allies) for (const a of this.allies) if (!a.dead) a.render(ctx);

        // Player
        if (this.player) this.player.render(ctx);

        // Projectiles
        for (const pr of this.projectiles) if (!pr.dead) pr.render(ctx);

        // Damage numbers
        UI.renderDamageNumbers(ctx, this.damageNumbers);

        // HUD
        if (this.player) UI.renderHUD(ctx, this);

        // Mobile controls
        if (this.isMobile) UI.renderMobileControls(ctx, this.joystick);
    },

    _renderErrorOverlay() {
        const ctx = this.ctx;
        if (!ctx || !this._fatalError) return;
        ctx.fillStyle = 'rgba(0,0,0,0.82)';
        ctx.fillRect(0, 0, 800, 600);
        ctx.fillStyle = '#ff4444';
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('⚠ Runtime Error', 400, 220);
        ctx.fillStyle = '#cccccc';
        ctx.font = '13px monospace';
        // Word-wrap the error message
        const words = this._fatalError.split(' ');
        let line = '', ly = 265;
        for (const w of words) {
            if ((line + w).length > 60) {
                ctx.fillText(line.trim(), 400, ly);
                line = w + ' ';
                ly += 18;
            } else {
                line += w + ' ';
            }
        }
        if (line.trim()) ctx.fillText(line.trim(), 400, ly);
        ctx.fillStyle = '#887799';
        ctx.font = '13px monospace';
        ctx.fillText('Check the browser console for details.', 400, ly + 30);
        ctx.fillText('Refresh the page to restart.', 400, ly + 50);
        ctx.textAlign = 'left';
    }
};

window.addEventListener('load', () => { Game.init(); });
