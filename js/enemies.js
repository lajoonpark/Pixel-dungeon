'use strict';

class Enemy {
    constructor(cfg) {
        this.x = cfg.x || 400;
        this.y = cfg.y || 300;
        this.hp = cfg.hp || 30;
        this.maxHp = cfg.hp || 30;
        this.atk = cfg.atk || 8;
        this.moveSpeed = cfg.moveSpeed || 80;
        this.size = cfg.size || 24;
        this.xpReward = cfg.xpReward || 20;
        this.coinReward = cfg.coinReward || 0;
        this.spriteKey = cfg.spriteKey || 'enemy_slime';
        this.type = cfg.type || 'slime';
        this.dead = false;
        this.frozen = false;
        this.statusEffects = [];
        this.hitFlash = 0;
        this.attackCooldown = cfg.attackCooldown || 1.2;
        this.attackRange = cfg.attackRange || 40;
        this.atkTimer = Math.random() * this.attackCooldown;
        this.isElite = cfg.isElite || false;
        this.isBoss = false;
        // For knockback
        this.kbVx = 0;
        this.kbVy = 0;
        // Crystal drops
        this.crystalChance = cfg.crystalChance || 0;
    }

    takeDamage(amount, type, game, options) {
        amount = Number.isFinite(amount) ? amount : 0;
        this.hp -= amount;
        this.hitFlash = 0.18;
        const opts = (options && typeof options === 'object') ? options : {};
        if (game && typeof game.addDamageNumber === 'function' && opts.showNumber !== false) {
            game.addDamageNumber(this.x, this.y - this.size - 10, Math.ceil(amount), opts.color || '#ffee44', {
                big: !!opts.big,
                role: 'enemy'
            });
        }
        if (this.hp <= 0) { this.hp = 0; this.dead = true; }
    }

    applyEffect(type, sourceAtk) {
        // Don't stack same effect; refresh duration
        const existing = this.statusEffects.find(e => e.type === type);
        if (existing) { existing.timer = 0; return; }
        const eff = StatusEffects.create(type, sourceAtk);
        if (eff) this.statusEffects.push(eff);
    }

    update(dt, player, game) {
        if (this.dead) return;
        if (this.hitFlash > 0) this.hitFlash -= dt;

        // Knockback decay
        if (Math.abs(this.kbVx) > 1 || Math.abs(this.kbVy) > 1) {
            const nx = this.x + this.kbVx * dt;
            const ny = this.y + this.kbVy * dt;
            if (game.currentRoom && !game.currentRoom.isWall(nx, this.y)) this.x = nx;
            if (game.currentRoom && !game.currentRoom.isWall(this.x, ny)) this.y = ny;
            this.kbVx *= 0.85;
            this.kbVy *= 0.85;
        }

        // Status effects
        this.frozen = false;
        this.statusEffects = this.statusEffects.filter(e => !StatusEffects.update(e, this, dt, game.enemies, game));

        if (this.frozen) return;

        this._behave(dt, player, game);
    }

    // Default: chase player, melee attack
    _behave(dt, player, game) {
        this._chasePlayer(dt, player, game);
        this.atkTimer -= dt;
        const dx = player.x - this.x, dy = player.y - this.y;
        const dist = Math.sqrt(dx*dx+dy*dy);
        if (dist < this.attackRange && this.atkTimer <= 0) {
            this.atkTimer = this.attackCooldown;
            this._attackPlayer(player, game);
        }
    }

    _chasePlayer(dt, player, game) {
        const dx = player.x - this.x, dy = player.y - this.y;
        const dist = Math.sqrt(dx*dx+dy*dy);
        if (dist < this.attackRange * 0.8) return;

        const spd = this.moveSpeed * (this.isElite ? 1.2 : 1);
        const nx = this.x + (dx/dist) * spd * dt;
        const ny = this.y + (dy/dist) * spd * dt;

        if (!game.currentRoom || !game.currentRoom.isWall(nx, this.y)) this.x = nx;
        if (!game.currentRoom || !game.currentRoom.isWall(this.x, ny)) this.y = ny;
    }

    _attackPlayer(player, game) {
        const finalAtk = this.atk * (this.isElite ? 1.5 : 1);
        player.takeDamage(finalAtk, game);
    }

