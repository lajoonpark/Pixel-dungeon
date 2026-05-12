'use strict';
// ── Ability keys by slot index ───────────────────────────────────────────────
// slot 0 → J, 1 → K, 2 → L, 3 → U, 4 → I
const SLOT_KEYS  = ['j', 'k', 'l', 'u', 'i'];
const SLOT_CODES = ['KeyJ', 'KeyK', 'KeyL', 'KeyU', 'KeyI'];
const SLOT_LABELS = ['J', 'K', 'L', 'U', 'I'];

// ── Shared helpers ────────────────────────────────────────────────────────────

/** Melee AoE: damage enemies within `radius` of player */
function _meleeAoe(player, game, radius, dmg, effectType, color) {
    let hit = 0;
    for (const e of game.enemies) {
        if (e.dead) continue;
        const dx = e.x - player.x, dy = e.y - player.y;
        if (dx * dx + dy * dy < radius * radius) {
            e.takeDamage(dmg, effectType || 'physical', game);
            hit++;
        }
    }
    spawnExplosion(game.particles, player.x, player.y, 8, color || ['#ffffff', '#aaaaff'], 80, 5);
    return hit;
}

/** Get dash direction from held keys or toward nearest enemy */
function _dashDir(player, game) {
    const keys = game.keys;
    let dx = 0, dy = 0;
    if (keys['KeyW'] || keys['ArrowUp'])    dy -= 1;
    if (keys['KeyS'] || keys['ArrowDown'])  dy += 1;
    if (keys['KeyA'] || keys['ArrowLeft'])  dx -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) dx += 1;
    if (dx === 0 && dy === 0) {
        const t = game.nearestEnemy(player.x, player.y, 9999);
        if (t) { dx = t.x - player.x; dy = t.y - player.y; }
        else    { dx = player.facing; }
    }
    const len = Math.sqrt(dx * dx + dy * dy);
    return { dx: dx / len, dy: dy / len };
}

// ── BaseDash ability ──────────────────────────────────────────────────────────

class BaseDashAbility {
    constructor(player, slotIdx, opts) {
        this.player       = player;
        this.baseCooldown = opts.baseCooldown || 5;
        this.cooldown     = 0;
        this.key          = SLOT_KEYS[slotIdx]  || 'k';
        this.label        = SLOT_LABELS[slotIdx] || 'K';
        this.name         = opts.name     || 'Dash';
        this.iconKey      = opts.iconKey  || 'icon_dash';
        this.isDash       = true;

        this.dashSpeed    = opts.dashSpeed    || 700;
        this.dashDuration = opts.dashDuration || 0.18;
        this.grantInvincible = opts.grantInvincible !== false; // default true
        this.damagesEnemies  = opts.damagesEnemies  || false;
        this.trailColors     = opts.trailColors     || ['#4488ff', '#88ccff'];

        this.dashing   = false;
        this.dashTimer = 0;
        this.dashVx    = 0;
        this.dashVy    = 0;
        this.trailTimer = 0;
    }

    get maxCooldown() {
        return this.baseCooldown * (this.player.abilityCooldownMult || 1);
    }

    canUse() { return this.cooldown <= 0 && !this.dashing; }

    use(game) {
        if (!this.canUse()) return false;
        const { dx, dy } = _dashDir(this.player, game);
        this.dashVx = dx * this.dashSpeed;
        this.dashVy = dy * this.dashSpeed;
        this.dashing   = true;
        this.dashTimer = 0;
        this.trailTimer = 0;
        if (this.grantInvincible) {
            this.player.invincible = true;
            this.player.invincibleTimer = this.dashDuration + 0.05;
        }
        this.cooldown = this.maxCooldown;
        this.onDashStart && this.onDashStart(game);
        return true;
    }

    update(dt, game) {
        if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt);

        if (!this.dashing) return;
        this.dashTimer += dt;
        const p = this.player;

        // Move
        const nx = p.x + this.dashVx * dt;
        const ny = p.y + this.dashVy * dt;
        if (!game.currentRoom || !game.currentRoom.isWall(nx, p.y)) p.x = nx;
        if (!game.currentRoom || !game.currentRoom.isWall(p.x, ny)) p.y = ny;

        // Trail
        this.trailTimer += dt;
        if (this.trailTimer > 0.03) {
            this.trailTimer = 0;
            spawnExplosion(game.particles, p.x, p.y, 3, this.trailColors, 55, 6);
        }

        // Damage enemies during dash
        if (this.damagesEnemies) {
            for (const e of game.enemies) {
                if (e.dead) continue;
                const dx = e.x - p.x, dy = e.y - p.y;
                if (dx * dx + dy * dy < (e.size + 16) * (e.size + 16)) {
                    if (!e._dashHit) {
                        e._dashHit = true;
                        const dmg = p.baseAtk * p.atkMult * (p.abilityDmgMult || 1);
                        e.takeDamage(dmg, 'physical', game);
                    }
                }
            }
        }

        this.onDashUpdate && this.onDashUpdate(dt, game);

        if (this.dashTimer >= this.dashDuration) {
            this.dashing = false;
            if (this.grantInvincible) p.invincible = false;
            // Clear per-dash hit flags
            for (const e of game.enemies) e._dashHit = false;
            this.onDashEnd && this.onDashEnd(game);
        }
    }
}

// ── Abilities: Fireball (J), Dash (K), Ice Nova (L)

class FireballAbility {
    constructor(player) {
        this.player = player;
        this.baseCooldown = 4;
        this.cooldown = 0;
        this.key = 'j';
        this.name = 'Fireball';
        this.iconKey = 'icon_fireball';
    }

    get maxCooldown() {
        const p = this.player;
        return this.baseCooldown * (p.abilityCooldownMult||1) * (p.fireballCDMult||1);
    }

    canUse() { return this.cooldown <= 0; }

    use(game) {
        if (!this.canUse()) return false;
        const p = this.player;
        // Find nearest enemy
        const target = game.nearestEnemy(p.x, p.y, 9999);
        if (!target) return false;

        const dmg = (p.baseAtk * p.atkMult) * 2.5 * (p.fireballDmgMult || 1) * (p.isMage ? 1.5 : 1);
        const aoe = 80 * (p.fireballAoeMult || 1);

        const proj = new Projectile({
            x: p.x, y: p.y,
            tx: target.x, ty: target.y,
            target, homing: true,
            speed: 380, damage: dmg,
            size: 18, type: 'fireball',
            aoe,
            glowColor: '#ff8800',
            owner: 'player',
            onHit: (enemy, gm) => {
                // AOE blast
                for (const e of gm.enemies) {
                    if (e.dead) continue;
                    const dx = e.x - enemy.x, dy = e.y - enemy.y;
                    if (dx*dx + dy*dy < aoe*aoe) {
                        const dist = Math.sqrt(dx*dx+dy*dy);
                        const falloff = 1 - dist / aoe;
                        e.takeDamage(dmg * falloff, 'fire', gm);
                        e.applyEffect('burn', p.baseAtk * p.atkMult);
                    }
                }
                spawnExplosion(gm.particles, enemy.x, enemy.y, 18, ['#ff8800','#ffcc00','#ff4400'], 200, 7);
                gm.screenShake = Math.max(gm.screenShake, 0.5);
            }
        });
        game.projectiles.push(proj);
        this.cooldown = this.maxCooldown;
        return true;
    }

    update(dt) {
        if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt);
    }
}

class DashAbility extends BaseDashAbility {
    constructor(player) {
        super(player, 1, {
            baseCooldown: 5,
            name: 'Dash',
            iconKey: 'icon_dash',
            dashSpeed: 700,
            dashDuration: 0.18,
            trailColors: ['#4488ff', '#88ccff', '#aaddff'],
        });
    }
}

class IceNovaAbility {
    constructor(player) {
        this.player = player;
        this.baseCooldown = 10;
        this.cooldown = 0;
        this.key = 'l';
        this.name = 'Ice Nova';
        this.iconKey = 'icon_nova';
    }

    get maxCooldown() {
        return this.baseCooldown * (this.player.abilityCooldownMult||1);
    }

    canUse() { return this.cooldown <= 0; }

