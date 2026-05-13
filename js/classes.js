'use strict';

// ── Rarity system ─────────────────────────────────────────────────────────────

const RARITY = {
    COMMON:    'common',
    RARE:      'rare',
    EPIC:      'epic',
    LEGENDARY: 'legendary',
    MYTHIC:    'mythic',
};

const RARITY_COLORS = {
    common:    '#888888',
    rare:      '#4488ff',
    epic:      '#aa44cc',
    legendary: '#ffaa00',
    mythic:    '#cc2222',
};

const RARITY_WEIGHTS = { common: 60, rare: 25, epic: 10, legendary: 4, mythic: 1 };
const _TOTAL_RARITY_WEIGHT = Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0);

// ── Class definitions ─────────────────────────────────────────────────────────
// Each class:  id, name, rarity, stats, passiveDesc, description, abilityIds,
//              spriteKey, portraitKey, startUnlocked, applyPassive(player)

const CLASS_DEFS = {

    // ═════════════════ COMMON ═════════════════

    human_adventurer: {
        id: 'human_adventurer',
        name: 'Human Adventurer',
        rarity: 'common',
        tags: ['human', 'adventurer', 'balanced'],
        maxHp: 120, baseAtk: 14, moveSpeed: 220, range: 140,
        spriteKey: 'player_adventurer',
        portraitKey: 'portrait_adventurer',
        passiveDesc: '+10% movement speed',
        passiveIconKey: 'passive_adventurer',
        description: 'Balanced starter class. Simple, mobile, reliable.',
        abilityIds: ['quick_slash', 'dash_strike'],
        abilities: [
            {
                id: 'quick_slash',
                name: 'Quick Slash',
                type: 'active',
                tags: ['melee', 'damage', 'mobility'],
                upgradePool: ['quickSlashDamage', 'quickSlashRadius', 'quickSlashCooldown']
            },
            {
                id: 'dash_strike',
                name: 'Dash Strike',
                type: 'active',
                tags: ['dash', 'mobility', 'damage'],
                upgradePool: ['dashStrikeDistance', 'dashStrikeDamage', 'dashStrikeCooldown']
            }
        ],
        startUnlocked: true,
        applyPassive(player) {
            player.moveSpeedMult *= 1.1;
        }
    },

    fire_mage: {
        id: 'fire_mage',
        name: 'Fire Mage',
        rarity: 'common',
        tags: ['mage', 'fire', 'ranged'],
        maxHp: 80, baseAtk: 20, moveSpeed: 185, range: 200,
        spriteKey: 'player_fire_mage',
        portraitKey: 'portrait_fire_mage',
        passiveDesc: '+50% ability damage',
        passiveIconKey: 'passive_fire_mage',
        description: 'Fragile caster focused on burst damage and burn effects.',
        abilityIds: ['fireball_shot', 'flame_dash'],
        abilities: [
            {
                id: 'fireball_shot',
                name: 'Fireball',
                type: 'active',
                tags: ['fire', 'projectile', 'damage'],
                upgradePool: ['fireballShotDamage', 'fireballShotAoe']
            },
            {
                id: 'flame_dash',
                name: 'Flame Dash',
                type: 'active',
                tags: ['dash', 'mobility', 'fire'],
                upgradePool: ['flameDashTrailDuration']
            }
        ],
        startUnlocked: false,
        applyPassive(player) {
            player.abilityDmgMult = (player.abilityDmgMult || 1) * 1.5;
        }
    },

    ranger: {
        id: 'ranger',
        name: 'Ranger',
        rarity: 'common',
        tags: ['ranger', 'ranged', 'mobility'],
        maxHp: 90, baseAtk: 13, moveSpeed: 240, range: 260,
        spriteKey: 'player_ranger',
        portraitKey: 'portrait_ranger',
        passiveDesc: '+20% attack range',
        passiveIconKey: 'passive_ranger',
        description: 'Safe ranged class focused on positioning.',
        abilityIds: ['piercing_arrow', 'roll_dash'],
        abilities: [
            {
                id: 'piercing_arrow',
                name: 'Piercing Arrow',
                type: 'active',
                tags: ['ranged', 'projectile', 'damage'],
                upgradePool: ['piercingArrowDamage', 'piercingArrowPierce']
            },
            {
                id: 'roll_dash',
                name: 'Roll Dash',
                type: 'active',
                tags: ['dash', 'mobility'],
                upgradePool: ['rollDashCooldown']
            }
        ],
        startUnlocked: false,
        applyPassive(player) {
            player.range = Math.floor(player.range * 1.2);
        }
    },

    // ═════════════════ RARE ═════════════════

    frost_knight: {
        id: 'frost_knight',
        name: 'Frost Knight',
        rarity: 'rare',
        maxHp: 165, baseAtk: 12, moveSpeed: 180, range: 110,
        spriteKey: 'player_frost_knight',
        portraitKey: 'portrait_frost_knight',
        passiveDesc: 'Enemies hit are slowed briefly',
        passiveIconKey: 'passive_frost_knight',
        description: 'Tanky crowd-control fighter.',
        abilityIds: ['ice_slam', 'shield_dash', 'frost_armor'],
        startUnlocked: false,
        applyPassive(player) {
            player.onHitSlow = true;
        }
    },

    venom_rogue: {
        id: 'venom_rogue',
        name: 'Venom Rogue',
        rarity: 'rare',
        maxHp: 90, baseAtk: 11, moveSpeed: 285, range: 140,
        spriteKey: 'player_venom_rogue',
        portraitKey: 'portrait_venom_rogue',
        passiveDesc: 'Poison deals +100% damage',
        passiveIconKey: 'passive_venom_rogue',
        description: 'Fast assassin focused on poison damage over time.',
        abilityIds: ['toxic_daggers', 'shadow_dash', 'poison_cloud'],
        startUnlocked: false,
        applyPassive(player) {
            player.poisonDmgMult = 2.0;
        }
    },

    stormcaller: {
        id: 'stormcaller',
        name: 'Stormcaller',
        rarity: 'rare',
        maxHp: 85, baseAtk: 18, moveSpeed: 205, range: 200,
        spriteKey: 'player_stormcaller',
        portraitKey: 'portrait_stormcaller',
        passiveDesc: 'Lightning chains to +1 extra enemy',
        passiveIconKey: 'passive_stormcaller',
        description: 'Mobile mage with chain attacks.',
        abilityIds: ['chain_bolt', 'blink_dash', 'thunder_ring'],
        startUnlocked: false,
        applyPassive(player) {
            player.lightningChain = 1;
        }
    },

    // ═════════════════ EPIC ═════════════════

    necromancer: {
        id: 'necromancer',
        name: 'Necromancer',
        rarity: 'epic',
        maxHp: 95, baseAtk: 15, moveSpeed: 175, range: 180,
        spriteKey: 'player_necromancer',
        portraitKey: 'portrait_necromancer',
        passiveDesc: 'Summons gain +50% health and damage',
        passiveIconKey: 'passive_necromancer',
        description: 'Summoner class that overwhelms enemies with minions.',
        abilityIds: ['bone_spear', 'wraith_dash', 'raise_skeleton', 'soul_burst'],
        startUnlocked: false,
        applyPassive(player) {
            player.minionBuff = 1.5;
        }
    },

    gunslinger: {
        id: 'gunslinger',
        name: 'Gunslinger',
        rarity: 'epic',
        maxHp: 100, baseAtk: 14, moveSpeed: 230, range: 220,
        spriteKey: 'player_gunslinger',
        portraitKey: 'portrait_gunslinger',
        passiveDesc: 'Auto attacks fire 25% faster',
        passiveIconKey: 'passive_gunslinger',
        description: 'High-speed ranged DPS class.',
        abilityIds: ['revolver_shot', 'combat_roll', 'ricochet_bullet', 'bullet_storm'],
        startUnlocked: false,
        applyPassive(player) {
            player.atkSpeedMult = (player.atkSpeedMult || 1) * 1.25;
        }
    },

    paladin: {
        id: 'paladin',
        name: 'Paladin',
        rarity: 'epic',
        maxHp: 145, baseAtk: 13, moveSpeed: 185, range: 130,
        spriteKey: 'player_paladin',
        portraitKey: 'portrait_paladin',
        passiveDesc: 'Healing effects are 50% stronger',
        passiveIconKey: 'passive_paladin',
        description: 'Durable support/damage hybrid.',
        abilityIds: ['holy_strike', 'divine_dash', 'heal_wave', 'judgment_beam'],
        startUnlocked: false,
        applyPassive(player) {
            player.healingMult = 1.5;
        }
    },

    // ═════════════════ LEGENDARY ═════════════════

    dragon_knight: {
        id: 'dragon_knight',
        name: 'Dragon Knight',
        rarity: 'legendary',
        maxHp: 130, baseAtk: 16, moveSpeed: 195, range: 120,
        spriteKey: 'player_dragon_knight',
        portraitKey: 'portrait_dragon_knight',
        passiveDesc: 'Burn effects last twice as long',
        passiveIconKey: 'passive_dragon_knight',
        description: 'Aggressive area-damage warrior.',
        abilityIds: ['flame_claw', 'inferno_dash', 'dragon_breath', 'lava_eruption', 'meteor_crash'],
        startUnlocked: false,
        applyPassive(player) {
            player.burnDurationMult = 2.0;
        }
    },

    void_assassin: {
        id: 'void_assassin',
        name: 'Void Assassin',
        rarity: 'legendary',
        maxHp: 85, baseAtk: 18, moveSpeed: 305, range: 160,
        spriteKey: 'player_void_assassin',
        portraitKey: 'portrait_void_assassin',
        passiveDesc: 'Crits deal +150% damage',
        passiveIconKey: 'passive_void_assassin',
        description: 'Extremely mobile burst assassin.',
        abilityIds: ['void_slash', 'rift_dash', 'shadow_blades', 'phase_shift', 'void_collapse'],
        startUnlocked: false,
        applyPassive(player) {
            player.critDmgBonus = 1.5; // added on top of normal x2 crit
        }
    },

    // ═════════════════ MYTHIC ═════════════════

    chronomancer: {
        id: 'chronomancer',
        name: 'Chronomancer',
        rarity: 'mythic',
        maxHp: 100, baseAtk: 15, moveSpeed: 195, range: 190,
        spriteKey: 'player_chronomancer',
        portraitKey: 'portrait_chronomancer',
        passiveDesc: 'Time Fracture: CDR +30%, nearby slow -15%, auto-repeat every 12s',
        passiveIconKey: 'passive_chronomancer',
        description: 'Reality-bending class focused on cooldown manipulation and battlefield control.',
        abilityIds: ['time_bolt', 'warp_dash', 'rewind', 'time_stop', 'collapse'],
        startUnlocked: false,
        applyPassive(player) {
            player.abilityCooldownMult = (player.abilityCooldownMult || 1) * 0.7;
            player.chronoSlowAura = true;
            player.chronoRepeatTimer = 0;
            player.chronoRepeatInterval = 12;
        }
    },
};