    render(ctx) {
        if (this.dead) return;
        ctx.save();

        // Status tint
        if (this.frozen) {
            ctx.filter = 'hue-rotate(180deg) brightness(1.4)';
        }

        // Hit flash
        if (this.hitFlash > 0) {
            ctx.filter = `brightness(${2 + this.hitFlash*4})`;
        }

        // Elite glow
        if (this.isElite) {
            ctx.shadowColor = '#ffcc00';
            ctx.shadowBlur = 12;
        }

        const s = this.size * 2;
        Assets.draw(ctx, this.spriteKey, this.x - s/2, this.y - s/2, s, s);

        ctx.filter = 'none';
        ctx.shadowBlur = 0;

        // Status effect rings
        for (const eff of this.statusEffects) {
            ctx.strokeStyle = StatusEffects.getColor(eff.type);
            ctx.globalAlpha = 0.5;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size + 3, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        ctx.restore();

        this._renderHealthBar(ctx);
    }

    _renderHealthBar(ctx) {
        const bw = this.size * 2.2;
        const bh = 5;
        const bx = this.x - bw/2;
        const by = this.y - this.size - 10;
        ctx.fillStyle = '#440000';
        ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = this.isElite ? '#ffcc00' : '#44cc44';
        ctx.fillRect(bx, by, bw * (this.hp/this.maxHp), bh);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, bw, bh);
    }

    knockback(fromX, fromY, force) {
        const dx = this.x - fromX, dy = this.y - fromY;
        const len = Math.sqrt(dx*dx+dy*dy) || 1;
        this.kbVx += (dx/len) * force;
        this.kbVy += (dy/len) * force;
    }
}

// ── Slime ─────────────────────────────────────────────────────────────────────
class Slime extends Enemy {
    constructor(x, y, isElite) {
        super({ x, y, hp:isElite?55:30, atk:8, moveSpeed:70, attackCooldown:1.5,
                attackRange:38, size:18, xpReward:15, coinReward: Math.random()<0.3?1:0,
                spriteKey:'enemy_slime', type:'slime', isElite });
    }
}

// ── Bat ───────────────────────────────────────────────────────────────────────
class Bat extends Enemy {
    constructor(x, y, isElite) {
        super({ x, y, hp:isElite?40:20, atk:6, moveSpeed:140, attackCooldown:0.8,
                attackRange:36, size:16, xpReward:18, coinReward: Math.random()<0.25?1:0,
                spriteKey:'enemy_bat', type:'bat', isElite });
    }
    _chasePlayer(dt, player, game) {
        // Bats zigzag
        const dx = player.x - this.x, dy = player.y - this.y;
        const dist = Math.sqrt(dx*dx+dy*dy);
        const perp = Math.sin(Date.now()*0.003 + this.x) * 60;
        const px = -dy/dist * perp, py = dx/dist * perp;
        const nx = this.x + ((dx/dist)*this.moveSpeed + px*0.4) * dt;
        const ny = this.y + ((dy/dist)*this.moveSpeed + py*0.4) * dt;
        if (!game.currentRoom || !game.currentRoom.isWall(nx, this.y)) this.x = nx;
        if (!game.currentRoom || !game.currentRoom.isWall(this.x, ny)) this.y = ny;
    }
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
class Skeleton extends Enemy {
    constructor(x, y, isElite) {
        super({ x, y, hp:isElite?80:45, atk:10, moveSpeed:65, attackCooldown:1.8,
                attackRange:200, size:20, xpReward:25, coinReward: Math.random()<0.35?1:0,
                spriteKey:'enemy_skeleton', type:'skeleton', isElite });
        this.rangedCooldown = 2.5;
        this.rangedTimer = 1;
    }
    _behave(dt, player, game) {
        const dx = player.x - this.x, dy = player.y - this.y;
        const dist = Math.sqrt(dx*dx+dy*dy);
        // Keep medium distance
        if (dist < 160) {
            const spd = this.moveSpeed * 0.7;
            const nx = this.x - (dx/dist)*spd*dt;
            const ny = this.y - (dy/dist)*spd*dt;
            if (!game.currentRoom || !game.currentRoom.isWall(nx, this.y)) this.x = nx;
            if (!game.currentRoom || !game.currentRoom.isWall(this.x, ny)) this.y = ny;
        } else if (dist > 220) {
            this._chasePlayer(dt, player, game);
        }
        this.rangedTimer -= dt;
        if (this.rangedTimer <= 0 && dist < 220) {
            this.rangedTimer = this.rangedCooldown;
            const dmg = this.atk * (this.isElite ? 1.5 : 1);
            game.projectiles.push(new Projectile({
                x: this.x, y: this.y, tx: player.x, ty: player.y,
                speed: 220, damage: dmg, size: 10,
                type: 'bone', owner: 'enemy', maxLife: 2.5
            }));
        }
    }
}

// ── Spider ────────────────────────────────────────────────────────────────────
class Spider extends Enemy {
    constructor(x, y, isElite) {
        super({ x, y, hp:isElite?65:35, atk:9, moveSpeed:100, attackCooldown:1.0,
                attackRange:40, size:19, xpReward:22, coinReward: Math.random()<0.3?1:0,
                spriteKey:'enemy_spider', type:'spider', isElite });
        this.webCooldown = 3;
        this.webTimer = 2;
    }
    _attackPlayer(player, game) {
        super._attackPlayer(player, game);
        // Poison on hit
        if (Math.random() < 0.4) player.applyEffect('poison');
    }
}

// ── Bomber ────────────────────────────────────────────────────────────────────
class Bomber extends Enemy {
    constructor(x, y, isElite) {
        super({ x, y, hp:isElite?40:25, atk:35, moveSpeed:115, attackCooldown:999,
                attackRange:48, size:18, xpReward:28, coinReward: Math.random()<0.4?2:0,
                spriteKey:'enemy_bomber', type:'bomber', isElite });
        this.primed = false;
        this.primeTimer = 0;
    }
    _behave(dt, player, game) {
        const dx = player.x - this.x, dy = player.y - this.y;
        const dist = Math.sqrt(dx*dx+dy*dy);
        if (dist < this.attackRange) {
            // Explode!
            this.primeTimer += dt;
            if (this.primeTimer > 0.6) {
                const dmg = this.atk * (this.isElite ? 1.5 : 1);
                const aoeR = 90;
                const pdx = player.x - this.x, pdy = player.y - this.y;
                if (pdx*pdx+pdy*pdy < aoeR*aoeR) player.takeDamage(dmg, game);
                spawnExplosion(game.particles, this.x, this.y, 22, ['#ff8800','#ffcc00','#ff4400'], 220, 8);
                game.screenShake = Math.max(game.screenShake, 1.0);
                this.dead = true;
                this.hp = 0;
            }
        } else {
            this.primeTimer = 0;
            this._chasePlayer(dt, player, game);
        }
    }
    render(ctx) {
        super.render(ctx);
        // Pulsate when primed
        if (this.primeTimer > 0) {
            ctx.save();
            ctx.globalAlpha = 0.4 + 0.4 * Math.sin(this.primeTimer * 20);
            ctx.fillStyle = '#ff4400';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size + 6, 0, Math.PI*2);
            ctx.fill();
            ctx.restore();
        }
    }
}

