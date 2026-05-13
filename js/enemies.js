'use strict';

// Elite modifiers extend base enemies with additional effects while preserving existing AI architecture.
const ELITE_MODIFIERS = ['burning', 'toxic', 'vampiric', 'frenzied', 'shielded', 'arcane', 'explosive', 'regenerating'];
const rollCoinReward = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const ELITE_AURA_COLORS = {
    burning: '#ff7a1a',
    toxic: '#63d84d',
    vampiric: '#c93858',
    frenzied: '#ffb347',
    shielded: '#78a8ff',
    arcane: '#c36bff',
    explosive: '#ff4a33',
    regenerating: '#4fe3b9',
    default: '#ffcc00'
};

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
        this.eliteModifier = cfg.eliteModifier || null;
        this.isBoss = false;
        this.kbVx = 0;
        this.kbVy = 0;
        this.crystalChance = cfg.crystalChance || 0;
        this.damageTakenMultiplier = 1;

        if (this.isElite) this._applyEliteModifier();
    }

    _applyEliteModifier() {
        if (!this.eliteModifier) this.eliteModifier = ELITE_MODIFIERS[Math.floor(Math.random() * ELITE_MODIFIERS.length)];
        switch (this.eliteModifier) {
            case 'burning':
                this.atk *= 1.2;
                break;
            case 'toxic':
                this.moveSpeed *= 1.15;
                break;
            case 'vampiric':
                this.maxHp = Math.floor(this.maxHp * 1.15);
                this.hp = this.maxHp;
                break;
            case 'frenzied':
                this.moveSpeed *= 1.25;
                this.attackCooldown *= 0.8;
                break;
            case 'shielded':
                this.maxHp = Math.floor(this.maxHp * 1.25);
                this.hp = this.maxHp;
                break;
            case 'arcane':
                this.atk *= 1.18;
                break;
            case 'explosive':
                this.atk *= 1.14;
                break;
            case 'regenerating':
                this.maxHp = Math.floor(this.maxHp * 1.1);
                this.hp = this.maxHp;
                break;
        }
        this.size *= 1.1;
        this.xpReward = Math.floor(this.xpReward * 1.3);
        this.coinReward += 3;
    }

    _incomingDamageMultiplier() {
        let mul = this.damageTakenMultiplier || 1;
        if (this.isElite && this.eliteModifier === 'shielded') mul *= 0.82;
        return mul;
    }

    takeDamage(amount, type, game, options) {
        amount = Number.isFinite(amount) ? amount : 0;
        const opts = (options && typeof options === 'object') ? options : {};
        const sourcePlayer = opts.sourcePlayer || (game && game.player) || null;
        if (sourcePlayer) {
            if ((sourcePlayer.lowHpDamageMult || 1) > 1 && this.maxHp > 0 && (this.hp / this.maxHp) < 0.3) {
                amount *= sourcePlayer.lowHpDamageMult;
            }
            if ((sourcePlayer.bossDamageMult || 1) > 1 && (this.isElite || this.isMiniBoss || this.isBoss)) {
                amount *= sourcePlayer.bossDamageMult;
            }
            if ((sourcePlayer.huntersMarkEnabled || false) && (this.markedUntil || 0) > ((game && game.runClock) || 0) && !opts.projectile?.isBasicAttack) {
                amount *= 1.15;
            }
        }
        amount *= this._incomingDamageMultiplier();
        this.hp -= amount;
        this.hitFlash = 0.18;
        if (game && typeof game.addDamageNumber === 'function' && opts.showNumber !== false) {
            game.addDamageNumber(this.x, this.y - this.size - 10, Math.ceil(amount), opts.color || '#ffee44', { big: !!opts.big, role: 'enemy' });
        }
        if (this.hp <= 0) { this.hp = 0; this.dead = true; }
    }

    applyEffect(type, sourceAtk) {
        const existing = this.statusEffects.find(e => e.type === type);
        if (existing) { existing.timer = 0; return; }
        const eff = StatusEffects.create(type, sourceAtk);
        if (eff) this.statusEffects.push(eff);
    }

    update(dt, player, game) {
        if (this.dead) return;
        if (this.hitFlash > 0) this.hitFlash -= dt;

        if (Math.abs(this.kbVx) > 1 || Math.abs(this.kbVy) > 1) {
            const nx = this.x + this.kbVx * dt;
            const ny = this.y + this.kbVy * dt;
            if (game.currentRoom && !game.currentRoom.isWall(nx, this.y)) this.x = nx;
            if (game.currentRoom && !game.currentRoom.isWall(this.x, ny)) this.y = ny;
            this.kbVx *= 0.85;
            this.kbVy *= 0.85;
        }

        this.frozen = false;
        this.statusEffects = this.statusEffects.filter(e => !StatusEffects.update(e, this, dt, game.enemies, game));
        if (this.frozen) return;

        if (this.isElite && this.eliteModifier === 'regenerating') {
            this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.015 * dt);
        }

        this._behave(dt, player, game);
    }

    _behave(dt, player, game) {
        this._chasePlayer(dt, player, game);
        this.atkTimer -= dt;
        const dx = player.x - this.x, dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < this.attackRange && this.atkTimer <= 0) {
            this.atkTimer = this.attackCooldown;
            this._attackPlayer(player, game);
        }
    }

    _chasePlayer(dt, player, game) {
        const dx = player.x - this.x, dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        if (dist < this.attackRange * 0.8) return;
        const spd = this.moveSpeed * (this.isElite ? 1.1 : 1);
        const nx = this.x + (dx / dist) * spd * dt;
        const ny = this.y + (dy / dist) * spd * dt;
        if (!game.currentRoom || !game.currentRoom.isWall(nx, this.y)) this.x = nx;
        if (!game.currentRoom || !game.currentRoom.isWall(this.x, ny)) this.y = ny;
    }

    _attackPlayer(player, game) {
        const finalAtk = this.atk * (this.isElite ? 1.35 : 1);
        player.takeDamage(finalAtk, { sourceType: 'enemy' }, game);
        if (this.isElite && this.eliteModifier === 'burning') player.applyEffect('burn');
        if (this.isElite && this.eliteModifier === 'toxic') player.applyEffect('poison');
        if (this.isElite && this.eliteModifier === 'vampiric') this.hp = Math.min(this.maxHp, this.hp + finalAtk * 0.4);
    }

    onDeath(game) {
        if (this.isElite && this.eliteModifier === 'explosive') {
            const r = 95;
            const p = game.player;
            const dx = p.x - this.x;
            const dy = p.y - this.y;
            if (dx * dx + dy * dy < r * r) p.takeDamage(this.atk * 0.8, { sourceType: 'enemy' }, game);
            spawnExplosion(game.particles, this.x, this.y, 18, ['#ff441a', '#ffbb33', '#ff7744'], 220, 7);
        }
    }

    getDisplayName() {
        return this.type.replace(/_/g, ' ');
    }

    render(ctx) {
        if (this.dead) return;
        ctx.save();
        if (this.frozen) ctx.filter = 'hue-rotate(180deg) brightness(1.4)';
        if (this.hitFlash > 0) ctx.filter = `brightness(${2 + this.hitFlash * 4})`;
        if (this.isElite) {
            const aura = ELITE_AURA_COLORS[this.eliteModifier] || ELITE_AURA_COLORS.default;
            ctx.shadowColor = aura;
            ctx.shadowBlur = 14;
        }
        const s = this.size * 2;
        Assets.draw(ctx, this.spriteKey, this.x - s / 2, this.y - s / 2, s, s);
        ctx.filter = 'none';
        ctx.shadowBlur = 0;
        ctx.restore();
        this._renderHealthBar(ctx);
    }

    _renderHealthBar(ctx) {
        const bw = this.size * 2.2;
        const bh = 5;
        const bx = this.x - bw / 2;
        const by = this.y - this.size - 10;
        ctx.fillStyle = '#440000';
        ctx.fillRect(bx, by, bw, bh);
        const aura = this.isElite ? (ELITE_AURA_COLORS[this.eliteModifier] || '#ffcc00') : '#44cc44';
        ctx.fillStyle = aura;
        ctx.fillRect(bx, by, bw * (this.hp / this.maxHp), bh);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, bw, bh);
    }

    knockback(fromX, fromY, force) {
        const dx = this.x - fromX, dy = this.y - fromY;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        this.kbVx += (dx / len) * force;
        this.kbVy += (dy / len) * force;
    }
}

