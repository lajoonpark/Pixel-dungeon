'use strict';
const CARD_SHOP_RARITY_WEIGHTS = { common: 55, rare: 25, epic: 13, legendary: 5, mythic: 2 };
const CARD_SHOP_COSTS = { common: 50, rare: 120, epic: 300, legendary: 750, mythic: 1500 };

const STARTING_OWNED_CARD_IDS = [
    'damage', 'attackspeed', 'range', 'speed', 'maxhp',
    'quickSlashDamage', 'quickSlashRadius', 'quickSlashCooldown',
    'dashStrikeDistance', 'dashStrikeDamage', 'dashStrikeCooldown'
];

const DEFAULT_EQUIPPED_CARD_IDS = [...STARTING_OWNED_CARD_IDS];

const UPGRADES = [
    // Physical
    { id:'damage',       name:'+25% Attack Damage',    desc:'Deal 25% more damage with basic attacks.',  rarity:'common',  tags:['physical'], icon:'upgrade_damage', type:'generic', apply(p){ p.atkMult *= 1.25; } },
    { id:'attackspeed',  name:'+20% Attack Speed',     desc:'Attack 20% faster.',                        rarity:'common',  tags:['physical'], icon:'upgrade_attackspeed', type:'generic', apply(p){ p.atkSpeedMult *= 1.2; } },
    { id:'range',        name:'+30 Attack Range',      desc:'Reach enemies from further away.',           rarity:'common',  tags:['physical'], icon:'upgrade_range', type:'generic', apply(p){ p.range += 30; } },
    { id:'multishot',    name:'Multi-Shot',             desc:'Auto-attacks hit up to 2 targets.',         rarity:'rare',    tags:['physical'], icon:'upgrade_multishot', type:'generic', apply(p){ p.multiShot = Math.min((p.multiShot||1)+1, 3); } },
    { id:'critical',     name:'Critical Strike',        desc:'20% chance to deal double damage.',         rarity:'rare',    tags:['physical'], icon:'upgrade_critical', type:'generic', apply(p){ p.critChance = (p.critChance||0)+0.2; } },
    { id:'lifesteal',    name:'Life Steal',             desc:'Gain 8% of damage dealt as HP.',           rarity:'rare',    tags:['physical'], icon:'upgrade_lifesteal', type:'generic', apply(p){ p.lifeSteal = (p.lifeSteal||0)+0.08; } },
    { id:'thorns',       name:'Thorns',                 desc:'Reflect 15% of damage taken to attacker.', rarity:'rare',    tags:['physical'], icon:'upgrade_thorns', type:'generic', apply(p){ p.thorns = (p.thorns||0)+0.15; } },

    // Speed / Mobility
    { id:'speed',        name:'+15% Move Speed',       desc:'Move faster through the dungeon.',          rarity:'common',  tags:['mobility'], icon:'upgrade_speed', type:'generic', apply(p){ p.moveSpeedMult *= 1.15; } },
    { id:'dashcharge',   name:'Dash Charges +1',       desc:'Gain an extra Dash charge.',                rarity:'rare',    tags:['mobility','dash'], icon:'upgrade_dash', type:'generic', apply(p){ p.dashCharges = (p.dashCharges||2)+1; } },
    { id:'dashcdr',      name:'Dash Cooldown -25%',    desc:'Dash recharges 25% faster.',               rarity:'common',  tags:['mobility','dash'], icon:'upgrade_dash', type:'generic', apply(p){ p.abilityCooldownMult = (p.abilityCooldownMult||1)*0.75; } },

    // Human Adventurer - Quick Slash
    { id:'quickSlashDamage', name:'Sharpened Slash', desc:'Quick Slash deals +50% damage.', rarity:'common', tags:['ability','melee','damage'], icon:'icon_quick_slash', type:'ability', requiredAbilityId:'quick_slash', apply(p){ p.quickSlashDmgMult = (p.quickSlashDmgMult||1)*1.5; } },
    { id:'quickSlashRadius', name:'Wide Swing', desc:'Quick Slash arc radius is increased.', rarity:'common', tags:['ability','melee','aoe'], icon:'icon_quick_slash', type:'ability', requiredAbilityId:'quick_slash', apply(p){ p.quickSlashRadiusMult = (p.quickSlashRadiusMult||1)*1.35; } },
    { id:'quickSlashCooldown', name:'Quick Recovery', desc:'Quick Slash cooldown is reduced.', rarity:'rare', tags:['ability','melee','cooldown'], icon:'icon_quick_slash', type:'ability', requiredAbilityId:'quick_slash', apply(p){ p.quickSlashCDMult = (p.quickSlashCDMult||1)*0.75; } },

    // Human Adventurer - Dash Strike
    { id:'dashStrikeDistance', name:'Longer Lunge', desc:'Dash Strike travels farther.', rarity:'common', tags:['ability','dash','movement'], icon:'icon_dash_strike', type:'ability', requiredAbilityId:'dash_strike', apply(p){ p.dashStrikeDistanceMult = (p.dashStrikeDistanceMult||1)*1.30; } },
    { id:'dashStrikeDamage', name:'Impact Dash', desc:'Dash Strike deals +50% damage.', rarity:'rare', tags:['ability','dash','damage'], icon:'icon_dash_strike', type:'ability', requiredAbilityId:'dash_strike', apply(p){ p.dashStrikeDmgMult = (p.dashStrikeDmgMult||1)*1.5; } },
    { id:'dashStrikeCooldown', name:'Fast Footwork', desc:'Dash Strike cooldown is reduced.', rarity:'common', tags:['ability','dash','cooldown'], icon:'icon_dash_strike', type:'ability', requiredAbilityId:'dash_strike', apply(p){ p.dashStrikeCDMult = (p.dashStrikeCDMult||1)*0.75; } },

    // Fire Mage
    { id:'fireballShotDamage', name:'Fireball +50% Damage', desc:'Fireball deals significantly more damage.', rarity:'common', tags:['ability','fire','projectile'], icon:'upgrade_fireball', type:'ability', requiredAbilityId:'fireball_shot', apply(p){ p.fireballDmgMult = (p.fireballDmgMult||1)*1.5; } },
    { id:'fireballShotAoe', name:'Fireball +50% Explosion Radius', desc:'Fireball explosions hit a wider area.', rarity:'rare', tags:['ability','fire','aoe'], icon:'upgrade_fireball', type:'ability', requiredAbilityId:'fireball_shot', apply(p){ p.fireballAoeMult = (p.fireballAoeMult||1)*1.5; } },
    { id:'flameDashTrailDuration', name:'Lingering Flames', desc:'Flame Dash trail lasts longer.', rarity:'rare', tags:['ability','fire','dash'], icon:'icon_flame_dash', type:'ability', requiredAbilityId:'flame_dash', apply(p){ p.flameDashDurationMult = (p.flameDashDurationMult||1)*1.4; } },

    // Ranger
    { id:'piercingArrowDamage', name:'Piercing Arrow +50% Damage', desc:'Piercing Arrow hits much harder.', rarity:'common', tags:['ability','ranged','damage'], icon:'icon_piercing_arrow', type:'ability', requiredAbilityId:'piercing_arrow', apply(p){ p.piercingArrowDmgMult = (p.piercingArrowDmgMult||1)*1.5; } },
    { id:'piercingArrowPierce', name:'Deep Piercing', desc:'Piercing Arrow pierces +1 more enemy.', rarity:'rare', tags:['ability','ranged','pierce'], icon:'icon_piercing_arrow', type:'ability', requiredAbilityId:'piercing_arrow', apply(p){ p.piercingArrowExtraPierce = (p.piercingArrowExtraPierce||0)+1; } },
    { id:'rollDashCooldown', name:'Roll Dash Cooldown -30%', desc:'Roll Dash recharges faster.', rarity:'common', tags:['ability','dash','mobility'], icon:'icon_roll_dash', type:'ability', requiredAbilityId:'roll_dash', apply(p){ p.rollDashCDMult = (p.rollDashCDMult||1)*0.7; } },

    // Tag synergy (only appears if class/ability tags satisfy requirements)
    { id:'dashMomentum', name:'Dash Momentum', desc:'Gain move speed and faster ability cooldowns.', rarity:'rare', tags:['mobility','dash','synergy'], icon:'upgrade_dash', type:'synergy', requiredTags:['dash','mobility'], apply(p){ p.moveSpeedMult *= 1.08; p.abilityCooldownMult *= 0.92; } },

    // Survival
    { id:'maxhp',        name:'+25 Max HP',            desc:'Increase your maximum health.',             rarity:'common',  tags:['survival'], icon:'upgrade_maxhp', type:'generic', apply(p){ p.maxHp += 25; p.hp = Math.min(p.hp+25, p.maxHp); } },
    { id:'regen',        name:'HP Regen',               desc:'Slowly regenerate 2 HP per second.',       rarity:'rare',    tags:['survival'], icon:'upgrade_maxhp', type:'generic', apply(p){ p.regen = (p.regen||0)+2; } },

    // On-hit effects
    { id:'onhit_burn',   name:'Burning Strikes',       desc:'Attacks have 30% chance to Burn.',         rarity:'rare',    tags:['physical','elemental'], icon:'upgrade_fireball', type:'generic', apply(p){ p.onHitBurnChance = (p.onHitBurnChance||0)+0.3; } },
    { id:'onhit_poison', name:'Poison Strikes',        desc:'Attacks have 30% chance to Poison.',       rarity:'rare',    tags:['physical','elemental'], icon:'upgrade_nova', type:'generic', apply(p){ p.onHitPoisonChance = (p.onHitPoisonChance||0)+0.3; } },

    // New common cards
    { id:'steadyAim', name:'Steady Aim', desc:'Basic attacks travel 20% faster.', rarity:'common', tags:['physical','projectile'], icon:'card_steady_aim', type:'generic', apply(p){ p.basicProjectileSpeedMult = (p.basicProjectileSpeedMult || 1) * 1.2; } },
    { id:'thickBoots', name:'Thick Boots', desc:'Take 20% less hazard damage.', rarity:'common', tags:['survival','hazard'], icon:'card_thick_boots', type:'generic', apply(p){ p.hazardDamageTakenMult = (p.hazardDamageTakenMult || 1) * 0.8; } },
    { id:'smallSnack', name:'Small Snack', desc:'Heal 8 HP after clearing each room.', rarity:'common', tags:['survival','room'], icon:'card_small_snack', type:'generic',
        onRoomClear(player) { player.hp = Math.min(player.maxHp, player.hp + 8); }
    },
    { id:'coinPouch', name:'Coin Pouch', desc:'Gain 15% more coins from enemy kills.', rarity:'common', tags:['economy'], icon:'card_coin_pouch', type:'generic', apply(p){ p.enemyCoinGainMult = (p.enemyCoinGainMult || 1) * 1.15; } },
    { id:'calmFocus', name:'Calm Focus', desc:'Abilities cooldown 8% faster.', rarity:'common', tags:['ability','cooldown'], icon:'card_calm_focus', type:'generic', apply(p){ p.abilityCooldownMult = (p.abilityCooldownMult || 1) * 0.92; } },

    // New rare cards
    { id:'finishingBlow', name:'Finishing Blow', desc:'+30% damage to enemies below 30% HP.', rarity:'rare', tags:['damage'], icon:'card_finishing_blow', type:'generic', apply(p){ p.lowHpDamageMult = (p.lowHpDamageMult || 1) * 1.3; } },
    { id:'emergencyRoll', name:'Emergency Roll', desc:'After a heavy hit, gain +25% dodge for 2s (12s cooldown).', rarity:'rare', tags:['defense','dodge'], icon:'card_emergency_roll', type:'generic',
        onPlayerDamaged(player, game, ctx) {
            const now = game.runClock || 0;
            const threshold = player.maxHp * 0.2;
            if ((ctx.damageApplied || 0) >= threshold && now >= (player.emergencyRollReadyAt || 0)) {
                player.tempDodgeBonus = Math.max(player.tempDodgeBonus || 0, 0.25);
                player.tempDodgeUntil = now + 2;
                player.emergencyRollReadyAt = now + 12;
            }
        }
    },
    { id:'treasureSense', name:'Treasure Sense', desc:'20% chance for extra room clear rewards.', rarity:'rare', tags:['economy','room'], icon:'card_treasure_sense', type:'generic',
        onRoomClear(player, game) {
            if (Math.random() < 0.2) {
                game.addCoins(5 + Math.floor(Math.random() * 5), 'treasure_sense_bonus');
                player.hp = Math.min(player.maxHp, player.hp + 4);
            }
        }
    },
    { id:'battleRhythm', name:'Battle Rhythm', desc:'After a kill, gain +20% attack speed for 3s.', rarity:'rare', tags:['physical','tempo'], icon:'card_battle_rhythm', type:'generic',
        onEnemyKilled(player, game) {
            player.battleRhythmUntil = (game.runClock || 0) + 3;
        }
    },
    { id:'manaBattery', name:'Mana Battery', desc:'Casting an ability buffs the next different one by 20%.', rarity:'rare', tags:['ability','damage'], icon:'card_mana_battery', type:'generic',
        onAbilityCast(player, game, ctx) {
            if (ctx && ctx.abilityId) {
                player.manaBatteryBonus = 1.2;
                player.manaBatterySourceAbilityId = ctx.abilityId;
                player.manaBatteryUntil = (game.runClock || 0) + 4;
            }
        }
    },

    // New epic cards
    { id:'executionChain', name:'Execution Chain', desc:'On kill, deal 25% of that enemy max HP nearby.', rarity:'epic', tags:['ability','aoe'], icon:'card_execution_chain', type:'generic',
        onEnemyKilled(player, game, ctx) {
            if (!ctx || !ctx.enemy) return;
            const enemy = ctx.enemy;
            const aoeDamage = (enemy.maxHp || 0) * 0.25;
            const radius = 100;
            for (const target of game.enemies) {
                if (target.dead || target === enemy) continue;
                const dx = target.x - enemy.x;
                const dy = target.y - enemy.y;
                if (dx * dx + dy * dy <= radius * radius) {
                    target.takeDamage(aoeDamage, 'physical', game, { sourcePlayer: player, isAbilityDamage: true });
                }
            }
            spawnExplosion(game.particles, enemy.x, enemy.y, 10, ['#ff9999', '#ffcc99', '#ffffff'], 120, 5);
        }
    },
    { id:'crystalSkin', name:'Crystal Skin', desc:'Start each room with shield equal to 20% max HP.', rarity:'epic', tags:['defense','shield'], icon:'card_crystal_skin', type:'generic',
        onRoomStart(player) {
            player.tempShield = Math.max(player.tempShield || 0, Math.floor(player.maxHp * 0.2));
        }
    },
    { id:'overcharge', name:'Overcharge', desc:'Every 3rd ability cast is empowered.', rarity:'epic', tags:['ability','damage'], icon:'card_overcharge', type:'generic', apply(p){ p.overchargeCount = 0; } },
    { id:'huntersMark', name:'Hunter’s Mark', desc:'Basic attacks mark enemies; abilities deal +15% to marked foes.', rarity:'epic', tags:['physical','ability'], icon:'card_hunters_mark', type:'generic', apply(p){ p.huntersMarkEnabled = true; } },
    { id:'roomMomentum', name:'Room Momentum', desc:'Clear rooms fast for bonus coins and healing.', rarity:'epic', tags:['economy','room'], icon:'card_room_momentum', type:'generic',
        onRoomClear(player, game, ctx) {
            if (!ctx || !ctx.roomDuration || ctx.roomDuration > 35) return;
            game.addCoins(8 + Math.floor(Math.random() * 5), 'room_momentum_bonus');
            player.hp = Math.min(player.maxHp, player.hp + 6);
        }
    },

    // New legendary cards
    { id:'secondWind', name:'Second Wind', desc:'Avoid death once per run and recover 40% max HP.', rarity:'legendary', tags:['defense','revive'], icon:'card_second_wind', type:'generic',
        onRunStart(player) { player.secondWindUsed = false; },
        onBeforeDamage(player, game, ctx) {
            if (player.secondWindUsed) return;
            if (player.hp - ctx.amount <= 0) {
                player.secondWindUsed = true;
                ctx.amount = Math.max(0, player.hp - 1);
                ctx.triggerSecondWind = true;
            }
        },
        onPlayerDamaged(player, game, ctx) {
            if (!ctx.triggerSecondWind) return;
            player.hp = Math.min(player.maxHp, Math.floor(player.maxHp * 0.4));
            for (const e of game.enemies) {
                if (!e.dead) e.knockback(player.x, player.y, 220);
            }
            spawnExplosion(game.particles, player.x, player.y, 16, ['#ffeeaa', '#ffffff', '#99ddff'], 160, 7);
        }
    },
    { id:'stormOfBlades', name:'Storm of Blades', desc:'15% chance on basic attack to fire 3 extra blades.', rarity:'legendary', tags:['physical','projectile'], icon:'card_storm_of_blades', type:'generic', apply(p){ p.stormOfBladesChance = (p.stormOfBladesChance || 0) + 0.15; } },
    { id:'unstablePower', name:'Unstable Power', desc:'+35% ability damage, but abilities cost 2% current HP.', rarity:'legendary', tags:['ability','risk'], icon:'card_unstable_power', type:'generic',
        apply(p){ p.abilityDmgMult = (p.abilityDmgMult || 1) * 1.35; },
        onAbilityCast(player) {
            if (player.hp <= 1) return;
            const hpCost = Math.max(player.hp * 0.02, 0.25);
            player.hp = Math.max(1, player.hp - hpCost);
        }
    },
    { id:'bossHunter', name:'Boss Hunter', desc:'+25% damage to elites, mini bosses, and bosses.', rarity:'legendary', tags:['damage','boss'], icon:'card_boss_hunter', type:'generic', apply(p){ p.bossDamageMult = (p.bossDamageMult || 1) * 1.25; } },

    // New mythical cards
    { id:'realityFracture', name:'Reality Fracture', desc:'20% chance to repeat your last ability at 50% power.', rarity:'mythic', tags:['ability','mythic'], icon:'card_reality_fracture', type:'generic',
        onAbilityCast(player, game, ctx) {
            if (!ctx || ctx.isRepeat) return;
            if (Math.random() < 0.2 && ctx.ability) {
                game.queueAbilityRepeat(ctx.ability, 0.5);
            }
        }
    },
    { id:'goldenCurse', name:'Golden Curse', desc:'+75% coins from kills, but enemies deal +15% damage.', rarity:'mythic', tags:['economy','curse'], icon:'card_golden_curse', type:'generic',
        apply(p) {
            p.enemyCoinGainMult = (p.enemyCoinGainMult || 1) * 1.75;
            p.enemyDamageTakenMult = (p.enemyDamageTakenMult || 1) * 1.15;
        }
    },
];

