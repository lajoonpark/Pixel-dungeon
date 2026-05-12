'use strict';
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
    { id:'dashMomentum', name:'Dash Momentum', desc:'Gain move speed and faster ability cooldowns.', rarity:'rare', tags:['mobility','dash','synergy'], icon:'upgrade_dash', type:'synergy', requiredTags:['dash','movement'], apply(p){ p.moveSpeedMult *= 1.08; p.abilityCooldownMult *= 0.92; } },

    // Survival
    { id:'maxhp',        name:'+25 Max HP',            desc:'Increase your maximum health.',             rarity:'common',  tags:['survival'], icon:'upgrade_maxhp', type:'generic', apply(p){ p.maxHp += 25; p.hp = Math.min(p.hp+25, p.maxHp); } },
    { id:'regen',        name:'HP Regen',               desc:'Slowly regenerate 2 HP per second.',       rarity:'rare',    tags:['survival'], icon:'upgrade_maxhp', type:'generic', apply(p){ p.regen = (p.regen||0)+2; } },

    // On-hit effects
    { id:'onhit_burn',   name:'Burning Strikes',       desc:'Attacks have 30% chance to Burn.',         rarity:'rare',    tags:['physical','elemental'], icon:'upgrade_fireball', type:'generic', apply(p){ p.onHitBurnChance = (p.onHitBurnChance||0)+0.3; } },
    { id:'onhit_poison', name:'Poison Strikes',        desc:'Attacks have 30% chance to Poison.',       rarity:'rare',    tags:['physical','elemental'], icon:'upgrade_nova', type:'generic', apply(p){ p.onHitPoisonChance = (p.onHitPoisonChance||0)+0.3; } },
];

const PERMANENT_UPGRADES = [
    { id:'p_hp',     name:'Fortified Body',   desc:'+15 Max HP per rank.',     maxRank:5, costPerRank:[1,1,2,2,3], icon:'upgrade_maxhp',     apply(p,rank){ p.maxHp += 15*rank; p.hp = Math.min(p.hp + 15*rank, p.maxHp); } },
    { id:'p_atk',    name:'Combat Training',  desc:'+10% Damage per rank.',    maxRank:5, costPerRank:[1,1,2,2,3], icon:'upgrade_damage',    apply(p,rank){ p.atkMult *= Math.pow(1.10, rank); } },
    { id:'p_speed',  name:'Fleet Footed',     desc:'+8% Move Speed per rank.', maxRank:5, costPerRank:[1,1,2,2,3], icon:'upgrade_speed',     apply(p,rank){ p.moveSpeedMult *= Math.pow(1.08, rank); } },
    { id:'p_cd',     name:'Quick Recovery',   desc:'-10% Ability CD per rank.',maxRank:5, costPerRank:[1,2,2,3,3], icon:'upgrade_dash',      apply(p,rank){ p.abilityCooldownMult *= Math.pow(0.90, rank); } },
    { id:'p_crystal',name:'Crystal Finder',   desc:'+10% chance per rank for +1 bonus room crystal.',maxRank:3, costPerRank:[1,2,3],      icon:'icon_crystal',      apply(){ /* Handled in Game.awardRoomClearCrystals() */ } },
];

const UpgradeSystem = {
    _classContext(player) {
        const classDef = player && player.classDef ? player.classDef : null;
        const classId = classDef ? classDef.id : null;
        const classAbilityIds = new Set(Array.isArray(classDef && classDef.abilityIds) ? classDef.abilityIds : []);
        const classTags = new Set(Array.isArray(classDef && classDef.tags) ? classDef.tags : []);

        const abilityDefs = Array.isArray(classDef && classDef.abilities)
            ? classDef.abilities
            : Array.from(classAbilityIds).map(id => ({ id, tags: [], upgradePool: [] }));

        const allowedAbilityUpgradeIds = new Set();
        const abilityTags = new Set();
        for (const ab of abilityDefs) {
            if (!ab) continue;
            if (Array.isArray(ab.upgradePool)) for (const uid of ab.upgradePool) allowedAbilityUpgradeIds.add(uid);
            if (Array.isArray(ab.tags)) for (const tag of ab.tags) abilityTags.add(tag);
        }

        if (allowedAbilityUpgradeIds.size === 0) {
            for (const u of UPGRADES) {
                if (u.type === 'ability' && u.requiredAbilityId && classAbilityIds.has(u.requiredAbilityId)) {
                    allowedAbilityUpgradeIds.add(u.id);
                }
            }
        }

        return { classId, classAbilityIds, classTags, abilityTags, allowedAbilityUpgradeIds };
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

    // Pick 3 random upgrades from the pool, weighted by rarity
    roll(player, count = 3) {
        const pool = UPGRADES.filter(u => this.isUpgradeAllowed(player, u));
        const chosen = [];
        const used = new Set();

        // Weight by rarity
        const weight = (u) => ({ common:3, rare:1.5, epic:0.7 })[u.rarity] || 1;

        while (chosen.length < count && pool.length > 0) {
            let totalW = pool.filter(u => !used.has(u.id)).reduce((s, u) => s + weight(u), 0);
            let r = Math.random() * totalW;
            for (const u of pool) {
                if (used.has(u.id)) continue;
                r -= weight(u);
                if (r <= 0) {
                    chosen.push(u);
                    used.add(u.id);
                    break;
                }
            }
        }
        return chosen;
    },

    applyPermanent(player, saveData) {
        for (const pu of PERMANENT_UPGRADES) {
            const rank = saveData.permanentUpgrades[pu.id] || 0;
            if (rank > 0) pu.apply(player, rank);
        }
    },

    permanentCost(pu, currentRank) {
        if (currentRank >= pu.maxRank) return Infinity;
        return pu.costPerRank[currentRank];
    }
};