class Slime extends Enemy {
    constructor(x, y, isElite, eliteModifier) {
        super({ x, y, hp: isElite ? 55 : 30, atk: 8, moveSpeed: 70, attackCooldown: 1.5, attackRange: 38, size: 18, xpReward: 15, coinReward: rollCoinReward(1, 2), spriteKey: 'enemy_slime', type: 'slime', isElite, eliteModifier });
    }
}

class Bat extends Enemy {
    constructor(x, y, isElite, eliteModifier) {
        super({ x, y, hp: isElite ? 40 : 20, atk: 6, moveSpeed: 140, attackCooldown: 0.8, attackRange: 36, size: 16, xpReward: 18, coinReward: rollCoinReward(1, 2), spriteKey: 'enemy_bat', type: 'bat', isElite, eliteModifier });
    }
    _chasePlayer(dt, player, game) {
        const dx = player.x - this.x, dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const perp = Math.sin(Date.now() * 0.003 + this.x) * 60;
        const px = -dy / dist * perp, py = dx / dist * perp;
        const nx = this.x + ((dx / dist) * this.moveSpeed + px * 0.4) * dt;
        const ny = this.y + ((dy / dist) * this.moveSpeed + py * 0.4) * dt;
        if (!game.currentRoom || !game.currentRoom.isWall(nx, this.y)) this.x = nx;
        if (!game.currentRoom || !game.currentRoom.isWall(this.x, ny)) this.y = ny;
    }
}

class Skeleton extends Enemy {
    constructor(x, y, isElite, eliteModifier) {
        super({ x, y, hp: isElite ? 80 : 45, atk: 10, moveSpeed: 65, attackCooldown: 1.8, attackRange: 200, size: 20, xpReward: 25, coinReward: rollCoinReward(3, 5), spriteKey: 'enemy_skeleton', type: 'skeleton', isElite, eliteModifier });
        this.rangedCooldown = 2.5;
        this.rangedTimer = 1;
    }
    _behave(dt, player, game) {
        const dx = player.x - this.x, dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        if (dist < 160) {
            const spd = this.moveSpeed * 0.7;
            const nx = this.x - (dx / dist) * spd * dt;
            const ny = this.y - (dy / dist) * spd * dt;
            if (!game.currentRoom || !game.currentRoom.isWall(nx, this.y)) this.x = nx;
            if (!game.currentRoom || !game.currentRoom.isWall(this.x, ny)) this.y = ny;
        } else if (dist > 220) {
            this._chasePlayer(dt, player, game);
        }
        this.rangedTimer -= dt;
        if (this.rangedTimer <= 0 && dist < 220) {
            this.rangedTimer = this.rangedCooldown;
            const dmg = this.atk * (this.isElite ? 1.4 : 1);
            game.projectiles.push(new Projectile({ x: this.x, y: this.y, tx: player.x, ty: player.y, speed: 220, damage: dmg, size: 10, type: 'bone', owner: 'enemy', maxLife: 2.5 }));
        }
    }
}

