'use strict';
const UPGRADES = [
    // Physical
    { id:'damage',       name:'+25% Attack Damage',    desc:'Deal 25% more damage with basic attacks.',  rarity:'common',  tags:['physical'], icon:'upgrade_damage',      apply(p){ p.atkMult *= 1.25; } },
    { id:'attackspeed',  name:'+20% Attack Speed',     desc:'Attack 20% faster.',                        rarity:'common',  tags:['physical'], icon:'upgrade_attackspeed', apply(p){ p.atkSpeedMult *= 1.2; } },
    { id:'range',        name:'+30 Attack Range',      desc:'Reach enemies from further away.',           rarity:'common',  tags:['physical'], icon:'upgrade_range',       apply(p){ p.range += 30; } },
    { id:'multishot',    name:'Multi-Shot',             desc:'Auto-attacks hit up to 2 targets.',         rarity:'rare',    tags:['physical'], icon:'upgrade_multishot',   apply(p){ p.multiShot = Math.min((p.multiShot||1)+1, 3); } },
    { id:'critical',     name:'Critical Strike',        desc:'20% chance to deal double damage.',         rarity:'rare',    tags:['physical'], icon:'upgrade_critical',    apply(p){ p.critChance = (p.critChance||0)+0.2; } },
    { id:'lifesteal',    name:'Life Steal',             desc:'Gain 8% of damage dealt as HP.',           rarity:'rare',    tags:['physical'], icon:'upgrade_lifesteal',   apply(p){ p.lifeSteal = (p.lifeSteal||0)+0.08; } },
    { id:'thorns',       name:'Thorns',                 desc:'Reflect 15% of damage taken to attacker.', rarity:'rare',    tags:['physical'], icon:'upgrade_thorns',      apply(p){ p.thorns = (p.thorns||0)+0.15; } },

    // Speed / Mobility
    { id:'speed',        name:'+15% Move Speed',       desc:'Move faster through the dungeon.',          rarity:'common',  tags:['mobility'], icon:'upgrade_speed',       apply(p){ p.moveSpeedMult *= 1.15; } },
    { id:'dashcharge',   name:'Dash Charges +1',       desc:'Gain an extra Dash charge.',                rarity:'rare',    tags:['mobility','dash'], icon:'upgrade_dash', apply(p){ p.dashCharges = (p.dashCharges||2)+1; } },
    { id:'dashcdr',      name:'Dash Cooldown -25%',    desc:'Dash recharges 25% faster.',               rarity:'common',  tags:['mobility','dash'], icon:'upgrade_dash', apply(p){ p.abilityCooldownMult = (p.abilityCooldownMult||1)*0.75; } },

    // Ability – Fireball
    { id:'fireball_dmg', name:'Fireball +40% Damage',  desc:'Your fireball hits harder.',                rarity:'common',  tags:['ability','fireball'], icon:'upgrade_fireball', apply(p){ p.fireballDmgMult = (p.fireballDmgMult||1)*1.4; } },
    { id:'fireball_aoe', name:'Fireball +50% AOE',     desc:'Fireball blasts a larger area.',            rarity:'rare',    tags:['ability','fireball'], icon:'upgrade_fireball', apply(p){ p.fireballAoeMult = (p.fireballAoeMult||1)*1.5; } },
    { id:'fireball_cdr', name:'Fireball CDR -30%',     desc:'Cast Fireball more often.',                 rarity:'common',  tags:['ability','fireball'], icon:'upgrade_fireball', apply(p){ p.fireballCDMult = (p.fireballCDMult||1)*0.7; } },

    // Ability – Ice Nova
    { id:'nova_dmg',     name:'Ice Nova +50% Damage',  desc:'Your Ice Nova freezes and hurts more.',    rarity:'rare',    tags:['ability','nova'], icon:'upgrade_nova', apply(p){ p.novaDmgMult = (p.novaDmgMult||1)*1.5; } },
    { id:'nova_radius',  name:'Ice Nova +60% Radius',  desc:'Ice Nova covers a larger area.',            rarity:'rare',    tags:['ability','nova'], icon:'upgrade_nova', apply(p){ p.novaRadiusMult = (p.novaRadiusMult||1)*1.6; } },

    // Survival
    { id:'maxhp',        name:'+25 Max HP',            desc:'Increase your maximum health.',             rarity:'common',  tags:['survival'], icon:'upgrade_maxhp', apply(p){ p.maxHp += 25; p.hp = Math.min(p.hp+25, p.maxHp); } },
    { id:'regen',        name:'HP Regen',               desc:'Slowly regenerate 2 HP per second.',       rarity:'rare',    tags:['survival'], icon:'upgrade_maxhp', apply(p){ p.regen = (p.regen||0)+2; } },

    // On-hit effects
    { id:'onhit_burn',   name:'Burning Strikes',       desc:'Attacks have 30% chance to Burn.',         rarity:'rare',    tags:['physical','elemental'], icon:'upgrade_fireball', apply(p){ p.onHitBurnChance = (p.onHitBurnChance||0)+0.3; } },
    { id:'onhit_poison', name:'Poison Strikes',        desc:'Attacks have 30% chance to Poison.',       rarity:'rare',    tags:['physical','elemental'], icon:'upgrade_nova',     apply(p){ p.onHitPoisonChance = (p.onHitPoisonChance||0)+0.3; } },
];

const PERMANENT_UPGRADES = [
    { id:'p_hp',     name:'Fortified Body',   desc:'+15 Max HP per rank.',     maxRank:5, costPerRank:[1,1,2,2,3], icon:'upgrade_maxhp',     apply(p,rank){ p.maxHp += 15*rank; p.hp = Math.min(p.hp + 15*rank, p.maxHp); } },
    { id:'p_atk',    name:'Combat Training',  desc:'+10% Damage per rank.',    maxRank:5, costPerRank:[1,1,2,2,3], icon:'upgrade_damage',    apply(p,rank){ p.atkMult *= Math.pow(1.10, rank); } },
    { id:'p_speed',  name:'Fleet Footed',     desc:'+8% Move Speed per rank.', maxRank:5, costPerRank:[1,1,2,2,3], icon:'upgrade_speed',     apply(p,rank){ p.moveSpeedMult *= Math.pow(1.08, rank); } },
    { id:'p_cd',     name:'Quick Recovery',   desc:'-10% Ability CD per rank.',maxRank:5, costPerRank:[1,2,2,3,3], icon:'upgrade_dash',      apply(p,rank){ p.abilityCooldownMult *= Math.pow(0.90, rank); } },
    { id:'p_crystal',name:'Crystal Finder',   desc:'+10% chance per rank for +1 bonus room crystal.',maxRank:3, costPerRank:[1,2,3],      icon:'icon_crystal',      apply(){ /* Handled in Game.awardRoomClearCrystals() */ } },
];

const UpgradeSystem = {
    // Pick 3 random upgrades from the pool, weighted by rarity
    roll(player, count = 3) {
        const pool = [...UPGRADES];
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