    use(game) {
        if (!this.canUse()) return false;
        const p = this.player;
        const radius = 180 * (p.novaRadiusMult || 1);
        const dmg = (p.baseAtk * p.atkMult) * 3 * (p.novaDmgMult || 1) * (p.isMage ? 1.5 : 1);

        for (const e of game.enemies) {
            if (e.dead) continue;
            const dx = e.x - p.x, dy = e.y - p.y;
            if (dx*dx + dy*dy < radius*radius) {
                e.takeDamage(dmg, 'ice', game);
                e.applyEffect('freeze', dmg);
            }
        }

        // Visual: spawn ice particles
        for (let i = 0; i < 30; i++) {
            const angle = (i / 30) * Math.PI * 2;
            const r = radius * (0.5 + Math.random()*0.5);
            spawnExplosion(game.particles, p.x + Math.cos(angle)*r*0.5, p.y + Math.sin(angle)*r*0.5,
                2, ['#88ccff','#aaddff','#cceeFF'], 80, 6);
        }
        game.screenShake = Math.max(game.screenShake, 0.8);
        this.cooldown = this.maxCooldown;
        return true;
    }

    update(dt) {
        if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt);
    }
}

// ══════════════════════════════════════════════════════════════════════════════
//  NEW CLASS ABILITIES
// ══════════════════════════════════════════════════════════════════════════════

// ─── Human Adventurer ────────────────────────────────────────────────────────

class QuickSlashAbility {
    constructor(player, slotIdx) {
        this.player = player; this.baseCooldown = 3; this.cooldown = 0;
        this.key = SLOT_KEYS[slotIdx]; this.label = SLOT_LABELS[slotIdx];
        this.name = 'Quick Slash'; this.iconKey = 'icon_quick_slash';
    }
    get maxCooldown() { return this.baseCooldown * (this.player.abilityCooldownMult || 1); }
    canUse() { return this.cooldown <= 0; }
    use(game) {
        if (!this.canUse()) return false;
        const p = this.player;
        const dmg = p.baseAtk * p.atkMult * 1.8 * (p.abilityDmgMult || 1);
        _meleeAoe(p, game, 100, dmg, 'physical', ['#ffcc88','#ffee99','#ffffff']);
        game.screenShake = Math.max(game.screenShake, 0.25);
        this.cooldown = this.maxCooldown; return true;
    }
    update(dt) { if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt); }
}

class DashStrikeAbility extends BaseDashAbility {
    constructor(player, slotIdx) {
        super(player, slotIdx, { baseCooldown: 5, name: 'Dash Strike', iconKey: 'icon_dash_strike',
            dashSpeed: 900, dashDuration: 0.14, damagesEnemies: true,
            trailColors: ['#ffaa44','#ff6622','#ffffff'] });
    }
}

// ─── Fire Mage ───────────────────────────────────────────────────────────────

class FireballShotAbility {
    constructor(player, slotIdx) {
        this.player = player; this.baseCooldown = 4; this.cooldown = 0;
        this.key = SLOT_KEYS[slotIdx]; this.label = SLOT_LABELS[slotIdx];
        this.name = 'Fireball'; this.iconKey = 'icon_fireball';
    }
    get maxCooldown() {
        const p = this.player;
        return this.baseCooldown * (p.abilityCooldownMult || 1) * (p.fireballCDMult || 1);
    }
    canUse() { return this.cooldown <= 0; }
    use(game) {
        if (!this.canUse()) return false;
        const p = this.player;
        const target = game.nearestEnemy(p.x, p.y, 9999);
        if (!target) return false;
        const dmg = p.baseAtk * p.atkMult * 2.5 * (p.fireballDmgMult || 1) * (p.abilityDmgMult || 1);
        const aoe = 80 * (p.fireballAoeMult || 1);
        game.projectiles.push(new Projectile({
            x: p.x, y: p.y, tx: target.x, ty: target.y, target, homing: true,
            speed: 380, damage: dmg, size: 18, type: 'fireball', aoe,
            glowColor: '#ff8800', owner: 'player',
            onHit: (enemy, gm) => {
                for (const e of gm.enemies) {
                    if (e.dead) continue;
                    const dx = e.x - enemy.x, dy = e.y - enemy.y;
                    if (dx*dx+dy*dy < aoe*aoe) {
                        const dist = Math.sqrt(dx*dx+dy*dy);
                        e.takeDamage(dmg*(1-dist/aoe), 'fire', gm);
                        e.applyEffect('burn', p.baseAtk*p.atkMult);
                    }
                }
                spawnExplosion(gm.particles, enemy.x, enemy.y, 18, ['#ff8800','#ffcc00','#ff4400'], 200, 7);
                gm.screenShake = Math.max(gm.screenShake, 0.5);
            }
        }));
        this.cooldown = this.maxCooldown; return true;
    }
    update(dt) { if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt); }
}

class FlameDashAbility extends BaseDashAbility {
    constructor(player, slotIdx) {
        super(player, slotIdx, { baseCooldown: 6, name: 'Flame Dash', iconKey: 'icon_flame_dash',
            dashSpeed: 650, dashDuration: 0.22, trailColors: ['#ff8800','#ffcc00','#ff4400'] });
        this._fireTrailTimer = 0;
    }
    onDashUpdate(dt, game) {
        this._fireTrailTimer += dt;
        if (this._fireTrailTimer > 0.06) {
            this._fireTrailTimer = 0;
            const p = this.player;
            for (const e of game.enemies) {
                if (e.dead) continue;
                const dx = e.x-p.x, dy = e.y-p.y;
                if (dx*dx+dy*dy < 40*40) {
                    const dmg = p.baseAtk*p.atkMult*0.4*(p.abilityDmgMult||1);
                    e.takeDamage(dmg,'fire',game); e.applyEffect('burn',p.baseAtk*p.atkMult*0.5);
                }
            }
        }
    }
}

// ─── Ranger ──────────────────────────────────────────────────────────────────

class PiercingArrowAbility {
    constructor(player, slotIdx) {
        this.player = player; this.baseCooldown = 4; this.cooldown = 0;
        this.key = SLOT_KEYS[slotIdx]; this.label = SLOT_LABELS[slotIdx];
        this.name = 'Piercing Arrow'; this.iconKey = 'icon_piercing_arrow';
    }
    get maxCooldown() { return this.baseCooldown * (this.player.abilityCooldownMult || 1); }
    canUse() { return this.cooldown <= 0; }
    use(game) {
        if (!this.canUse()) return false;
        const p = this.player;
        const target = game.nearestEnemy(p.x, p.y, 9999);
        if (!target) return false;
        const dmg = p.baseAtk*p.atkMult*2.0*(p.abilityDmgMult||1);
        const hitSet = new Set();
        game.projectiles.push(new Projectile({
            x: p.x, y: p.y, tx: target.x, ty: target.y,
            speed: 520, damage: dmg, size: 8, type: 'arrow', color: '#88ffcc',
            owner: 'player', maxLife: 1.5, piercing: true,
            onHit: (enemy, gm) => {
                if (hitSet.has(enemy)) return; hitSet.add(enemy);
                spawnExplosion(gm.particles, enemy.x, enemy.y, 4, ['#88ffcc','#ffffff'], 80, 4);
            }
        }));
        this.cooldown = this.maxCooldown; return true;
    }
    update(dt) { if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt); }
}

class RollDashAbility extends BaseDashAbility {
    constructor(player, slotIdx) {
        super(player, slotIdx, { baseCooldown: 3.5, name: 'Roll Dash', iconKey: 'icon_roll_dash',
            dashSpeed: 980, dashDuration: 0.12, trailColors: ['#88ffcc','#44ddaa','#ffffff'] });
    }
}

// ─── Frost Knight ─────────────────────────────────────────────────────────────

class IceSlamAbility {
    constructor(player, slotIdx) {
        this.player = player; this.baseCooldown = 5; this.cooldown = 0;
        this.key = SLOT_KEYS[slotIdx]; this.label = SLOT_LABELS[slotIdx];
        this.name = 'Ice Slam'; this.iconKey = 'icon_ice_slam';
    }
    get maxCooldown() { return this.baseCooldown*(this.player.abilityCooldownMult||1); }
    canUse() { return this.cooldown <= 0; }
    use(game) {
        if (!this.canUse()) return false;
        const p = this.player;
        const dmg = p.baseAtk*p.atkMult*2.2*(p.abilityDmgMult||1);
        for (const e of game.enemies) {
            if (e.dead) continue;
            const dx=e.x-p.x, dy=e.y-p.y;
            if (dx*dx+dy*dy < 130*130) { e.takeDamage(dmg,'ice',game); e.applyEffect('freeze',dmg); }
        }
        spawnExplosion(game.particles, p.x, p.y, 12, ['#88ccff','#aaddff','#cceeFF'], 120, 6);
        game.screenShake = Math.max(game.screenShake, 0.4);
        this.cooldown = this.maxCooldown; return true;
    }
    update(dt) { if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt); }
}