class Spider extends Enemy {
    constructor(x, y, isElite, eliteModifier) {
        super({ x, y, hp: isElite ? 65 : 35, atk: 9, moveSpeed: 100, attackCooldown: 1.0, attackRange: 40, size: 19, xpReward: 22, coinReward: rollCoinReward(1, 2), spriteKey: 'enemy_spider', type: 'spider', isElite, eliteModifier });
    }
    _attackPlayer(player, game) {
        super._attackPlayer(player, game);
        if (Math.random() < 0.4) player.applyEffect('poison');
    }
}

class Bomber extends Enemy {
    constructor(x, y, isElite, eliteModifier) {
        super({ x, y, hp: isElite ? 40 : 25, atk: 35, moveSpeed: 115, attackCooldown: 999, attackRange: 48, size: 18, xpReward: 28, coinReward: rollCoinReward(3, 5), spriteKey: 'enemy_bomber', type: 'bomber', isElite, eliteModifier });
        this.primeTimer = 0;
    }
    _behave(dt, player, game) {
        const dx = player.x - this.x, dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < this.attackRange) {
            this.primeTimer += dt;
            if (this.primeTimer > 0.6) {
                const dmg = this.atk * (this.isElite ? 1.4 : 1);
                const aoeR = 90;
                const pdx = player.x - this.x, pdy = player.y - this.y;
                if (pdx * pdx + pdy * pdy < aoeR * aoeR) player.takeDamage(dmg, { sourceType: 'enemy' }, game);
                spawnExplosion(game.particles, this.x, this.y, 22, ['#ff8800', '#ffcc00', '#ff4400'], 220, 8);
                game.screenShake = Math.max(game.screenShake, 1.0);
                this.dead = true;
                this.hp = 0;
            }
        } else {
            this.primeTimer = 0;
            this._chasePlayer(dt, player, game);
        }
    }
}

class Healer extends Enemy {
    constructor(x, y, isElite, eliteModifier) {
        super({ x, y, hp: isElite ? 75 : 50, atk: 7, moveSpeed: 60, attackCooldown: 2.0, attackRange: 44, size: 19, xpReward: 30, coinReward: rollCoinReward(3, 5), spriteKey: 'enemy_healer', type: 'healer', isElite, eliteModifier });
        this.healCooldown = 3.5;
        this.healTimer = 2;
    }
    _behave(dt, player, game) {
        this.healTimer -= dt;
        let target = null;
        let lowestHpFrac = 0.85;
        for (const e of game.enemies) {
            if (e === this || e.dead) continue;
            const frac = e.hp / e.maxHp;
            if (frac < lowestHpFrac) { lowestHpFrac = frac; target = e; }
        }
        if (target && this.healTimer <= 0) {
            const dx = target.x - this.x, dy = target.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 50) {
                this.healTimer = this.healCooldown;
                target.hp = Math.min(target.maxHp, target.hp + target.maxHp * 0.2);
                spawnExplosion(game.particles, target.x, target.y, 8, ['#44ff88', '#88ffaa'], 60, 5);
            } else {
                const nx = this.x + (dx / dist) * this.moveSpeed * dt;
                const ny = this.y + (dy / dist) * this.moveSpeed * dt;
                if (!game.currentRoom || !game.currentRoom.isWall(nx, this.y)) this.x = nx;
                if (!game.currentRoom || !game.currentRoom.isWall(this.x, ny)) this.y = ny;
            }
        } else {
            this._chasePlayer(dt, player, game);
            this.atkTimer -= dt;
            const dx = player.x - this.x, dy = player.y - this.y;
            if (dx * dx + dy * dy < this.attackRange * this.attackRange && this.atkTimer <= 0) {
                this.atkTimer = this.attackCooldown;
                this._attackPlayer(player, game);
            }
        }
    }
}

class Summoner extends Enemy {
    constructor(x, y, isElite, eliteModifier) {
        super({ x, y, hp: isElite ? 90 : 60, atk: 12, moveSpeed: 55, attackCooldown: 2.5, attackRange: 250, size: 21, xpReward: 35, coinReward: rollCoinReward(3, 5), spriteKey: 'enemy_summoner', type: 'summoner', isElite, eliteModifier });
        this.summonCooldown = 6;
        this.summonTimer = 3;
        this.maxMinions = 3;
    }
    _behave(dt, player, game) {
        const dx = player.x - this.x, dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        if (dist < 180) {
            const nx = this.x - (dx / dist) * this.moveSpeed * dt;
            const ny = this.y - (dy / dist) * this.moveSpeed * dt;
            if (!game.currentRoom || !game.currentRoom.isWall(nx, this.y)) this.x = nx;
            if (!game.currentRoom || !game.currentRoom.isWall(this.x, ny)) this.y = ny;
        }
        this.atkTimer -= dt;
        if (this.atkTimer <= 0 && dist < 280) {
            this.atkTimer = this.attackCooldown;
            game.projectiles.push(new Projectile({ x: this.x, y: this.y, tx: player.x, ty: player.y, speed: 180, damage: this.atk, size: 11, type: 'poison', owner: 'enemy', maxLife: 3 }));
        }
        this.summonTimer -= dt;
        const minionCount = game.enemies.filter(e => (e.type === 'minion' || e.type === 'corrupted_minion') && !e.dead).length;
        if (this.summonTimer <= 0 && minionCount < this.maxMinions) {
            this.summonTimer = this.summonCooldown;
            for (let i = 0; i < 2; i++) game.enemies.push(new Minion(this.x + (Math.random() - 0.5) * 80, this.y + (Math.random() - 0.5) * 80));
            spawnExplosion(game.particles, this.x, this.y, 10, ['#9933cc', '#cc66ff'], 80, 5);
        }
    }
}