// ── Healer ────────────────────────────────────────────────────────────────────
class Healer extends Enemy {
    constructor(x, y, isElite) {
        super({ x, y, hp:isElite?75:50, atk:7, moveSpeed:60, attackCooldown:2.0,
                attackRange:44, size:19, xpReward:30, coinReward: Math.random()<0.45?2:1,
                spriteKey:'enemy_healer', type:'healer', isElite });
        this.healCooldown = 3.5;
        this.healTimer = 2;
    }
    _behave(dt, player, game) {
        this.healTimer -= dt;

        // Find most injured ally
        let target = null;
        let lowestHpFrac = 0.85;
        for (const e of game.enemies) {
            if (e === this || e.dead) continue;
            const frac = e.hp / e.maxHp;
            if (frac < lowestHpFrac) { lowestHpFrac = frac; target = e; }
        }

        if (target && this.healTimer <= 0) {
            // Move toward ally to heal
            const dx = target.x - this.x, dy = target.y - this.y;
            const dist = Math.sqrt(dx*dx+dy*dy);
            if (dist < 50) {
                this.healTimer = this.healCooldown;
                const healAmt = target.maxHp * 0.2;
                target.hp = Math.min(target.maxHp, target.hp + healAmt);
                spawnExplosion(game.particles, target.x, target.y, 8, ['#44ff88','#88ffaa'], 60, 5);
            } else {
                const spd = this.moveSpeed;
                const nx = this.x + (dx/dist)*spd*dt;
                const ny = this.y + (dy/dist)*spd*dt;
                if (!game.currentRoom || !game.currentRoom.isWall(nx, this.y)) this.x = nx;
                if (!game.currentRoom || !game.currentRoom.isWall(this.x, ny)) this.y = ny;
            }
        } else {
            this._chasePlayer(dt, player, game);
            this.atkTimer -= dt;
            const dx = player.x - this.x, dy = player.y - this.y;
            if (dx*dx+dy*dy < this.attackRange*this.attackRange && this.atkTimer <= 0) {
                this.atkTimer = this.attackCooldown;
                this._attackPlayer(player, game);
            }
        }
    }
}