class ShieldDashAbility extends BaseDashAbility {
    constructor(player, slotIdx) {
        super(player, slotIdx, { baseCooldown: 7, name: 'Shield Dash', iconKey: 'icon_shield_dash',
            dashSpeed: 500, dashDuration: 0.32, grantInvincible: true,
            trailColors: ['#aaddff','#6688cc','#ccccff'] });
    }
}

class FrostArmorAbility {
    constructor(player, slotIdx) {
        this.player = player; this.baseCooldown = 12; this.cooldown = 0;
        this.key = SLOT_KEYS[slotIdx]; this.label = SLOT_LABELS[slotIdx];
        this.name = 'Frost Armor'; this.iconKey = 'icon_frost_armor';
        this._active = false; this._timer = 0; this._duration = 5;
    }
    get maxCooldown() { return this.baseCooldown*(this.player.abilityCooldownMult||1); }
    canUse() { return this.cooldown <= 0; }
    use(game) {
        if (!this.canUse()) return false;
        this._active = true; this._timer = 0; this.player._frostArmor = true;
        spawnExplosion(game.particles, this.player.x, this.player.y, 10, ['#aaddff','#88ccff'], 100, 5);
        this.cooldown = this.maxCooldown; return true;
    }
    update(dt) {
        if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt);
        if (this._active) { this._timer += dt; if (this._timer >= this._duration) { this._active = false; this.player._frostArmor = false; } }
    }
}

// ─── Venom Rogue ──────────────────────────────────────────────────────────────

class ToxicDaggersAbility {
    constructor(player, slotIdx) {
        this.player = player; this.baseCooldown = 4; this.cooldown = 0;
        this.key = SLOT_KEYS[slotIdx]; this.label = SLOT_LABELS[slotIdx];
        this.name = 'Toxic Daggers'; this.iconKey = 'icon_toxic_daggers';
    }
    get maxCooldown() { return this.baseCooldown*(this.player.abilityCooldownMult||1); }
    canUse() { return this.cooldown <= 0; }
    use(game) {
        if (!this.canUse()) return false;
        const p = this.player;
        const targets = game.enemies.filter(e=>!e.dead)
            .sort((a,b)=>(a.x-p.x)**2+(a.y-p.y)**2 - ((b.x-p.x)**2+(b.y-p.y)**2)).slice(0,3);
        const dmg = p.baseAtk*p.atkMult*1.2*(p.abilityDmgMult||1);
        for (const t of targets) {
            game.projectiles.push(new Projectile({
                x:p.x, y:p.y, tx:t.x, ty:t.y, target:t, homing:true,
                speed:460, damage:dmg, size:7, type:'arrow', color:'#88ff44',
                owner:'player', maxLife:1.5,
                onHit:(enemy,gm)=>{ enemy.applyEffect('poison',dmg*(p.poisonDmgMult||1));
                    spawnExplosion(gm.particles,enemy.x,enemy.y,4,['#88ff44','#44cc00'],80,4); }
            }));
        }
        this.cooldown = this.maxCooldown; return true;
    }
    update(dt) { if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt); }
}

class ShadowDashAbility extends BaseDashAbility {
    constructor(player, slotIdx) {
        super(player, slotIdx, { baseCooldown: 6, name: 'Shadow Dash', iconKey: 'icon_shadow_dash',
            dashSpeed: 820, dashDuration: 0.20, trailColors: ['#442266','#8833aa','#220044'] });
        this._stealthTimer = 0; this._stealthDuration = 1.5;
    }
    onDashStart(game) { this.player._stealth = true; this._stealthTimer = 0; }
    update(dt, game) {
        super.update(dt, game);
        if (this.player._stealth) { this._stealthTimer += dt; if (this._stealthTimer >= this._stealthDuration) this.player._stealth = false; }
    }
}

class PoisonCloudAbility {
    constructor(player, slotIdx) {
        this.player = player; this.baseCooldown = 9; this.cooldown = 0;
        this.key = SLOT_KEYS[slotIdx]; this.label = SLOT_LABELS[slotIdx];
        this.name = 'Poison Cloud'; this.iconKey = 'icon_poison_cloud';
        this._clouds = [];
    }
    get maxCooldown() { return this.baseCooldown*(this.player.abilityCooldownMult||1); }
    canUse() { return this.cooldown <= 0; }
    use(game) {
        if (!this.canUse()) return false;
        const p = this.player;
        this._clouds.push({x:p.x,y:p.y,life:0,maxLife:5,radius:80,dmgTimer:0});
        spawnExplosion(game.particles,p.x,p.y,12,['#88ff44','#44cc00','#aaffaa'],60,5);
        this.cooldown = this.maxCooldown; return true;
    }
    update(dt, game) {
        if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt);
        const p = this.player;
        for (const c of this._clouds) {
            c.life += dt; c.dmgTimer += dt;
            if (c.dmgTimer >= 0.5) {
                c.dmgTimer = 0;
                for (const e of game.enemies) {
                    if (e.dead) continue;
                    const dx=e.x-c.x, dy=e.y-c.y;
                    if (dx*dx+dy*dy < c.radius*c.radius) {
                        const dmg=p.baseAtk*p.atkMult*0.6*(p.poisonDmgMult||1)*(p.abilityDmgMult||1);
                        e.takeDamage(dmg,'poison',game); e.applyEffect('poison',dmg);
                    }
                }
                spawnExplosion(game.particles,c.x+(Math.random()-0.5)*60,c.y+(Math.random()-0.5)*60,2,['#88ff44','#44cc00'],50,4);
            }
        }
        this._clouds = this._clouds.filter(c=>c.life < c.maxLife);
    }
}

// ─── Stormcaller ──────────────────────────────────────────────────────────────

class ChainBoltAbility {
    constructor(player, slotIdx) {
        this.player = player; this.baseCooldown = 5; this.cooldown = 0;
        this.key = SLOT_KEYS[slotIdx]; this.label = SLOT_LABELS[slotIdx];
        this.name = 'Chain Bolt'; this.iconKey = 'icon_chain_bolt';
    }
    get maxCooldown() { return this.baseCooldown*(this.player.abilityCooldownMult||1); }
    canUse() { return this.cooldown <= 0; }
    use(game) {
        if (!this.canUse()) return false;
        const p = this.player;
        const target = game.nearestEnemy(p.x, p.y, 9999);
        if (!target) return false;
        const dmg = p.baseAtk*p.atkMult*2.0*(p.abilityDmgMult||1);
        const chained = new Set([target]); let current = target;
        for (let i=0; i<3; i++) {
            let best=null, bestDist=200*200;
            for (const e of game.enemies) {
                if (e.dead||chained.has(e)) continue;
                const dx=e.x-current.x, dy=e.y-current.y, d2=dx*dx+dy*dy;
                if (d2<bestDist) { bestDist=d2; best=e; }
            }
            if (!best) break; chained.add(best); current=best;
        }
        let ox=p.x, oy=p.y;
        for (const e of chained) {
            game.projectiles.push(new Projectile({
                x:ox, y:oy, tx:e.x, ty:e.y, target:e, homing:true,
                speed:600, damage:dmg, size:8, type:'arrow',
                color:'#ffff44', glowColor:'#ffee00', owner:'player', maxLife:1,
                onHit:(enemy,gm)=>{ enemy.applyEffect('shock',dmg); spawnExplosion(gm.particles,enemy.x,enemy.y,5,['#ffff44','#ffcc00'],100,5); }
            }));
            ox=e.x; oy=e.y;
        }
        this.cooldown = this.maxCooldown; return true;
    }
    update(dt) { if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt); }
}

class BlinkDashAbility {
    constructor(player, slotIdx) {
        this.player = player; this.baseCooldown = 5; this.cooldown = 0;
        this.key = SLOT_KEYS[slotIdx]; this.label = SLOT_LABELS[slotIdx];
        this.name = 'Blink Dash'; this.iconKey = 'icon_blink_dash';
        this.isDash = true; this.dashing = false;
    }
    get maxCooldown() { return this.baseCooldown*(this.player.abilityCooldownMult||1); }
    canUse() { return this.cooldown <= 0; }
    use(game) {
        if (!this.canUse()) return false;
        const p = this.player;
        const {dx,dy} = _dashDir(p, game);
        const nx=Math.max(30,Math.min(770,p.x+dx*180)), ny=Math.max(30,Math.min(570,p.y+dy*180));
        spawnExplosion(game.particles,p.x,p.y,8,['#ffff44','#ffffaa','#ffffff'],100,5);
        p.x=nx; p.y=ny;
        spawnExplosion(game.particles,p.x,p.y,8,['#ffff44','#ffffaa','#ffffff'],100,5);
        p.invincible=true; p.invincibleTimer=0.15;
        this.cooldown = this.maxCooldown; return true;
    }
    update(dt) { if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt); }
}