// ── ClassSystem API ───────────────────────────────────────────────────────────

const ClassSystem = {
    get(id) { return CLASS_DEFS[id] || null; },

    all() { return Object.values(CLASS_DEFS); },

    allIds() { return Object.keys(CLASS_DEFS); },

    byRarity(rarity) {
        return Object.values(CLASS_DEFS).filter(c => c.rarity === rarity);
    },

    /** Roll a random class based on rarity weights */
    rollRandom() {
        let r = Math.random() * _TOTAL_RARITY_WEIGHT;
        let rarity = 'common';
        for (const [rar, w] of Object.entries(RARITY_WEIGHTS)) {
            r -= w;
            if (r <= 0) { rarity = rar; break; }
        }
        const candidates = Object.values(CLASS_DEFS).filter(c => c.rarity === rarity);
        if (candidates.length === 0) return Object.values(CLASS_DEFS)[0];
        return candidates[Math.floor(Math.random() * candidates.length)];
    },

    /** Alias used by Game._doRoll() */
    roll() { return this.rollRandom(); },

    /** Get rarity color */
    rarityColor(rarity) { return RARITY_COLORS[rarity] || '#ffffff'; },

    /** Crystal cost for a given roll count (0-indexed: first roll = 10) */
    rollCost(rollCount) {
        return Math.min(10 + rollCount * 3, 50);
    },

    /** Build an ability list for a player from class abilityIds */
    buildAbilities(player, classDef) {
        if (typeof ABILITY_REGISTRY === 'undefined') {
            console.error('[ClassSystem] ABILITY_REGISTRY not loaded');
            return [];
        }
        return classDef.abilityIds.map((id, idx) => {
            const Ctor = ABILITY_REGISTRY[id];
            if (!Ctor) {
                console.warn('[ClassSystem] Unknown ability id:', id);
                return null;
            }
            return new Ctor(player, idx);
        }).filter(Boolean);
    }
};