// ── Summoner ─────────────────────────────────────────────────────────────────
class Summoner extends Enemy {
    constructor(x, y, isElite) {
        super({ x, y, hp:isElite?90:60, atk:12, moveSpeed:55, attackCooldown:2.5,
                attackRange:250, size:21, xpReward:35, coinReward: Math.random()<0.5?2:1,
                spriteKey:'enemy_summoner', type:'summoner', isElite });
        this.summonCooldown = 6;
        this.summonTimer = 3;
        this.maxMinions = 3;
    }
    _behave(dt, player, game) {
        // Stay at range, shoot projectiles
        const dx = player.x - this.x, dy = player.y - this.y;
        const dist = Math.sqrt(dx*dx+dy*dy);
        if (dist < 180) {
            const spd = this.moveSpeed;
            const nx = this.x - (dx/dist)*spd*dt;
            const ny = this.y - (dy/dist)*spd*dt;
            if (!game.currentRoom || !game.currentRoom.isWall(nx, this.y)) this.x = nx;
            if (!game.currentRoom || !game.currentRoom.isWall(this.x, ny)) this.y = ny;
        }

        this.atkTimer -= dt;
        if (this.atkTimer <= 0 && dist < 280) {
            this.atkTimer = this.attackCooldown;
            const dmg = this.atk * (this.isElite ? 1.5 : 1);
            game.projectiles.push(new Projectile({
                x: this.x, y: this.y, tx: player.x, ty: player.y,
                speed: 180, damage: dmg, size: 11,
                type: 'poison', owner: 'enemy', maxLife: 3
            }));
        }

        this.summonTimer -= dt;
        const minionCount = game.enemies.filter(e => e.type === 'minion' && !e.dead).length;
        if (this.summonTimer <= 0 && minionCount < this.maxMinions) {
            this.summonTimer = this.summonCooldown;
            for (let i = 0; i < 2; i++) {
                const sx = this.x + (Math.random()-0.5)*80;
                const sy = this.y + (Math.random()-0.5)*80;
                game.enemies.push(new Minion(sx, sy));
            }
            spawnExplosion(game.particles, this.x, this.y, 10, ['#9933cc','#cc66ff'], 80, 5);
        }
    }
}

// ── Minion ────────────────────────────────────────────────────────────────────
class Minion extends Enemy {
    constructor(x, y) {
        super({ x, y, hp:15, atk:5, moveSpeed:120, attackCooldown:0.9,
                attackRange:36, size:14, xpReward:8, coinReward:0,
                spriteKey:'enemy_minion', type:'minion', isElite:false });
    }
}

// ── Boss: Necromancer ─────────────────────────────────────────────────────────
class Necromancer extends Enemy {
    constructor(x, y) {
        super({ x, y, hp:800, atk:18, moveSpeed:55, attackCooldown:1.2,
                attackRange:350, size:44, xpReward:400, coinReward:8,
                spriteKey:'boss_necromancer', type:'boss_necromancer', isElite:false });
        this.isBoss = true;
        this.phase = 1;
        this.phaseSwitched = false;
        this.crystalChance = 1; // always drops crystals
        this.specialCooldown = 4;
        this.specialTimer = 2;
        this.summonCooldown = 8;
        this.summonTimer = 5;
        this.orbitalTimer = 0;
        this.orbitalAngle = 0;
    }

    update(dt, player, game) {
        super.update(dt, player, game);

        // Phase 2 at 50% HP
        if (!this.phaseSwitched && this.hp < this.maxHp * 0.5) {
            this.phase = 2;
            this.phaseSwitched = true;
            this.moveSpeed = 80;
            this.attackCooldown = 0.9;
            game.screenShake = Math.max(game.screenShake, 2);
            spawnExplosion(game.particles, this.x, this.y, 30, ['#aa00ff','#440088','#ff88ff'], 200, 10);
        }
    }