class ThunderRingAbility {
    constructor(player, slotIdx) {
        this.player = player; this.baseCooldown = 11; this.cooldown = 0;
        this.key = SLOT_KEYS[slotIdx]; this.label = SLOT_LABELS[slotIdx];
        this.name = 'Thunder Ring'; this.iconKey = 'icon_thunder_ring';
    }
    get maxCooldown() { return this.baseCooldown*(this.player.abilityCooldownMult||1); }
    canUse() { return this.cooldown <= 0; }
    use(game) {
        if (!this.canUse()) return false;
        const p=this.player, radius=200, dmg=p.baseAtk*p.atkMult*3.0*(p.abilityDmgMult||1);
        for (const e of game.enemies) {
            if (e.dead) continue;
            const dx=e.x-p.x, dy=e.y-p.y;
            if (dx*dx+dy*dy < radius*radius) { e.takeDamage(dmg,'lightning',game); e.applyEffect('shock',dmg); }
        }
        for (let i=0; i<24; i++) {
            const a=(i/24)*Math.PI*2, r=radius*(0.3+Math.random()*0.7);
            spawnExplosion(game.particles,p.x+Math.cos(a)*r*0.7,p.y+Math.sin(a)*r*0.7,3,['#ffff44','#ffee00','#ffffff'],120,5);
        }
        game.screenShake=Math.max(game.screenShake,0.7);
        this.cooldown=this.maxCooldown; return true;
    }
    update(dt) { if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt); }
}

// ─── Necromancer (Epic) ───────────────────────────────────────────────────────

class BoneSpearAbility {
    constructor(player, slotIdx) {
        this.player=player; this.baseCooldown=4; this.cooldown=0;
        this.key=SLOT_KEYS[slotIdx]; this.label=SLOT_LABELS[slotIdx];
        this.name='Bone Spear'; this.iconKey='icon_bone_spear';
    }
    get maxCooldown() { return this.baseCooldown*(this.player.abilityCooldownMult||1); }
    canUse() { return this.cooldown<=0; }
    use(game) {
        if (!this.canUse()) return false;
        const p=this.player, target=game.nearestEnemy(p.x,p.y,9999);
        if (!target) return false;
        const dmg=p.baseAtk*p.atkMult*2.5*(p.abilityDmgMult||1), hit=new Set();
        game.projectiles.push(new Projectile({
            x:p.x, y:p.y, tx:target.x, ty:target.y,
            speed:480, damage:dmg, size:10, type:'arrow', color:'#ccddbb',
            owner:'player', maxLife:1.5, piercing:true,
            onHit:(enemy,gm)=>{ if(hit.has(enemy))return; hit.add(enemy);
                spawnExplosion(gm.particles,enemy.x,enemy.y,5,['#ccddbb','#ffffff'],80,4); }
        }));
        this.cooldown=this.maxCooldown; return true;
    }
    update(dt) { if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt); }
}

class WraithDashAbility extends BaseDashAbility {
    constructor(player, slotIdx) {
        super(player, slotIdx, { baseCooldown:6, name:'Wraith Dash', iconKey:'icon_wraith_dash',
            dashSpeed:750, dashDuration:0.20, trailColors:['#6633aa','#9944cc','#ccaaff'] });
        this._dmgTimer=0;
    }
    onDashUpdate(dt, game) {
        this._dmgTimer+=dt;
        if (this._dmgTimer>0.05) {
            this._dmgTimer=0; const p=this.player;
            const dmg=p.baseAtk*p.atkMult*0.5*(p.abilityDmgMult||1);
            for (const e of game.enemies) {
                if (e.dead) continue;
                const dx=e.x-p.x, dy=e.y-p.y;
                if (dx*dx+dy*dy<40*40) e.takeDamage(dmg,'dark',game);
            }
        }
    }
}

class RaiseSkeletonAbility {
    constructor(player, slotIdx) {
        this.player=player; this.baseCooldown=14; this.cooldown=0;
        this.key=SLOT_KEYS[slotIdx]; this.label=SLOT_LABELS[slotIdx];
        this.name='Raise Skeleton'; this.iconKey='icon_raise_skeleton';
    }
    get maxCooldown() { return this.baseCooldown*(this.player.abilityCooldownMult||1); }
    canUse() { return this.cooldown<=0; }
    use(game) {
        if (!this.canUse()) return false;
        const p=this.player, buff=p.minionBuff||1;
        const minion=new SummonedMinion(p.x+(Math.random()-0.5)*60, p.y+40, p, {
            hp:60*buff, atk:12*buff, speed:90, range:50, atkInterval:1.2, duration:20,
            color:'#ccddbb', spriteKey:'enemy_skeleton'
        });
        if (!game.allies) game.allies=[];
        game.allies.push(minion);
        spawnExplosion(game.particles,p.x,p.y,10,['#ccddbb','#ffffff','#aaaaaa'],80,5);
        this.cooldown=this.maxCooldown; return true;
    }
    update(dt) { if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt); }
}

class SoulBurstAbility {
    constructor(player, slotIdx) {
        this.player=player; this.baseCooldown=10; this.cooldown=0;
        this.key=SLOT_KEYS[slotIdx]; this.label=SLOT_LABELS[slotIdx];
        this.name='Soul Burst'; this.iconKey='icon_soul_burst';
    }
    get maxCooldown() { return this.baseCooldown*(this.player.abilityCooldownMult||1); }
    canUse() { return this.cooldown<=0; }
    use(game) {
        if (!this.canUse()) return false;
        const p=this.player, dmg=p.baseAtk*p.atkMult*3.5*(p.abilityDmgMult||1);
        for (let i=0; i<5; i++) {
            const angle=(i/5)*Math.PI*2;
            game.projectiles.push(new Projectile({
                x:p.x, y:p.y, tx:p.x+Math.cos(angle)*200, ty:p.y+Math.sin(angle)*200,
                speed:280, damage:dmg*0.5, size:12, type:'fireball',
                color:'#9944cc', glowColor:'#6622aa', owner:'player', maxLife:1,
                onHit:(enemy,gm)=>{
                    for(const e of gm.enemies){ if(e.dead)continue; const dx=e.x-enemy.x,dy=e.y-enemy.y; if(dx*dx+dy*dy<60*60) e.takeDamage(dmg*0.7,'dark',gm); }
                    spawnExplosion(gm.particles,enemy.x,enemy.y,8,['#9944cc','#cc66ff','#ffffff'],100,5);
                }
            }));
        }
        game.screenShake=Math.max(game.screenShake,0.6);
        this.cooldown=this.maxCooldown; return true;
    }
    update(dt) { if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt); }
}

// ─── Gunslinger ───────────────────────────────────────────────────────────────

class RevolverShotAbility {
    constructor(player, slotIdx) {
        this.player=player; this.baseCooldown=3.5; this.cooldown=0;
        this.key=SLOT_KEYS[slotIdx]; this.label=SLOT_LABELS[slotIdx];
        this.name='Revolver Shot'; this.iconKey='icon_revolver_shot';
    }
    get maxCooldown() { return this.baseCooldown*(this.player.abilityCooldownMult||1); }
    canUse() { return this.cooldown<=0; }
    use(game) {
        if (!this.canUse()) return false;
        const p=this.player, target=game.nearestEnemy(p.x,p.y,9999);
        if (!target) return false;
        const dmg=p.baseAtk*p.atkMult*3.5*(p.abilityDmgMult||1);
        game.projectiles.push(new Projectile({
            x:p.x, y:p.y, tx:target.x, ty:target.y, target, homing:true,
            speed:560, damage:dmg, size:10, type:'arrow',
            color:'#ffdd66', glowColor:'#ffcc00', owner:'player', maxLife:1.5,
            onHit:(enemy,gm)=>{ enemy.knockback(p.x,p.y,200);
                spawnExplosion(gm.particles,enemy.x,enemy.y,6,['#ffdd66','#ffcc00','#ffffff'],120,5);
                gm.screenShake=Math.max(gm.screenShake,0.3); }
        }));
        this.cooldown=this.maxCooldown; return true;
    }
    update(dt) { if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt); }
}

class CombatRollAbility extends BaseDashAbility {
    constructor(player, slotIdx) {
        super(player, slotIdx, { baseCooldown:4, name:'Combat Roll', iconKey:'icon_combat_roll',
            dashSpeed:850, dashDuration:0.13, trailColors:['#ffdd66','#aa8833','#ffffff'] });
    }
    onDashEnd(game) { this.player.atkCooldown=Math.max(0,this.player.atkCooldown-0.5); }
}