for (const card of UPGRADES) {
    if (!Array.isArray(card.tags)) card.tags = [];
    if (!card.type) card.type = 'generic';
    if (!card.description) card.description = card.desc || '';
    if (!card.desc) card.desc = card.description;
    if (!card.icon) card.icon = 'card_back';
    card.shopCost = CARD_SHOP_COSTS[card.rarity] || 50;
}

const PERMANENT_COSTS = [3, 7, 13, 19, 26];
const MAX_DODGE_CHANCE = 0.5;

function permanentCostFormula(rankIndex) {
    return PERMANENT_COSTS[Math.max(0, Math.min(PERMANENT_COSTS.length - 1, rankIndex))];
}

const permanentUpgradeCategories = {
    defense: [
        {
            id: 'p_hp',
            category: 'defense',
            name: 'Fortified Body',
            description: '+15 Max HP per rank.',
            maxRank: 5,
            effectPerRank: '+15 Max HP',
            costFormula: permanentCostFormula,
            costPerRank: PERMANENT_COSTS,
            icon: 'upgrade_fortified_body',
            nextRankPreview(rank) { return `Max HP +${15 * (rank + 1)}`; },
            applyEffect(p, rank) {
                p.maxHp += 15 * rank;
                p.hp = Math.min(p.hp + 15 * rank, p.maxHp);
            }
        },
        {
            id: 'p_iron_skin',
            category: 'defense',
            name: 'Iron Skin',
            description: '-5% damage taken per rank (multiplicative).',
            maxRank: 5,
            effectPerRank: '-5% damage taken',
            costFormula: permanentCostFormula,
            costPerRank: PERMANENT_COSTS,
            icon: 'upgrade_iron_skin',
            nextRankPreview(rank) { return `Damage taken x${Math.pow(0.95, rank + 1).toFixed(3)}`; },
            applyEffect(p, rank) {
                p.damageTakenMult = (p.damageTakenMult || 1) * Math.pow(0.95, rank);
            }
        },
        {
            id: 'p_speed',
            category: 'defense',
            name: 'Fleet Footed',
            description: '+8% movement speed per rank.',
            maxRank: 5,
            effectPerRank: '+8% movement speed',
            costFormula: permanentCostFormula,
            costPerRank: PERMANENT_COSTS,
            icon: 'upgrade_fleet_footed',
            nextRankPreview(rank) { return `Move speed +${Math.round((Math.pow(1.08, rank + 1) - 1) * 100)}%`; },
            applyEffect(p, rank) {
                p.moveSpeedMult *= Math.pow(1.08, rank);
            }
        },
        {
            id: 'p_evasion',
            category: 'defense',
            name: 'Evasion Training',
            description: '+3% dodge chance per rank (capped at 50%).',
            maxRank: 5,
            effectPerRank: '+3% dodge chance',
            costFormula: permanentCostFormula,
            costPerRank: PERMANENT_COSTS,
            icon: 'upgrade_evasion_training',
            nextRankPreview(rank) { return `Dodge chance ${Math.min(MAX_DODGE_CHANCE, (rank + 1) * 0.03) * 100}%`; },
            applyEffect(p, rank) {
                p.dodgeChance = Math.min(MAX_DODGE_CHANCE, (p.dodgeChance || 0) + rank * 0.03);
            }
        }
    ],
    offense: [
        {
            id: 'p_atk',
            category: 'offense',
            name: 'Combat Training',
            description: '+10% basic attack damage per rank.',
            maxRank: 5,
            effectPerRank: '+10% basic attack damage',
            costFormula: permanentCostFormula,
            costPerRank: PERMANENT_COSTS,
            icon: 'upgrade_combat_training',
            nextRankPreview(rank) { return `Basic attack +${Math.round((Math.pow(1.1, rank + 1) - 1) * 100)}%`; },
            applyEffect(p, rank) {
                p.atkMult *= Math.pow(1.10, rank);
            }
        },
        {
            id: 'p_arcane',
            category: 'offense',
            name: 'Arcane Mastery',
            description: '+10% ability damage per rank (all abilities).',
            maxRank: 5,
            effectPerRank: '+10% ability damage',
            costFormula: permanentCostFormula,
            costPerRank: PERMANENT_COSTS,
            icon: 'upgrade_arcane_mastery',
            nextRankPreview(rank) { return `Ability damage +${Math.round((Math.pow(1.1, rank + 1) - 1) * 100)}%`; },
            applyEffect(p, rank) {
                p.abilityDmgMult = (p.abilityDmgMult || 1) * Math.pow(1.10, rank);
            }
        },
        {
            id: 'p_rapid',
            category: 'offense',
            name: 'Rapid Strikes',
            description: '+8% attack speed per rank.',
            maxRank: 5,
            effectPerRank: '+8% attack speed',
            costFormula: permanentCostFormula,
            costPerRank: PERMANENT_COSTS,
            icon: 'upgrade_rapid_strikes',
            nextRankPreview(rank) { return `Attack speed +${Math.round((Math.pow(1.08, rank + 1) - 1) * 100)}%`; },
            applyEffect(p, rank) {
                p.atkSpeedMult *= Math.pow(1.08, rank);
            }
        },
        {
            id: 'p_cooldown',
            category: 'offense',
            name: 'Cooldown Mastery',
            description: '-5% ability cooldown per rank.',
            maxRank: 5,
            effectPerRank: '-5% ability cooldown',
            costFormula: permanentCostFormula,
            costPerRank: PERMANENT_COSTS,
            icon: 'upgrade_dash',
            nextRankPreview(rank) { return `Ability cooldown -${(rank + 1) * 5}%`; },
            applyEffect(p, rank) {
                p.abilityCooldownMult *= (1 - (rank * 0.05));
            }
        }
    ],
    utility: [
        {
            id: 'p_fortune',
            category: 'utility',
            name: 'Fortune',
            description: '+5% better class roll rarity weighting per rank.',
            maxRank: 5,
            effectPerRank: '+5% rarity weight shift',
            costFormula: permanentCostFormula,
            costPerRank: PERMANENT_COSTS,
            icon: 'upgrade_fortune',
            nextRankPreview(rank) { return `Rarity luck bonus ${(rank + 1) * 5}%`; },
            applyEffect() { /* Applied in ClassSystem.roll using save rank */ }
        },
        {
            id: 'p_crystal',
            category: 'utility',
            name: 'Crystal Hoarder',
            description: '+1 guaranteed crystal per room per rank.',
            maxRank: 5,
            effectPerRank: '+1 guaranteed room crystal',
            costFormula: permanentCostFormula,
            costPerRank: PERMANENT_COSTS,
            icon: 'upgrade_crystal_hoarder',
            nextRankPreview(rank) { return `+${rank + 1} guaranteed crystal${rank + 1 > 1 ? 's' : ''} per room`; },
            applyEffect() { /* Applied in Game.awardRoomClearCrystals() */ }
        }
    ]
};