    _behave(dt, player, game) {
        // Orbital movement around a center point
        this.orbitalTimer += dt;
        const cx = 400, cy = 300;
        const rx = 140, ry = 80;
        this.orbitalAngle += dt * (this.phase === 2 ? 0.7 : 0.4);
        const targetX = cx + Math.cos(this.orbitalAngle) * rx;
        const targetY = cy + Math.sin(this.orbitalAngle) * ry;
        const dx = targetX - this.x, dy = targetY - this.y;
        const dist = Math.sqrt(dx*dx+dy*dy);
        if (dist > 5) {
            const spd = this.moveSpeed;
            const nx = this.x + (dx/dist)*spd*dt;
            const ny = this.y + (dy/dist)*spd*dt;
            if (!game.currentRoom || !game.currentRoom.isWall(nx, this.y)) this.x = nx;
            if (!game.currentRoom || !game.currentRoom.isWall(this.x, ny)) this.y = ny;
        }

        // Ranged attack toward player
        this.atkTimer -= dt;
        const pdx = player.x - this.x, pdy = player.y - this.y;
        const pdist = Math.sqrt(pdx*pdx+pdy*pdy);
        if (this.atkTimer <= 0) {
            this.atkTimer = this.attackCooldown;
            const shots = this.phase === 2 ? 3 : 1;
            for (let i = 0; i < shots; i++) {
                const spread = (i - (shots-1)/2) * 0.3;
                const angle = Math.atan2(pdy, pdx) + spread;
                game.projectiles.push(new Projectile({
                    x: this.x, y: this.y,
                    tx: this.x + Math.cos(angle)*500,
                    ty: this.y + Math.sin(angle)*500,
                    speed: 200 + this.phase*40, damage: this.atk,
                    size: 14, type: 'boss', owner: 'enemy', maxLife: 3,
                    glowColor: '#aa00ff'
                }));
            }
        }

        // Special: summon ring of projectiles
        this.specialTimer -= dt;
        if (this.specialTimer <= 0) {
            this.specialTimer = this.specialCooldown * (this.phase === 2 ? 0.7 : 1);
            const count = this.phase === 2 ? 8 : 6;
            for (let i = 0; i < count; i++) {
                const a = (i / count) * Math.PI * 2;
                game.projectiles.push(new Projectile({
                    x: this.x, y: this.y,
                    tx: this.x + Math.cos(a)*500, ty: this.y + Math.sin(a)*500,
                    speed: 160, damage: this.atk * 0.7, size: 11,
                    type: 'boss', owner: 'enemy', maxLife: 3.5
                }));
            }
        }

        // Summon minions
        this.summonTimer -= dt;
        if (this.summonTimer <= 0) {
            this.summonTimer = this.summonCooldown * (this.phase === 2 ? 0.7 : 1);
            const count = this.phase === 2 ? 4 : 2;
            for (let i = 0; i < count; i++) {
                const a = Math.random() * Math.PI * 2;
                const r = 80 + Math.random() * 80;
                game.enemies.push(new Skeleton(this.x + Math.cos(a)*r, this.y + Math.sin(a)*r, false));
            }
        }
    }

    _renderHealthBar(ctx) {
        // Boss HP bar at top of screen rendered by UI
    }

    render(ctx) {
        if (this.dead) return;
        ctx.save();

        if (this.phase === 2) {
            ctx.shadowColor = '#aa00ff';
            ctx.shadowBlur = 20 + Math.sin(Date.now()*0.005)*8;
        }

        if (this.hitFlash > 0) ctx.filter = `brightness(${2 + this.hitFlash*3})`;

        // Status tint
        for (const eff of this.statusEffects) {
            if (eff.type === 'freeze') ctx.filter = 'hue-rotate(180deg) brightness(1.4)';
        }

        const s = this.size * 2.2;
        Assets.draw(ctx, 'boss_necromancer', this.x - s/2, this.y - s/2, s, s);

        ctx.filter = 'none';
        ctx.shadowBlur = 0;
        ctx.restore();

        // Status rings
        for (const eff of this.statusEffects) {
            ctx.strokeStyle = StatusEffects.getColor(eff.type);
            ctx.globalAlpha = 0.5;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size + 4, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
    }
}

// ── Enemy factory ─────────────────────────────────────────────────────────────
function createEnemy(type, x, y, isElite) {
    switch(type) {
        case 'slime':     return new Slime(x, y, isElite);
        case 'bat':       return new Bat(x, y, isElite);
        case 'skeleton':  return new Skeleton(x, y, isElite);
        case 'spider':    return new Spider(x, y, isElite);
        case 'bomber':    return new Bomber(x, y, isElite);
        case 'healer':    return new Healer(x, y, isElite);
        case 'summoner':  return new Summoner(x, y, isElite);
        case 'minion':    return new Minion(x, y);
        case 'boss_necromancer': return new Necromancer(x, y);
        default: return new Slime(x, y, isElite);
    }
}