class RicochetBulletAbility {
    constructor(player, slotIdx) {
        this.player=player; this.baseCooldown=6; this.cooldown=0;
        this.key=SLOT_KEYS[slotIdx]; this.label=SLOT_LABELS[slotIdx];
        this.name='Ricochet Bullet'; this.iconKey='icon_ricochet_bullet';
    }
    get maxCooldown() { return this.baseCooldown*(this.player.abilityCooldownMult||1); }
    canUse() { return this.cooldown<=0; }
    use(game) {
        if (!this.canUse()) return false;
        const p=this.player, dmg=p.baseAtk*p.atkMult*1.8*(p.abilityDmgMult||1);
        let bounceCount=0; const hit=new Set();
        const fire=(ox,oy,target)=>{
            if (!target||bounceCount>=4) return;
            game.projectiles.push(new Projectile({
                x:ox, y:oy, tx:target.x, ty:target.y, target, homing:true,
                speed:500, damage:dmg, size:8, type:'arrow', color:'#ffdd66', owner:'player', maxLife:1.2,
                onHit:(enemy,gm)=>{
                    hit.add(enemy); bounceCount++;
                    spawnExplosion(gm.particles,enemy.x,enemy.y,4,['#ffdd66','#ffffff'],80,4);
                    let next=null, bd=200*200;
                    for(const e of gm.enemies){ if(e.dead||hit.has(e))continue; const dx=e.x-enemy.x,dy=e.y-enemy.y,d2=dx*dx+dy*dy; if(d2<bd){bd=d2;next=e;} }
                    if(next) setTimeout(()=>fire(enemy.x,enemy.y,next),0);
                }
            }));
        };
        const first=game.nearestEnemy(p.x,p.y,9999);
        if (!first) return false;
        fire(p.x,p.y,first); this.cooldown=this.maxCooldown; return true;
    }
    update(dt) { if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt); }
}

class BulletStormAbility {
    constructor(player, slotIdx) {
        this.player=player; this.baseCooldown=14; this.cooldown=0;
        this.key=SLOT_KEYS[slotIdx]; this.label=SLOT_LABELS[slotIdx];
        this.name='Bullet Storm'; this.iconKey='icon_bullet_storm';
        this._burstTimer=0; this._burstCount=0; this._active=false;
    }
    get maxCooldown() { return this.baseCooldown*(this.player.abilityCooldownMult||1); }
    canUse() { return this.cooldown<=0 && !this._active; }
    use(game) {
        if (!this.canUse()) return false;
        this._active=true; this._burstCount=0; this._burstTimer=0;
        this.cooldown=this.maxCooldown; return true;
    }
    update(dt, game) {
        if (this.cooldown>0) this.cooldown=Math.max(0,this.cooldown-dt);
        if (!this._active) return;
        this._burstTimer+=dt;
        if (this._burstTimer>=0.1) {
            this._burstTimer=0; this._burstCount++;
            const p=this.player, target=game.nearestEnemy(p.x,p.y,9999);
            if (target) {
                const dmg=p.baseAtk*p.atkMult*1.0*(p.abilityDmgMult||1);
                game.projectiles.push(new Projectile({
                    x:p.x, y:p.y, tx:target.x, ty:target.y, target, homing:true,
                    speed:520, damage:dmg, size:8, type:'arrow', color:'#ffdd66', owner:'player', maxLife:1.2,
                    onHit:(enemy,gm)=>spawnExplosion(gm.particles,enemy.x,enemy.y,3,['#ffdd66'],60,3)
                }));
            }
            if (this._burstCount>=12) this._active=false;
        }
    }
}

// ─── Paladin ──────────────────────────────────────────────────────────────────

class HolyStrikeAbility {
    constructor(player, slotIdx) {
        this.player=player; this.baseCooldown=4; this.cooldown=0;
        this.key=SLOT_KEYS[slotIdx]; this.label=SLOT_LABELS[slotIdx];
        this.name='Holy Strike'; this.iconKey='icon_holy_strike';
    }
    get maxCooldown() { return this.baseCooldown*(this.player.abilityCooldownMult||1); }
    canUse() { return this.cooldown<=0; }
    use(game) {
        if (!this.canUse()) return false;
        const p=this.player, dmg=p.baseAtk*p.atkMult*2.5*(p.abilityDmgMult||1);
        _meleeAoe(p,game,120,dmg,'holy',['#ffeeaa','#ffffcc','#ffffff']);
        game.screenShake=Math.max(game.screenShake,0.3);
        this.cooldown=this.maxCooldown; return true;
    }
    update(dt) { if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt); }
}

class DivineDashAbility extends BaseDashAbility {
    constructor(player, slotIdx) {
        super(player, slotIdx, { baseCooldown:7, name:'Divine Dash', iconKey:'icon_divine_dash',
            dashSpeed:600, dashDuration:0.25, grantInvincible:true, trailColors:['#ffffaa','#ffeecc','#ffffff'] });
    }
    onDashEnd(game) {
        const p=this.player, dmg=p.baseAtk*p.atkMult*1.5*(p.abilityDmgMult||1);
        _meleeAoe(p,game,100,dmg,'holy',['#ffeeaa','#ffffff']);
    }
}

class HealWaveAbility {
    constructor(player, slotIdx) {
        this.player=player; this.baseCooldown=12; this.cooldown=0;
        this.key=SLOT_KEYS[slotIdx]; this.label=SLOT_LABELS[slotIdx];
        this.name='Heal Wave'; this.iconKey='icon_heal_wave';
    }
    get maxCooldown() { return this.baseCooldown*(this.player.abilityCooldownMult||1); }
    canUse() { return this.cooldown<=0; }
    use(game) {
        if (!this.canUse()) return false;
        const p=this.player;
        const healAmt=Math.floor(p.maxHp*0.25*(p.healingMult||1));
        const healed=Math.min(healAmt,p.maxHp-p.hp);
        p.hp=Math.min(p.maxHp,p.hp+healed);
        if (healed>0&&game.addDamageNumber) game.addDamageNumber(p.x,p.y-40,healed,'#44ff88',{role:'player'});
        for (let i=0;i<16;i++) {
            const a=(i/16)*Math.PI*2;
            spawnExplosion(game.particles,p.x+Math.cos(a)*50,p.y+Math.sin(a)*50,2,['#44ff88','#aaFFcc','#ffffff'],80,5);
        }
        this.cooldown=this.maxCooldown; return true;
    }
    update(dt) { if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt); }
}

class JudgmentBeamAbility {
    constructor(player, slotIdx) {
        this.player=player; this.baseCooldown=10; this.cooldown=0;
        this.key=SLOT_KEYS[slotIdx]; this.label=SLOT_LABELS[slotIdx];
        this.name='Judgment Beam'; this.iconKey='icon_judgment_beam';
    }
    get maxCooldown() { return this.baseCooldown*(this.player.abilityCooldownMult||1); }
    canUse() { return this.cooldown<=0; }
    use(game) {
        if (!this.canUse()) return false;
        const p=this.player, beamLen=700, beamW=40, bx=p.facing>0?1:-1;
        const dmg=p.baseAtk*p.atkMult*4.0*(p.abilityDmgMult||1);
        for (const e of game.enemies) {
            if (e.dead) continue;
            const ex=e.x-p.x, ey=e.y-p.y, proj=ex*bx, perp=Math.abs(ey);
            if (proj>0&&proj<beamLen&&perp<beamW+e.size) e.takeDamage(dmg,'holy',game);
        }
        for (let i=0;i<20;i++) {
            const t=i/20;
            spawnExplosion(game.particles,p.x+bx*beamLen*t,p.y+(Math.random()-0.5)*beamW,2,['#ffeeaa','#ffffcc','#ffffff'],120,5);
        }
        game.screenShake=Math.max(game.screenShake,0.5);
        this.cooldown=this.maxCooldown; return true;
    }
    update(dt) { if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt); }
}

// ─── Dragon Knight ────────────────────────────────────────────────────────────

class FlameClawAbility {
    constructor(player, slotIdx) {
        this.player=player; this.baseCooldown=3; this.cooldown=0;
        this.key=SLOT_KEYS[slotIdx]; this.label=SLOT_LABELS[slotIdx];
        this.name='Flame Claw'; this.iconKey='icon_flame_claw';
    }
    get maxCooldown() { return this.baseCooldown*(this.player.abilityCooldownMult||1); }
    canUse() { return this.cooldown<=0; }
    use(game) {
        if (!this.canUse()) return false;
        const p=this.player, dmg=p.baseAtk*p.atkMult*2.0*(p.abilityDmgMult||1);
        for (const e of game.enemies) {
            if (e.dead) continue;
            const dx=e.x-p.x, dy=e.y-p.y;
            if (dx*dx+dy*dy<110*110) { e.takeDamage(dmg,'fire',game); e.applyEffect('burn',p.baseAtk*p.atkMult*(p.burnDurationMult||1)); }
        }
        spawnExplosion(game.particles,p.x+p.facing*30,p.y,10,['#ff6600','#ffcc00','#ff3300'],120,6);
        this.cooldown=this.maxCooldown; return true;
    }
    update(dt) { if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt); }
}