class Minion extends Enemy {
    constructor(x, y) {
        super({ x, y, hp: 15, atk: 5, moveSpeed: 120, attackCooldown: 0.9, attackRange: 36, size: 14, xpReward: 8, coinReward: rollCoinReward(1, 2), spriteKey: 'enemy_minion', type: 'minion', isElite: false });
    }
}

class CorruptedMinion extends Enemy {
    constructor(x, y) {
        super({ x, y, hp: 18, atk: 7, moveSpeed: 130, attackCooldown: 0.8, attackRange: 36, size: 14, xpReward: 10, coinReward: rollCoinReward(1, 2), spriteKey: 'enemy_corrupted_minion', type: 'corrupted_minion', isElite: false });
    }
}

class CorruptedSlime extends Enemy {
    constructor(x, y, isElite, eliteModifier) {
        super({ x, y, hp: isElite ? 85 : 52, atk: 12, moveSpeed: 78, attackCooldown: 1.2, attackRange: 40, size: 20, xpReward: 24, coinReward: rollCoinReward(3, 5), spriteKey: 'enemy_corrupted_slime', type: 'corrupted_slime', isElite, eliteModifier, crystalChance: 0.1 });
    }
}

class CorruptedSlimelet extends Enemy {
    constructor(x, y) {
        super({ x, y, hp: 16, atk: 5, moveSpeed: 110, attackCooldown: 1.0, attackRange: 32, size: 12, xpReward: 7, coinReward: rollCoinReward(1, 2), spriteKey: 'enemy_corrupted_slime', type: 'corrupted_slimelet', isElite: false });
    }
}

class VoidBat extends Enemy {
    constructor(x, y, isElite, eliteModifier) {
        super({ x, y, hp: isElite ? 55 : 30, atk: 11, moveSpeed: 170, attackCooldown: 0.95, attackRange: 34, size: 16, xpReward: 24, coinReward: rollCoinReward(3, 5), spriteKey: 'enemy_void_bat', type: 'void_bat', isElite, eliteModifier, crystalChance: 0.05 });
        this.dashTimer = 0;
        this.fade = 1;
    }
    _chasePlayer(dt, player, game) {
        this.dashTimer += dt;
        const phase = Math.sin(this.dashTimer * 6);
        this.fade = phase > 0.55 ? 0.35 : 1;
        const speedBoost = phase > 0.55 ? 1.8 : 1;
        const dx = player.x - this.x, dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const nx = this.x + (dx / dist) * this.moveSpeed * speedBoost * dt;
        const ny = this.y + (dy / dist) * this.moveSpeed * speedBoost * dt;
        if (!game.currentRoom || !game.currentRoom.isWall(nx, this.y)) this.x = nx;
        if (!game.currentRoom || !game.currentRoom.isWall(this.x, ny)) this.y = ny;
    }
    render(ctx) {
        const prev = ctx.globalAlpha;
        ctx.globalAlpha = this.fade;
        super.render(ctx);
        ctx.globalAlpha = prev;
    }
}

class Cultist extends Enemy {
    constructor(x, y, isElite, eliteModifier) {
        super({ x, y, hp: isElite ? 95 : 60, atk: 16, moveSpeed: 62, attackCooldown: 1.7, attackRange: 260, size: 20, xpReward: 33, coinReward: rollCoinReward(6, 10), spriteKey: 'enemy_cultist', type: 'cultist', isElite, eliteModifier, crystalChance: 0.1 });
        this.summonTimer = 5;
        this.summonCooldown = 7;
    }
    _behave(dt, player, game) {
        const dx = player.x - this.x, dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        if (dist < 170) {
            const nx = this.x - (dx / dist) * this.moveSpeed * dt;
            const ny = this.y - (dy / dist) * this.moveSpeed * dt;
            if (!game.currentRoom || !game.currentRoom.isWall(nx, this.y)) this.x = nx;
            if (!game.currentRoom || !game.currentRoom.isWall(this.x, ny)) this.y = ny;
        }
        this.atkTimer -= dt;
        if (this.atkTimer <= 0) {
            this.atkTimer = this.attackCooldown;
            game.projectiles.push(new Projectile({ x: this.x, y: this.y, tx: player.x, ty: player.y, speed: 220, damage: this.atk, size: 12, type: 'boss', owner: 'enemy', maxLife: 2.8, glowColor: '#8a3cff' }));
        }
        this.summonTimer -= dt;
        if (this.summonTimer <= 0) {
            this.summonTimer = this.summonCooldown;
            if (game.enemies.filter(e => e.type === 'corrupted_minion' && !e.dead).length < 4) {
                game.enemies.push(new CorruptedMinion(this.x + (Math.random() - 0.5) * 60, this.y + (Math.random() - 0.5) * 60));
            }
        }
    }
}

