'use strict';
// Status effects: applied to enemies (and player for some)
const StatusEffects = {
    // Create a status effect instance
    create(type, sourceAtk) {
        switch (type) {
            case 'burn':
                return { type:'burn', duration:3, timer:0, tickRate:0.5, tickTimer:0, dps:5 * (sourceAtk/15), color:'#ff6600' };
            case 'freeze':
                return { type:'freeze', duration:1.8, timer:0, color:'#88ccff' };
            case 'poison':
                return { type:'poison', duration:5, timer:0, tickRate:0.8, tickTimer:0, dps:3, color:'#aa44cc' };
            case 'shock':
                return { type:'shock', duration:0.3, timer:0, color:'#ffee44', chainDamage: sourceAtk * 0.5 };
            case 'bleed':
                return { type:'bleed', duration:4, timer:0, moveDamage: 10, lastX:0, lastY:0, color:'#cc2244' };
            default:
                return null;
        }
    },

    // Update a status effect on an entity; returns true if expired
    update(effect, entity, dt, allEnemies) {
        effect.timer += dt;

        switch (effect.type) {
            case 'burn':
                effect.tickTimer += dt;
                while (effect.tickTimer >= effect.tickRate) {
                    effect.tickTimer -= effect.tickRate;
                    entity.takeDamage(effect.dps * effect.tickRate, 'fire');
                }
                break;
            case 'freeze':
                entity.frozen = true;
                break;
            case 'poison':
                effect.tickTimer += dt;
                while (effect.tickTimer >= effect.tickRate) {
                    effect.tickTimer -= effect.tickRate;
                    entity.takeDamage(effect.dps * effect.tickRate, 'poison');
                }
                break;
            case 'bleed':
                if (effect.lastX !== 0 || effect.lastY !== 0) {
                    const dx = entity.x - effect.lastX;
                    const dy = entity.y - effect.lastY;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist > 4) {
                        entity.takeDamage(effect.moveDamage * (dist / 20), 'bleed');
                        effect.lastX = entity.x;
                        effect.lastY = entity.y;
                    }
                } else {
                    effect.lastX = entity.x;
                    effect.lastY = entity.y;
                }
                break;
            case 'shock':
                if (!effect.chained && allEnemies) {
                    effect.chained = true;
                    // Chain to nearest enemy once
                    for (const e of allEnemies) {
                        if (e === entity || e.dead) continue;
                        const dx = e.x - entity.x, dy = e.y - entity.y;
                        if (dx*dx + dy*dy < 120*120) {
                            e.takeDamage(effect.chainDamage, 'shock');
                            break;
                        }
                    }
                }
                break;
        }

        if (effect.timer >= effect.duration) {
            if (effect.type === 'freeze') entity.frozen = false;
            return true; // expired
        }
        return false;
    },

    getColor(type) {
        const colors = { burn:'#ff6600', freeze:'#88ccff', poison:'#aa44cc', shock:'#ffee44', bleed:'#cc2244' };
        return colors[type] || '#ffffff';
    }
};