class InfernoDashAbility extends BaseDashAbility {
    constructor(player, slotIdx) {
        super(player, slotIdx, { baseCooldown:6, name:'Inferno Dash', iconKey:'icon_inferno_dash',
            dashSpeed:700, dashDuration:0.28, damagesEnemies:true, trailColors:['#ff6600','#ffcc00','#ff3300','#ffffff'] });
    }
    onDashUpdate(dt, game) {
        if (Math.random()<dt*10) {
            const p=this.player;
            for (const e of game.enemies) { if (e.dead)continue; const dx=e.x-p.x,dy=e.y-p.y; if(dx*dx+dy*dy<50*50)e.applyEffect('burn',p.baseAtk*p.atkMult); }
        }
    }
}

class DragonBreathAbility {
    constructor(player, slotIdx) {
        this.player=player; this.baseCooldown=8; this.cooldown=0;
        this.key=SLOT_KEYS[slotIdx]; this.label=SLOT_LABELS[slotIdx];
        this.name='Dragon Breath'; this.iconKey='icon_dragon_breath';
        this._active=false; this._timer=0; this._duration=1.5;
    }
    get maxCooldown() { return this.baseCooldown*(this.player.abilityCooldownMult||1); }
    canUse() { return this.cooldown<=0&&!this._active; }
    use(game) {
        if (!this.canUse()) return false;
        this._active=true; this._timer=0; this.cooldown=this.maxCooldown; return true;
    }
    update(dt, game) {
        if (this.cooldown>0) this.cooldown=Math.max(0,this.cooldown-dt);
        if (!this._active) return;
        this._timer+=dt;
        if (this._timer>=this._duration) { this._active=false; return; }
        const p=this.player;
        for (const e of game.enemies) {
            if (e.dead) continue;
            const ex=e.x-p.x, ey=e.y-p.y, dist=Math.sqrt(ex*ex+ey*ey);
            if (dist>220) continue;
            const dot=(ex*p.facing)/dist;
            if (dot>0.5) {
                const dmg=p.baseAtk*p.atkMult*0.8*dt*(p.abilityDmgMult||1);
                e.takeDamage(dmg,'fire',game);
                if (Math.random()<dt*3) e.applyEffect('burn',p.baseAtk*p.atkMult);
            }
        }
        if (Math.random()<dt*15) spawnExplosion(game.particles,p.x+p.facing*60+(Math.random()-0.5)*40,p.y+(Math.random()-0.5)*40,2,['#ff6600','#ffcc00','#ff3300'],80,4);
    }
}

class LavaEruptionAbility {
    constructor(player, slotIdx) {
        this.player=player; this.baseCooldown=12; this.cooldown=0;
        this.key=SLOT_KEYS[slotIdx]; this.label=SLOT_LABELS[slotIdx];
        this.name='Lava Eruption'; this.iconKey='icon_lava_eruption';
    }
    get maxCooldown() { return this.baseCooldown*(this.player.abilityCooldownMult||1); }
    canUse() { return this.cooldown<=0; }
    use(game) {
        if (!this.canUse()) return false;
        const p=this.player, dmg=p.baseAtk*p.atkMult*2.8*(p.abilityDmgMult||1);
        let i=0;
        for (const e of game.enemies) {
            if (e.dead) continue;
            const ex=e.x, ey=e.y;
            setTimeout(()=>{ if(!e.dead){ e.takeDamage(dmg,'fire',game); e.applyEffect('burn',p.baseAtk*p.atkMult); spawnExplosion(game.particles,ex,ey,10,['#ff6600','#ffaa00','#ff3300'],150,7); } }, i*80);
            i++;
        }
        game.screenShake=Math.max(game.screenShake,0.6);
        this.cooldown=this.maxCooldown; return true;
    }
    update(dt) { if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt); }
}

class MeteorCrashAbility {
    constructor(player, slotIdx) {
        this.player=player; this.baseCooldown=18; this.cooldown=0;
        this.key=SLOT_KEYS[slotIdx]; this.label=SLOT_LABELS[slotIdx];
        this.name='Meteor Crash'; this.iconKey='icon_meteor_crash';
        this._pending=[];
    }
    get maxCooldown() { return this.baseCooldown*(this.player.abilityCooldownMult||1); }
    canUse() { return this.cooldown<=0; }
    use(game) {
        if (!this.canUse()) return false;
        const p=this.player, alive=game.enemies.filter(e=>!e.dead);
        const cx=alive.length?alive.reduce((s,e)=>s+e.x,0)/alive.length:p.x;
        const cy=alive.length?alive.reduce((s,e)=>s+e.y,0)/alive.length:p.y;
        this._pending.push({x:cx,y:cy,timer:0,delay:1.5});
        this.cooldown=this.maxCooldown; return true;
    }
    update(dt, game) {
        if (this.cooldown>0) this.cooldown=Math.max(0,this.cooldown-dt);
        const p=this.player;
        for (const m of this._pending) {
            m.timer+=dt;
            if (m.timer<m.delay) { spawnExplosion(game.particles,m.x+(Math.random()-0.5)*160,m.y+(Math.random()-0.5)*160,1,['#ff6600','#ffaa00'],60,3); }
            else {
                const dmg=p.baseAtk*p.atkMult*6.0*(p.abilityDmgMult||1);
                for (const e of game.enemies) { if(e.dead)continue; const dx=e.x-m.x,dy=e.y-m.y; if(dx*dx+dy*dy<180*180){ const d=Math.sqrt(dx*dx+dy*dy); e.takeDamage(dmg*(1-d/180*0.5),'fire',game); e.applyEffect('burn',p.baseAtk*p.atkMult); } }
                spawnExplosion(game.particles,m.x,m.y,30,['#ff6600','#ffaa00','#ff3300','#ffffff'],250,10);
                game.screenShake=Math.max(game.screenShake,1.2); m.done=true;
            }
        }
        this._pending=this._pending.filter(m=>!m.done);
    }
}

// ─── Void Assassin ────────────────────────────────────────────────────────────

class VoidSlashAbility {
    constructor(player, slotIdx) {
        this.player=player; this.baseCooldown=4; this.cooldown=0;
        this.key=SLOT_KEYS[slotIdx]; this.label=SLOT_LABELS[slotIdx];
        this.name='Void Slash'; this.iconKey='icon_void_slash';
    }
    get maxCooldown() { return this.baseCooldown*(this.player.abilityCooldownMult||1); }
    canUse() { return this.cooldown<=0; }
    use(game) {
        if (!this.canUse()) return false;
        const p=this.player, target=game.nearestEnemy(p.x,p.y,9999);
        if (!target) return false;
        const oldX=p.x, oldY=p.y;
        p.x=target.x+(Math.random()-0.5)*30; p.y=target.y+(Math.random()-0.5)*30;
        p.invincible=true; p.invincibleTimer=0.2;
        spawnExplosion(game.particles,oldX,oldY,6,['#6622aa','#aa44ff'],80,4);
        const dmg=p.baseAtk*p.atkMult*3.0*(p.abilityDmgMult||1);
        _meleeAoe(p,game,80,dmg,'void',['#6622aa','#aa44ff','#cc88ff']);
        game.screenShake=Math.max(game.screenShake,0.3);
        this.cooldown=this.maxCooldown; return true;
    }
    update(dt) { if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt); }
}

class RiftDashAbility extends BaseDashAbility {
    constructor(player, slotIdx) {
        super(player, slotIdx, { baseCooldown:5, name:'Rift Dash', iconKey:'icon_rift_dash',
            dashSpeed:900, dashDuration:0.16, damagesEnemies:true, trailColors:['#6622aa','#aa44ff','#220044'] });
    }
    onDashUpdate(dt, game) {
        if (Math.random()<dt*20) {
            const p=this.player, dmg=p.baseAtk*p.atkMult*0.6*(p.abilityDmgMult||1);
            for (const e of game.enemies) { if(e.dead)continue; const dx=e.x-p.x,dy=e.y-p.y; if(dx*dx+dy*dy<45*45)e.takeDamage(dmg,'void',game); }
        }
    }
}