class CrystalGolem extends Enemy {
    static VULNERABLE_DAMAGE_MULTIPLIER = 1.5;

    constructor(x, y, isElite, eliteModifier) {
        super({ x, y, hp: isElite ? 240 : 170, atk: 22, moveSpeed: 45, attackCooldown: 2.4, attackRange: 54, size: 25, xpReward: 52, coinReward: rollCoinReward(6, 10), spriteKey: 'enemy_crystal_golem', type: 'crystal_golem', isElite, eliteModifier, crystalChance: 0.2 });
        this.slamTimer = 1.5;
        this.vulnerableTimer = 0;
    }
    _incomingDamageMultiplier() {
        const base = super._incomingDamageMultiplier();
        return this.vulnerableTimer > 0 ? base * CrystalGolem.VULNERABLE_DAMAGE_MULTIPLIER : base;
    }
    update(dt, player, game) {
        super.update(dt, player, game);
        if (this.vulnerableTimer > 0) this.vulnerableTimer -= dt;
    }
    _behave(dt, player, game) {
        this.slamTimer -= dt;
        this._chasePlayer(dt, player, game);
        const dx = player.x - this.x, dy = player.y - this.y;
        const d2 = dx * dx + dy * dy;
        if (this.slamTimer <= 0 && d2 < 220 * 220) {
            this.slamTimer = 4.5;
            this.vulnerableTimer = 2.2;
            spawnExplosion(game.particles, this.x, this.y, 24, ['#8a44ff', '#d6a6ff', '#ffffff'], 220, 6);
            if (d2 < 110 * 110) player.takeDamage(this.atk * 1.2, { sourceType: 'enemy' }, game);
        }
        this.atkTimer -= dt;
        if (d2 < this.attackRange * this.attackRange && this.atkTimer <= 0) {
            this.atkTimer = this.attackCooldown;
            this._attackPlayer(player, game);
        }
    }
}

class CorruptedArcher extends Enemy {
    constructor(x, y, isElite, eliteModifier) {
        super({ x, y, hp: isElite ? 90 : 58, atk: 17, moveSpeed: 75, attackCooldown: 1.4, attackRange: 300, size: 19, xpReward: 35, coinReward: rollCoinReward(6, 10), spriteKey: 'enemy_corrupted_archer', type: 'corrupted_archer', isElite, eliteModifier, crystalChance: 0.08 });
    }
    _behave(dt, player, game) {
        const dx = player.x - this.x, dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        if (dist < 190) {
            const nx = this.x - (dx / dist) * this.moveSpeed * dt;
            const ny = this.y - (dy / dist) * this.moveSpeed * dt;
            if (!game.currentRoom || !game.currentRoom.isWall(nx, this.y)) this.x = nx;
            if (!game.currentRoom || !game.currentRoom.isWall(this.x, ny)) this.y = ny;
        }
        this.atkTimer -= dt;
        if (this.atkTimer <= 0 && dist < 340) {
            this.atkTimer = this.attackCooldown;
            const baseA = Math.atan2(dy, dx);
            for (let i = -1; i <= 1; i++) {
                const a = baseA + i * 0.14;
                game.projectiles.push(new Projectile({ x: this.x, y: this.y, tx: this.x + Math.cos(a) * 520, ty: this.y + Math.sin(a) * 520, speed: 260, damage: this.atk * 0.75, size: 9, type: 'arrow', color: '#c68aff', owner: 'enemy', maxLife: 2.6 }));
            }
        }
    }
}

class VoidHound extends Enemy {
    constructor(x, y, isElite, eliteModifier) {
        super({ x, y, hp: isElite ? 120 : 76, atk: 18, moveSpeed: 115, attackCooldown: 0.9, attackRange: 42, size: 20, xpReward: 38, coinReward: rollCoinReward(6, 10), spriteKey: 'enemy_void_hound', type: 'void_hound', isElite, eliteModifier, crystalChance: 0.1 });
        this.lungeTimer = 1.8;
    }
    _behave(dt, player, game) {
        if (this.hp < this.maxHp * 0.3) this.moveSpeed = Math.max(this.moveSpeed, 165);
        this.lungeTimer -= dt;
        if (this.lungeTimer <= 0) {
            this.lungeTimer = 2.1;
            const dx = player.x - this.x, dy = player.y - this.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            this.kbVx += (dx / len) * 340;
            this.kbVy += (dy / len) * 340;
        }
        super._behave(dt, player, game);
    }
}

class CrystalTurret extends Enemy {
    constructor(x, y, isElite, eliteModifier) {
        super({ x, y, hp: isElite ? 140 : 95, atk: 16, moveSpeed: 0, attackCooldown: 1.6, attackRange: 340, size: 21, xpReward: 32, coinReward: rollCoinReward(6, 10), spriteKey: 'enemy_crystal_turret', type: 'crystal_turret', isElite, eliteModifier, crystalChance: 0.15 });
        this.rotation = 0;
    }
    _chasePlayer() {}
    _behave(dt, player, game) {
        this.rotation += dt * 0.7;
        this.atkTimer -= dt;
        if (this.atkTimer <= 0) {
            this.atkTimer = this.attackCooldown;
            const base = Math.atan2(player.y - this.y, player.x - this.x);
            game.projectiles.push(new Projectile({ x: this.x, y: this.y, tx: this.x + Math.cos(base) * 560, ty: this.y + Math.sin(base) * 560, speed: 300, damage: this.atk, size: 10, type: 'boss', owner: 'enemy', maxLife: 2.4, glowColor: '#9b72ff' }));
        }
    }
}