const PERMANENT_UPGRADES = Object.values(permanentUpgradeCategories).flat().map(pu => ({
    ...pu,
    apply: pu.applyEffect
}));

const UpgradeSystem = {
    STARTING_OWNED_CARD_IDS,
    DEFAULT_EQUIPPED_CARD_IDS,
    SHOP_ROTATION_MS: 5 * 60 * 1000,

    allCards() {
        return UPGRADES;
    },

    starterOwnedCardIds() {
        return [...STARTING_OWNED_CARD_IDS];
    },

    defaultEquippedCardIds() {
        return [...DEFAULT_EQUIPPED_CARD_IDS];
    },

    cardById(id) {
        return UPGRADES.find(c => c.id === id) || null;
    },

    _classContext(player) {
        const classDef = player && player.classDef ? player.classDef : null;
        const classId = classDef ? classDef.id : null;
        const playerAbilityIds = new Set(Array.isArray(classDef.abilityIds) ? classDef.abilityIds : []);
        const classTags = new Set(Array.isArray(classDef.tags) ? classDef.tags : []);

        const abilityDefs = Array.isArray(classDef.abilities)
            ? classDef.abilities
            : Array.from(playerAbilityIds).map(id => ({ id, tags: [], upgradePool: [] }));

        const allowedAbilityUpgradeIds = new Set();
        const abilityTags = new Set();
        for (const ab of abilityDefs) {
            if (!ab) continue;
            if (Array.isArray(ab.upgradePool)) for (const uid of ab.upgradePool) allowedAbilityUpgradeIds.add(uid);
            if (Array.isArray(ab.tags)) for (const tag of ab.tags) abilityTags.add(tag);
        }

        if (allowedAbilityUpgradeIds.size === 0) {
            for (const u of UPGRADES) {
                if (u.type === 'ability' && u.requiredAbilityId && playerAbilityIds.has(u.requiredAbilityId)) {
                    allowedAbilityUpgradeIds.add(u.id);
                }
            }
        }

        return { classId, classAbilityIds: playerAbilityIds, classTags, abilityTags, allowedAbilityUpgradeIds };
    },

    isUpgradeAllowed(player, upgrade) {
        if (!upgrade) return false;
        const ctx = this._classContext(player);

        if (upgrade.requiredClassId && upgrade.requiredClassId !== ctx.classId) return false;
        if (upgrade.requiredAbilityId && !ctx.classAbilityIds.has(upgrade.requiredAbilityId)) return false;
        if (Array.isArray(upgrade.requiredTags) && upgrade.requiredTags.length > 0) {
            for (const tag of upgrade.requiredTags) {
                if (!ctx.classTags.has(tag) && !ctx.abilityTags.has(tag)) return false;
            }
        }

        if (upgrade.type === 'ability' && ctx.allowedAbilityUpgradeIds.size > 0 && !ctx.allowedAbilityUpgradeIds.has(upgrade.id)) {
            return false;
        }
        return true;
    },

    normalizeOwnedAndEquipped(saveData) {
        if (!saveData) return;
        if (!Array.isArray(saveData.ownedCardIds) || saveData.ownedCardIds.length === 0) {
            saveData.ownedCardIds = this.starterOwnedCardIds();
        }
        if (!Array.isArray(saveData.equippedCardIds) || saveData.equippedCardIds.length === 0) {
            saveData.equippedCardIds = this.defaultEquippedCardIds();
        }
        const owned = new Set(saveData.ownedCardIds.filter(id => !!this.cardById(id)));
        saveData.ownedCardIds = [...owned];
        saveData.equippedCardIds = saveData.equippedCardIds.filter(id => owned.has(id) && !!this.cardById(id));
        if (saveData.equippedCardIds.length === 0) {
            saveData.equippedCardIds = this.defaultEquippedCardIds().filter(id => owned.has(id));
        }
    },

    getOwnedCards(saveData) {
        const ownedSet = new Set((saveData && saveData.ownedCardIds) || []);
        return UPGRADES.filter(c => ownedSet.has(c.id));
    },

    getEquippedCards(saveData) {
        const equippedSet = new Set((saveData && saveData.equippedCardIds) || []);
        return UPGRADES.filter(c => equippedSet.has(c.id));
    },

    getShopCost(card) {
        return CARD_SHOP_COSTS[(card && card.rarity) || 'common'] || 50;
    },

    _weightedCardChoice(cards) {
        if (!cards || cards.length === 0) return null;
        const totalWeight = cards.reduce((sum, c) => sum + (CARD_SHOP_RARITY_WEIGHTS[c.rarity] || 1), 0);
        let roll = Math.random() * totalWeight;
        for (const card of cards) {
            roll -= (CARD_SHOP_RARITY_WEIGHTS[card.rarity] || 1);
            if (roll <= 0) return card;
        }
        return cards[cards.length - 1];
    },

    buildShopInventory(saveData, count = 4) {
        const owned = new Set((saveData && saveData.ownedCardIds) || []);
        const pool = UPGRADES.filter(card => !owned.has(card.id));
        if (pool.length === 0) return [];
        const selected = [];
        const remaining = [...pool];
        while (selected.length < count && remaining.length > 0) {
            const choice = this._weightedCardChoice(remaining);
            if (!choice) break;
            selected.push(choice.id);
            const idx = remaining.findIndex(c => c.id === choice.id);
            if (idx >= 0) remaining.splice(idx, 1);
        }
        return selected;
    },

    getDungeonCardPool(player, saveData) {
        const owned = new Set((saveData && saveData.ownedCardIds) || []);
        const equipped = new Set((saveData && saveData.equippedCardIds) || []);
        let pool = UPGRADES.filter(card => owned.has(card.id) && equipped.has(card.id) && this.isUpgradeAllowed(player, card));
        if (pool.length === 0) {
            const starter = new Set(this.starterOwnedCardIds());
            pool = UPGRADES.filter(card => starter.has(card.id) && owned.has(card.id) && this.isUpgradeAllowed(player, card));
        }
        if (pool.length === 0) {
            pool = UPGRADES.filter(card => this.isUpgradeAllowed(player, card));
        }
        return pool;
    },

    // Pick random equipped/owned cards from dungeon pool (equal rarity weight in-run)
    roll(player, saveData, count = 3) {
        const pool = this.getDungeonCardPool(player, saveData);
        const chosen = [];
        const used = new Set();

        while (chosen.length < count && pool.length > 0) {
            const candidates = pool.filter(u => !used.has(u.id));
            if (candidates.length === 0) break;
            const idx = Math.floor(Math.random() * candidates.length);
            const choice = candidates[idx];
            chosen.push(choice);
            used.add(choice.id);
        }
        return chosen;
    },

    applyPermanent(player, saveData) {
        for (const pu of PERMANENT_UPGRADES) {
            const rank = saveData.permanentUpgrades[pu.id] || 0;
            if (rank > 0) pu.applyEffect(player, rank);
        }
    },

    permanentCost(pu, currentRank) {
        if (currentRank >= pu.maxRank) return Infinity;
        if (typeof pu.costFormula === 'function') return pu.costFormula(currentRank);
        return pu.costPerRank[currentRank];
    },

    getPermanentCategories() {
        return Object.keys(permanentUpgradeCategories);
    },

    getPermanentUpgradesByCategory(category) {
        return permanentUpgradeCategories[category] || [];
    }
};