class ShadowBladesAbility {
    constructor(player, slotIdx) {
        this.player=player; this.baseCooldown=12; this.cooldown=0;
        this.key=SLOT_KEYS[slotIdx]; this.label=SLOT_LABELS[slotIdx];
        this.name='Shadow Blades'; this.iconKey='icon_shadow_blades';
        this._blades=[]; this._active=false; this._timer=0; this._duration=6;
        this._hitCooldown=new Map();
    }
    get maxCooldown() { return this.baseCooldown*(this.player.abilityCooldownMult||1); }
    canUse() { return this.cooldown<=0; }
    use(game) {
        if (!this.canUse()) return false;
        this._active=true; this._timer=0;
        this._blades=[0,Math.PI*2/3,Math.PI*4/3].map(a=>({angle:a}));
        this._hitCooldown.clear(); this.cooldown=this.maxCooldown; return true;
    }
    update(dt, game) {
        if (this.cooldown>0) this.cooldown=Math.max(0,this.cooldown-dt);
        if (!this._active) return;
        this._timer+=dt;
        if (this._timer>=this._duration) { this._active=false; this._blades=[]; return; }
        const p=this.player, or=60, os=3.5;
        for (const blade of this._blades) {
            blade.angle+=os*dt;
            const bx=p.x+Math.cos(blade.angle)*or, by=p.y+Math.sin(blade.angle)*or;
            for (const e of game.enemies) {
                if (e.dead) continue;
                const dx=e.x-bx, dy=e.y-by;
                if (dx*dx+dy*dy<(e.size+12)*(e.size+12)) {
                    const now=this._timer, last=this._hitCooldown.get(e)||-1;
                    if (now-last>0.4) {
                        this._hitCooldown.set(e,now);
                        const dmg=p.baseAtk*p.atkMult*0.8*(p.abilityDmgMult||1);
                        e.takeDamage(dmg,'void',game); spawnExplosion(game.particles,bx,by,3,['#6622aa','#aa44ff'],60,3);
                    }
                }
            }
        }
    }
    renderBlades(ctx) {
        if (!this._active||!this._blades.length) return;
        const p=this.player, or=60;
        for (const blade of this._blades) {
            const bx=p.x+Math.cos(blade.angle)*or, by=p.y+Math.sin(blade.angle)*or;
            ctx.save(); ctx.translate(bx,by); ctx.rotate(blade.angle+Math.PI/4);
            ctx.fillStyle='#9933ff'; ctx.fillRect(-7,-2,14,4);
            ctx.fillStyle='#cc66ff'; ctx.fillRect(-6,-1,12,2);
            ctx.restore();
        }
    }
}

class PhaseShiftAbility {
    constructor(player, slotIdx) {
        this.player=player; this.baseCooldown=15; this.cooldown=0;
        this.key=SLOT_KEYS[slotIdx]; this.label=SLOT_LABELS[slotIdx];
        this.name='Phase Shift'; this.iconKey='icon_phase_shift';
        this._active=false; this._timer=0; this._duration=3;
    }
    get maxCooldown() { return this.baseCooldown*(this.player.abilityCooldownMult||1); }
    canUse() { return this.cooldown<=0&&!this._active; }
    use(game) {
        if (!this.canUse()) return false;
        this._active=true; this._timer=0;
        this.player.invincible=true; this.player.invincibleTimer=this._duration;
        spawnExplosion(game.particles,this.player.x,this.player.y,15,['#6622aa','#aa44ff','#220044'],100,6);
        this.cooldown=this.maxCooldown; return true;
    }
    update(dt) {
        if (this.cooldown>0) this.cooldown=Math.max(0,this.cooldown-dt);
        if (this._active) { this._timer+=dt; if(this._timer>=this._duration)this._active=false; }
    }
}

class VoidCollapseAbility {
    constructor(player, slotIdx) {
        this.player=player; this.baseCooldown=20; this.cooldown=0;
        this.key=SLOT_KEYS[slotIdx]; this.label=SLOT_LABELS[slotIdx];
        this.name='Void Collapse'; this.iconKey='icon_void_collapse';
        this._pullTimer=0; this._active=false;
    }
    get maxCooldown() { return this.baseCooldown*(this.player.abilityCooldownMult||1); }
    canUse() { return this.cooldown<=0&&!this._active; }
    use(game) {
        if (!this.canUse()) return false;
        this._active=true; this._pullTimer=0; this.cooldown=this.maxCooldown; return true;
    }
    update(dt, game) {
        if (this.cooldown>0) this.cooldown=Math.max(0,this.cooldown-dt);
        if (!this._active) return;
        const p=this.player;
        this._pullTimer+=dt;
        if (this._pullTimer<0.8) {
            for (const e of game.enemies) { if(e.dead)continue; const dx=p.x-e.x,dy=p.y-e.y,d=Math.sqrt(dx*dx+dy*dy); if(d<300&&d>10){e.x+=(dx/d)*300*dt;e.y+=(dy/d)*300*dt;} }
            spawnExplosion(game.particles,p.x+(Math.random()-0.5)*30,p.y+(Math.random()-0.5)*30,1,['#6622aa','#aa44ff'],60,3);
        } else {
            const dmg=p.baseAtk*p.atkMult*5.0*(p.abilityDmgMult||1);
            _meleeAoe(p,game,200,dmg,'void',['#6622aa','#aa44ff','#cc88ff','#ffffff']);
            game.screenShake=Math.max(game.screenShake,1.0); this._active=false;
        }
    }
}

// ─── Chronomancer ─────────────────────────────────────────────────────────────

class TimeBoltAbility {
    constructor(player, slotIdx) {
        this.player=player; this.baseCooldown=4; this.cooldown=0;
        this.key=SLOT_KEYS[slotIdx]; this.label=SLOT_LABELS[slotIdx];
        this.name='Time Bolt'; this.iconKey='icon_time_bolt';
    }
    get maxCooldown() { return this.baseCooldown*(this.player.abilityCooldownMult||1); }
    canUse() { return this.cooldown<=0; }
    use(game) {
        if (!this.canUse()) return false;
        const p=this.player, target=game.nearestEnemy(p.x,p.y,9999);
        if (!target) return false;
        const dmg=p.baseAtk*p.atkMult*2.0*(p.abilityDmgMult||1);
        game.projectiles.push(new Projectile({
            x:p.x, y:p.y, tx:target.x, ty:target.y, target, homing:true,
            speed:420, damage:dmg, size:10, type:'arrow',
            color:'#88ccff', glowColor:'#4499ff', owner:'player', maxLife:1.5,
            onHit:(enemy,gm)=>{ enemy._slowTimer=(enemy._slowTimer||0)+2; enemy._slowMult=0.4;
                spawnExplosion(gm.particles,enemy.x,enemy.y,6,['#88ccff','#4499ff','#ffffff'],100,5); }
        }));
        this.cooldown=this.maxCooldown; return true;
    }
    update(dt) { if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt); }
}

class WarpDashAbility {
    constructor(player, slotIdx) {
        this.player=player; this.baseCooldown=5; this.cooldown=0;
        this.key=SLOT_KEYS[slotIdx]; this.label=SLOT_LABELS[slotIdx];
        this.name='Warp Dash'; this.iconKey='icon_warp_dash';
        this.isDash=true; this.dashing=false;
    }
    get maxCooldown() { return this.baseCooldown*(this.player.abilityCooldownMult||1); }
    canUse() { return this.cooldown<=0; }
    use(game) {
        if (!this.canUse()) return false;
        const p=this.player, {dx,dy}=_dashDir(p,game);
        const nx=Math.max(30,Math.min(770,p.x+dx*280)), ny=Math.max(30,Math.min(570,p.y+dy*280));
        spawnExplosion(game.particles,p.x,p.y,10,['#88ccff','#4499ff','#ffffff'],120,5);
        p.x=nx; p.y=ny;
        spawnExplosion(game.particles,p.x,p.y,10,['#88ccff','#4499ff','#ffffff'],120,5);
        p.invincible=true; p.invincibleTimer=0.2; this.cooldown=this.maxCooldown; return true;
    }
    update(dt) { if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt); }
}