class CorruptedSummoner extends Enemy {
    constructor(x, y, isElite, eliteModifier) {
        super({ x, y, hp: isElite ? 160 : 110, atk: 14, moveSpeed: 58, attackCooldown: 2.2, attackRange: 280, size: 22, xpReward: 45, coinReward: rollCoinReward(6, 10), spriteKey: 'enemy_corrupted_summoner', type: 'corrupted_summoner', isElite, eliteModifier, crystalChance: 0.14 });
        this.summonTimer = 3.5;
        this.buffTimer = 2.8;
    }
    _behave(dt, player, game) {
        const dx = player.x - this.x, dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        if (dist < 170) {
            const nx = this.x - (dx / dist) * this.moveSpeed * dt;
            const ny = this.y - (dy / dist) * this.moveSpeed * dt;
            if (!game.currentRoom || !game.currentRoom.isWall(nx, this.y)) this.x = nx;
            if (!game.currentRoom || !game.currentRoom.isWall(this.x, ny)) this.y = ny;
        }
        this.atkTimer -= dt;
        if (this.atkTimer <= 0) {
            this.atkTimer = this.attackCooldown;
            game.projectiles.push(new Projectile({ x: this.x, y: this.y, tx: player.x, ty: player.y, speed: 190, damage: this.atk, size: 11, type: 'poison', owner: 'enemy', maxLife: 3, glowColor: '#7c31cf' }));
        }
        this.summonTimer -= dt;
        if (this.summonTimer <= 0) {
            this.summonTimer = 6;
            if (game.enemies.filter(e => e.type === 'corrupted_minion' && !e.dead).length < 5) {
                for (let i = 0; i < 2; i++) game.enemies.push(new CorruptedMinion(this.x + (Math.random() - 0.5) * 80, this.y + (Math.random() - 0.5) * 80));
            }
        }
        this.buffTimer -= dt;
        if (this.buffTimer <= 0) {
            this.buffTimer = 4.5;
            for (const e of game.enemies) {
                if (e.dead || e === this) continue;
                const ex = e.x - this.x, ey = e.y - this.y;
                if (ex * ex + ey * ey < 170 * 170) {
                    e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.08);
                    e.moveSpeed *= 1.03;
                }
            }
            spawnExplosion(game.particles, this.x, this.y, 10, ['#8d2fff', '#d278ff'], 90, 4);
        }
    }
}

class Necromancer extends Enemy {
    constructor(x, y) {
        super({ x, y, hp: 800, atk: 18, moveSpeed: 55, attackCooldown: 1.2, attackRange: 350, size: 44, xpReward: 400, coinReward: 35, spriteKey: 'boss_necromancer', type: 'boss_necromancer', isElite: false });
        this.isBoss = true;
        this.phase = 1;
        this.phaseSwitched = false;
        this.crystalChance = 1;
        this.specialCooldown = 4;
        this.specialTimer = 2;
        this.summonCooldown = 8;
        this.summonTimer = 5;
        this.orbitalAngle = 0;
    }
    getDisplayName() { return 'Necromancer'; }
    update(dt, player, game) {
        super.update(dt, player, game);
        if (!this.phaseSwitched && this.hp < this.maxHp * 0.5) {
            this.phase = 2;
            this.phaseSwitched = true;
            this.moveSpeed = 80;
            this.attackCooldown = 0.9;
            game.screenShake = Math.max(game.screenShake, 2);
            spawnExplosion(game.particles, this.x, this.y, 30, ['#aa00ff', '#440088', '#ff88ff'], 200, 10);
        }
    }
    _behave(dt, player, game) {
        this.orbitalAngle += dt * (this.phase === 2 ? 0.7 : 0.4);
        const targetX = 400 + Math.cos(this.orbitalAngle) * 140;
        const targetY = 300 + Math.sin(this.orbitalAngle) * 80;
        const dx = targetX - this.x, dy = targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        if (dist > 5) {
            const nx = this.x + (dx / dist) * this.moveSpeed * dt;
            const ny = this.y + (dy / dist) * this.moveSpeed * dt;
            if (!game.currentRoom || !game.currentRoom.isWall(nx, this.y)) this.x = nx;
            if (!game.currentRoom || !game.currentRoom.isWall(this.x, ny)) this.y = ny;
        }
        this.atkTimer -= dt;
        const pdx = player.x - this.x, pdy = player.y - this.y;
        if (this.atkTimer <= 0) {
            this.atkTimer = this.attackCooldown;
            const shots = this.phase === 2 ? 3 : 1;
            for (let i = 0; i < shots; i++) {
                const spread = (i - (shots - 1) / 2) * 0.3;
                const angle = Math.atan2(pdy, pdx) + spread;
                game.projectiles.push(new Projectile({ x: this.x, y: this.y, tx: this.x + Math.cos(angle) * 500, ty: this.y + Math.sin(angle) * 500, speed: 200 + this.phase * 40, damage: this.atk, size: 14, type: 'boss', owner: 'enemy', maxLife: 3, glowColor: '#aa00ff' }));
            }
        }
        this.specialTimer -= dt;
        if (this.specialTimer <= 0) {
            this.specialTimer = this.specialCooldown * (this.phase === 2 ? 0.7 : 1);
            const count = this.phase === 2 ? 8 : 6;
            for (let i = 0; i < count; i++) {
                const a = (i / count) * Math.PI * 2;
                game.projectiles.push(new Projectile({ x: this.x, y: this.y, tx: this.x + Math.cos(a) * 500, ty: this.y + Math.sin(a) * 500, speed: 160, damage: this.atk * 0.7, size: 11, type: 'boss', owner: 'enemy', maxLife: 3.5 }));
            }
        }
        this.summonTimer -= dt;
        if (this.summonTimer <= 0) {
            this.summonTimer = this.summonCooldown * (this.phase === 2 ? 0.7 : 1);
            const count = this.phase === 2 ? 4 : 2;
            for (let i = 0; i < count; i++) {
                const a = Math.random() * Math.PI * 2;
                const r = 80 + Math.random() * 80;
                game.enemies.push(new Skeleton(this.x + Math.cos(a) * r, this.y + Math.sin(a) * r, false));
            }
        }
    }
}