class RewindAbility {
    constructor(player, slotIdx) {
        this.player=player; this.baseCooldown=18; this.cooldown=0;
        this.key=SLOT_KEYS[slotIdx]; this.label=SLOT_LABELS[slotIdx];
        this.name='Rewind'; this.iconKey='icon_rewind';
        this._history=[]; this._recordTimer=0;
    }
    get maxCooldown() { return this.baseCooldown*(this.player.abilityCooldownMult||1); }
    canUse() { return this.cooldown<=0; }
    use(game) {
        if (!this.canUse()) return false;
        const now=Date.now()/1000;
        const snap=this._history.find(s=>now-s.t>=2)||this._history[0];
        if (snap) {
            const p=this.player;
            spawnExplosion(game.particles,p.x,p.y,10,['#88ccff','#4499ff'],100,5);
            p.x=snap.x; p.y=snap.y;
            const healed=Math.max(0,snap.hp-p.hp);
            p.hp=Math.max(p.hp,Math.min(snap.hp,p.maxHp));
            if (healed>0&&game.addDamageNumber) game.addDamageNumber(p.x,p.y-40,Math.ceil(healed),'#44ffcc',{role:'player'});
            spawnExplosion(game.particles,p.x,p.y,10,['#88ccff','#ffffff'],100,5);
        }
        this.cooldown=this.maxCooldown; return true;
    }
    update(dt) {
        if (this.cooldown>0) this.cooldown=Math.max(0,this.cooldown-dt);
        this._recordTimer+=dt;
        if (this._recordTimer>=0.1) {
            this._recordTimer=0; const p=this.player, now=Date.now()/1000;
            this._history.push({x:p.x,y:p.y,hp:p.hp,t:now});
            while(this._history.length>0&&now-this._history[0].t>3.5)this._history.shift();
        }
    }
}

class TimeStopAbility {
    constructor(player, slotIdx) {
        this.player=player; this.baseCooldown=16; this.cooldown=0;
        this.key=SLOT_KEYS[slotIdx]; this.label=SLOT_LABELS[slotIdx];
        this.name='Time Stop'; this.iconKey='icon_time_stop';
    }
    get maxCooldown() { return this.baseCooldown*(this.player.abilityCooldownMult||1); }
    canUse() { return this.cooldown<=0; }
    use(game) {
        if (!this.canUse()) return false;
        const p=this.player, r=300;
        for (const e of game.enemies) { if(e.dead)continue; const dx=e.x-p.x,dy=e.y-p.y; if(dx*dx+dy*dy<r*r)e.applyEffect('freeze',0); }
        for (let i=0;i<30;i++) { const a=(i/30)*Math.PI*2,rd=r*(0.4+Math.random()*0.6); spawnExplosion(game.particles,p.x+Math.cos(a)*rd*0.6,p.y+Math.sin(a)*rd*0.6,2,['#88ccff','#aaeeff','#ffffff'],80,6); }
        game.screenShake=Math.max(game.screenShake,0.8); this.cooldown=this.maxCooldown; return true;
    }
    update(dt) { if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt); }
}

class CollapseAbility {
    constructor(player, slotIdx) {
        this.player=player; this.baseCooldown=22; this.cooldown=0;
        this.key=SLOT_KEYS[slotIdx]; this.label=SLOT_LABELS[slotIdx];
        this.name='Collapse'; this.iconKey='icon_collapse';
        this._pending=[];
    }
    get maxCooldown() { return this.baseCooldown*(this.player.abilityCooldownMult||1); }
    canUse() { return this.cooldown<=0; }
    use(game) {
        if (!this.canUse()) return false;
        const p=this.player;
        this._pending.push({x:p.x,y:p.y,timer:0,delay:2.0});
        this.cooldown=this.maxCooldown; return true;
    }
    update(dt, game) {
        if (this.cooldown>0) this.cooldown=Math.max(0,this.cooldown-dt);
        const p=this.player;
        for (const m of this._pending) {
            m.timer+=dt;
            if (m.timer<m.delay) { if(Math.random()<dt*8)spawnExplosion(game.particles,m.x+(Math.random()-0.5)*80,m.y+(Math.random()-0.5)*80,1,['#88ccff','#4499ff'],60,3); }
            else {
                const dmg=p.baseAtk*p.atkMult*7.0*(p.abilityDmgMult||1);
                for(const e of game.enemies){if(e.dead)continue;const dx=e.x-m.x,dy=e.y-m.y;if(dx*dx+dy*dy<250*250){const d=Math.sqrt(dx*dx+dy*dy);e.takeDamage(dmg*(1-d/250*0.4),'time',game);}}
                spawnExplosion(game.particles,m.x,m.y,40,['#88ccff','#4499ff','#ffffff','#aaeeff'],300,12);
                game.screenShake=Math.max(game.screenShake,1.5); m.done=true;
            }
        }
        this._pending=this._pending.filter(m=>!m.done);
    }
}

// ══════════════════════════════════════════════════════════════════════════════
//  MINION
// ══════════════════════════════════════════════════════════════════════════════

class SummonedMinion {
    constructor(x, y, owner, opts) {
        this.x=x; this.y=y; this.owner=owner;
        this.hp=opts.hp||50; this.maxHp=this.hp;
        this.atk=opts.atk||10; this.speed=opts.speed||90;
        this.range=opts.range||55; this.atkInterval=opts.atkInterval||1.5;
        this.atkCooldown=0; this.duration=opts.duration||15;
        this.durationTimer=0; this.dead=false; this.size=16;
        this.color=opts.color||'#ccddbb'; this.spriteKey=opts.spriteKey||null;
    }
    update(dt, game) {
        this.durationTimer+=dt;
        if (this.durationTimer>=this.duration) { this.dead=true; return; }
        const target=game.nearestEnemy(this.x,this.y,9999);
        if (!target) return;
        const dx=target.x-this.x, dy=target.y-this.y, dist=Math.sqrt(dx*dx+dy*dy);
        if (dist>this.range) { this.x+=(dx/dist)*this.speed*dt; this.y+=(dy/dist)*this.speed*dt; }
        else { this.atkCooldown-=dt; if(this.atkCooldown<=0){this.atkCooldown=this.atkInterval;target.takeDamage(this.atk,'physical',game);spawnExplosion(game.particles,this.x,this.y,3,[this.color],60,4);} }
    }
    render(ctx) {
        ctx.save();
        ctx.globalAlpha=Math.max(0.3,1-(this.durationTimer/this.duration)*0.6);
        if(this.spriteKey)Assets.draw(ctx,this.spriteKey,this.x-16,this.y-16,32,32);
        else{ctx.fillStyle=this.color;ctx.beginPath();ctx.arc(this.x,this.y,this.size/2,0,Math.PI*2);ctx.fill();}
        ctx.globalAlpha=1;
        const bw=28;
        ctx.fillStyle='#330000';ctx.fillRect(this.x-bw/2,this.y-22,bw,3);
        ctx.fillStyle='#44cc88';ctx.fillRect(this.x-bw/2,this.y-22,bw*(this.hp/this.maxHp),3);
        ctx.restore();
    }
}

// ══════════════════════════════════════════════════════════════════════════════
//  ABILITY REGISTRY
// ══════════════════════════════════════════════════════════════════════════════

const ABILITY_REGISTRY = {
    quick_slash:QuickSlashAbility, dash_strike:DashStrikeAbility,
    fireball_shot:FireballShotAbility, flame_dash:FlameDashAbility,
    piercing_arrow:PiercingArrowAbility, roll_dash:RollDashAbility,
    ice_slam:IceSlamAbility, shield_dash:ShieldDashAbility, frost_armor:FrostArmorAbility,
    toxic_daggers:ToxicDaggersAbility, shadow_dash:ShadowDashAbility, poison_cloud:PoisonCloudAbility,
    chain_bolt:ChainBoltAbility, blink_dash:BlinkDashAbility, thunder_ring:ThunderRingAbility,
    bone_spear:BoneSpearAbility, wraith_dash:WraithDashAbility,
    raise_skeleton:RaiseSkeletonAbility, soul_burst:SoulBurstAbility,
    revolver_shot:RevolverShotAbility, combat_roll:CombatRollAbility,
    ricochet_bullet:RicochetBulletAbility, bullet_storm:BulletStormAbility,
    holy_strike:HolyStrikeAbility, divine_dash:DivineDashAbility,
    heal_wave:HealWaveAbility, judgment_beam:JudgmentBeamAbility,
    flame_claw:FlameClawAbility, inferno_dash:InfernoDashAbility,
    dragon_breath:DragonBreathAbility, lava_eruption:LavaEruptionAbility, meteor_crash:MeteorCrashAbility,
    void_slash:VoidSlashAbility, rift_dash:RiftDashAbility,
    shadow_blades:ShadowBladesAbility, phase_shift:PhaseShiftAbility, void_collapse:VoidCollapseAbility,
    time_bolt:TimeBoltAbility, warp_dash:WarpDashAbility,
    rewind:RewindAbility, time_stop:TimeStopAbility, collapse:CollapseAbility,
};