class CrystalBehemoth extends Enemy {
    constructor(x, y) {
        super({ x, y, hp: 1400, atk: 26, moveSpeed: 62, attackCooldown: 1.1, attackRange: 60, size: 50, xpReward: 550, coinReward: 55, spriteKey: 'boss_crystal_behemoth', type: 'boss_crystal_behemoth', isElite: false, crystalChance: 1 });
        this.isBoss = true;
        this.phase = 1;
        this.slamTimer = 2.5;
        this.barrageTimer = 3.6;
        this.chargeTimer = 5.8;
        this.summonTimer = 6.5;
    }
    getDisplayName() { return 'The Crystal Behemoth'; }
    update(dt, player, game) {
        super.update(dt, player, game);
        if (this.phase === 1 && this.hp < this.maxHp * 0.5) {
            this.phase = 2;
            this.moveSpeed = 78;
            this.attackCooldown = 0.8;
            spawnExplosion(game.particles, this.x, this.y, 36, ['#b86bff', '#fff0ff', '#c095ff'], 260, 8);
        }
    }
    _behave(dt, player, game) {
        this._chasePlayer(dt, player, game);
        this.slamTimer -= dt;
        this.barrageTimer -= dt;
        this.chargeTimer -= dt;
        this.summonTimer -= dt;

        if (this.slamTimer <= 0) {
            this.slamTimer = this.phase === 2 ? 2.2 : 3.1;
            const dx = player.x - this.x, dy = player.y - this.y;
            if (dx * dx + dy * dy < 140 * 140) player.takeDamage(this.atk * 1.2, { sourceType: 'enemy' }, game);
            spawnExplosion(game.particles, this.x, this.y, 28, ['#a55cff', '#dcb2ff', '#ffffff'], 250, 8);
        }

        if (this.barrageTimer <= 0) {
            this.barrageTimer = this.phase === 2 ? 2.3 : 3.4;
            const shots = this.phase === 2 ? 14 : 10;
            for (let i = 0; i < shots; i++) {
                const a = (i / shots) * Math.PI * 2;
                game.projectiles.push(new Projectile({ x: this.x, y: this.y, tx: this.x + Math.cos(a) * 650, ty: this.y + Math.sin(a) * 650, speed: 240, damage: this.atk * 0.8, size: 11, type: 'boss', owner: 'enemy', maxLife: 2.8, glowColor: '#bc8fff' }));
            }
        }

        if (this.chargeTimer <= 0) {
            this.chargeTimer = this.phase === 2 ? 4.2 : 6;
            const dx = player.x - this.x, dy = player.y - this.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            this.kbVx += (dx / len) * 480;
            this.kbVy += (dy / len) * 480;
        }

        if (this.summonTimer <= 0) {
            this.summonTimer = this.phase === 2 ? 4.8 : 6.8;
            const count = this.phase === 2 ? 3 : 2;
            for (let i = 0; i < count; i++) {
                const a = Math.random() * Math.PI * 2;
                const r = 70 + Math.random() * 70;
                game.enemies.push(new CrystalTurret(this.x + Math.cos(a) * r, this.y + Math.sin(a) * r, false));
            }
            if (game.currentRoom && typeof game.currentRoom.spreadCorruptionTile === 'function') {
                for (let i = 0; i < (this.phase === 2 ? 3 : 2); i++) game.currentRoom.spreadCorruptionTile(game);
            }
        }
    }
}

class VoidHerald extends Enemy {
    constructor(x, y) {
        super({ x, y, hp: 2200, atk: 32, moveSpeed: 80, attackCooldown: 0.95, attackRange: 420, size: 54, xpReward: 900, coinReward: 90, spriteKey: 'boss_void_herald', type: 'boss_void_herald', isElite: false, crystalChance: 1 });
        this.isBoss = true;
        this.phase = 1;
        this.teleportTimer = 3.6;
        this.patternTimer = 1.4;
        this.summonTimer = 7.5;
        this.hazardTimer = 2.5;
    }
    getDisplayName() { return 'The Void Herald'; }
    update(dt, player, game) {
        super.update(dt, player, game);
        if (this.phase === 1 && this.hp < this.maxHp * 0.5) {
            this.phase = 2;
            spawnExplosion(game.particles, this.x, this.y, 40, ['#9026ff', '#f35dff', '#fff'], 280, 8);
        } else if (this.phase === 2 && this.hp < this.maxHp * 0.25) {
            this.phase = 3;
            this.attackCooldown = 0.7;
            this.moveSpeed = 98;
            spawnExplosion(game.particles, this.x, this.y, 46, ['#7f1eff', '#d64bff', '#ff2f88'], 320, 9);
        }
    }
    _behave(dt, player, game) {
        this.teleportTimer -= dt;
        this.patternTimer -= dt;
        this.summonTimer -= dt;
        this.hazardTimer -= dt;

        if (this.teleportTimer <= 0) {
            this.teleportTimer = this.phase === 3 ? 2.2 : 3.7;
            this.x = 180 + Math.random() * 440;
            this.y = 130 + Math.random() * 340;
            spawnExplosion(game.particles, this.x, this.y, 16, ['#952dff', '#f090ff'], 120, 5);
        }

        if (this.patternTimer <= 0) {
            this.patternTimer = this.phase === 3 ? 0.9 : 1.45;
            if (this.phase === 1) {
                for (let i = -1; i <= 1; i++) {
                    const a = Math.atan2(player.y - this.y, player.x - this.x) + i * 0.18;
                    game.projectiles.push(new Projectile({ x: this.x, y: this.y, tx: this.x + Math.cos(a) * 700, ty: this.y + Math.sin(a) * 700, speed: 260, damage: this.atk * 0.8, size: 12, type: 'boss', owner: 'enemy', maxLife: 2.8, glowColor: '#b246ff' }));
                }
            } else if (this.phase === 2) {
                const beams = 8;
                for (let i = 0; i < beams; i++) {
                    const a = (i / beams) * Math.PI * 2 + Date.now() * 0.001;
                    game.projectiles.push(new Projectile({ x: this.x, y: this.y, tx: this.x + Math.cos(a) * 800, ty: this.y + Math.sin(a) * 800, speed: 210, damage: this.atk * 0.9, size: 13, type: 'boss', owner: 'enemy', maxLife: 3.2, glowColor: '#d061ff' }));
                }
            } else {
                const shots = 14;
                for (let i = 0; i < shots; i++) {
                    const a = (i / shots) * Math.PI * 2 + Math.random() * 0.08;
                    game.projectiles.push(new Projectile({ x: this.x, y: this.y, tx: this.x + Math.cos(a) * 760, ty: this.y + Math.sin(a) * 760, speed: 280, damage: this.atk, size: 11, type: 'boss', owner: 'enemy', maxLife: 2.3, glowColor: '#f14bd4' }));
                }
            }
        }

        if (this.summonTimer <= 0) {
            this.summonTimer = this.phase === 3 ? 4.2 : 6.7;
            const summonCount = this.phase === 1 ? 2 : 3;
            for (let i = 0; i < summonCount; i++) {
                const ex = this.x + (Math.random() - 0.5) * 180;
                const ey = this.y + (Math.random() - 0.5) * 180;
                game.enemies.push(this.phase === 1 ? new Cultist(ex, ey, false) : new CorruptedSummoner(ex, ey, false));
            }
        }

        if (this.hazardTimer <= 0 && game.currentRoom && typeof game.currentRoom.spreadCorruptionTile === 'function') {
            this.hazardTimer = this.phase === 3 ? 0.8 : 1.7;
            const pulses = this.phase === 3 ? 3 : 1;
            for (let i = 0; i < pulses; i++) game.currentRoom.spreadCorruptionTile(game);
        }
    }
}

function createEnemy(type, x, y, options) {
    const opts = (typeof options === 'boolean') ? { isElite: options } : ((options && typeof options === 'object') ? options : {});
    const isElite = !!opts.isElite;
    const eliteModifier = opts.eliteModifier || null;
    switch (type) {
        case 'slime': return new Slime(x, y, isElite, eliteModifier);
        case 'bat': return new Bat(x, y, isElite, eliteModifier);
        case 'skeleton': return new Skeleton(x, y, isElite, eliteModifier);
        case 'spider': return new Spider(x, y, isElite, eliteModifier);
        case 'bomber': return new Bomber(x, y, isElite, eliteModifier);
        case 'healer': return new Healer(x, y, isElite, eliteModifier);
        case 'summoner': return new Summoner(x, y, isElite, eliteModifier);
        case 'minion': return new Minion(x, y);
        case 'corrupted_minion': return new CorruptedMinion(x, y);
        case 'corrupted_slime': return new CorruptedSlime(x, y, isElite, eliteModifier);
        case 'corrupted_slimelet': return new CorruptedSlimelet(x, y);
        case 'void_bat': return new VoidBat(x, y, isElite, eliteModifier);
        case 'cultist': return new Cultist(x, y, isElite, eliteModifier);
        case 'crystal_golem': return new CrystalGolem(x, y, isElite, eliteModifier);
        case 'corrupted_archer': return new CorruptedArcher(x, y, isElite, eliteModifier);
        case 'void_hound': return new VoidHound(x, y, isElite, eliteModifier);
        case 'crystal_turret': return new CrystalTurret(x, y, isElite, eliteModifier);
        case 'corrupted_summoner': return new CorruptedSummoner(x, y, isElite, eliteModifier);
        case 'boss_necromancer': return new Necromancer(x, y);
        case 'boss_crystal_behemoth': return new CrystalBehemoth(x, y);
        case 'boss_void_herald': return new VoidHerald(x, y);
        default: return new Slime(x, y, isElite, eliteModifier);
    }
}

if (typeof window !== 'undefined') {
    window.createEnemy = createEnemy;
}
