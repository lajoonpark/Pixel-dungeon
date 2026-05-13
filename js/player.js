'use strict';

class Player {
    constructor(classId) {
        const classDef = (typeof ClassSystem !== 'undefined' && ClassSystem.get(classId))
            || { id: classId, maxHp: 120, baseAtk: 14, moveSpeed: 220, range: 140,
                 spriteKey: 'player_adventurer', name: 'Human Adventurer',
                 applyPassive() {}, abilityIds: ['quick_slash','dash_strike'] };

        this.classDef   = classDef;
        this.cls        = classDef.id;
        this.maxHp      = classDef.maxHp;
        this.baseAtk    = classDef.baseAtk;
        this.moveSpeed  = classDef.moveSpeed;
        this.range      = classDef.range;
        this.spriteKey  = classDef.spriteKey || 'player_adventurer';
        this.name       = classDef.name;

        this.x = 100;
        this.y = 300;
        this.hp = this.maxHp;

        // Multipliers (upgraded via upgrade cards)
        this.atkMult             = 1;
        this.atkSpeedMult        = 1;
        this.moveSpeedMult       = 1;
        this.abilityCooldownMult = 1;
        this.abilityDmgMult      = 1;
        this.poisonDmgMult       = 1;
        this.minionBuff          = 1;
        this.healingMult         = 1;
        this.burnDurationMult    = 1;
        this.critDmgBonus        = 0;
        this.damageTakenMult     = 1;
        this.dodgeChance         = 0;

        // Auto-attack state
        this.atkCooldown   = 0;
        this.baseAtkSpeed  = 1.0;
        this.multiShot     = 1;
        this.critChance    = 0;
        this.lifeSteal     = 0;
        this.thorns        = 0;
        this.regen         = 0;
        this.regenTimer    = 0;
        this.onHitBurnChance   = 0;
        this.onHitPoisonChance = 0;
        this.onHitSlow         = false;
        this.lightningChain    = 0;

        // Legacy compat (upgrade system references these)
        this.fireballDmgMult = 1;
        this.fireballAoeMult = 1;
        this.fireballCDMult  = 1;
        this.novaDmgMult     = 1;
        this.novaRadiusMult  = 1;
        this.quickSlashDmgMult = 1;
        this.quickSlashRadiusMult = 1;
        this.quickSlashCDMult = 1;
        this.dashStrikeDmgMult = 1;
        this.dashStrikeDistanceMult = 1;
        this.dashStrikeCDMult = 1;
        this.flameDashDurationMult = 1;
        this.piercingArrowDmgMult = 1;
        this.piercingArrowExtraPierce = 0;
        this.rollDashCDMult = 1;
        this.isMage   = false;
        this.isRogue  = false;

        // Apply class passive
        if (classDef.applyPassive) classDef.applyPassive(this);

        // Level & XP
        this.level    = 1;
        this.xp       = 0;
        this.xpToNext = 100;

        // Build abilities from class definition
        this.abilities = (typeof ClassSystem !== 'undefined')
            ? ClassSystem.buildAbilities(this, classDef)
            : [new FireballAbility(this), new DashAbility(this), new IceNovaAbility(this)];

        // Bonus crystals
        this.bonusCrystals = 0;

        // Visual
        this.hitFlash       = 0;
        this.invincible     = false;
        this.invincibleTimer = 0;
        this.frozen         = false;
        this.statusEffects  = [];
        this.kbVx = 0;
        this.kbVy = 0;
        this.facing   = 1;
        this.animTimer = 0;

        // Class-specific state
        this._frostArmor  = false;
        this._stealth     = false;
        this.chronoRepeatTimer    = 0;
        this.chronoRepeatInterval = 999;
    }

    get atkInterval() {
        return this.baseAtkSpeed / this.atkSpeedMult;
    }

    /** Find the dash ability by isDash flag */
    get dashAbility() {
        return this.abilities.find(a => a.isDash) || null;
    }

    applyEffect(type) {
        const existing = this.statusEffects.find(e => e.type === type);
        if (existing) { existing.timer = 0; return; }
        const eff = StatusEffects.create(type, 0);
        if (eff) this.statusEffects.push(eff);
    }

    takeDamage(amount, sourceOrContext, gameArg) {
        if (this.invincible) return;
        const game = (gameArg && typeof gameArg === 'object')
            ? gameArg
            : ((sourceOrContext && typeof sourceOrContext === 'object') ? sourceOrContext : null);

        const dodgeChance = Math.min(0.5, Math.max(0, this.dodgeChance || 0));
        if (dodgeChance > 0 && Math.random() < dodgeChance) {
            if (game && typeof game.addDamageNumber === 'function') {
                game.addDamageNumber(this.x, this.y - 40, 0, '#88ddff', { text: 'DODGE', big: true, role: 'player' });
            }
            return;
        }

        amount = Number.isFinite(amount) ? amount : 0;
        amount *= (this.damageTakenMult || 1);
        if (this._frostArmor) amount *= 0.6; // Frost Armor: 40% damage reduction
        this.hp = Math.max(0, this.hp - amount);
        this.hitFlash = 0.25;
        this.invincible = true;
        this.invincibleTimer = 0.6;
        if (game && typeof game.addDamageNumber === 'function') {
            game.addDamageNumber(this.x, this.y - 40, Math.ceil(amount), '#ff4444', { role: 'player' });
        }
        if (this.hp <= 0 && game && typeof game.gameOver === 'function') game.gameOver();
    }

    gainXp(amount, game) {
        this.xp += amount;
        while (this.xp >= this.xpToNext) {
            this.xp -= this.xpToNext;
            this.level++;
            this.xpToNext = Math.floor(100 * Math.pow(this.level, 1.5));
            if (game) game.triggerLevelUp();
        }
    }

    update(dt, game) {
        // Invincibility frames
        if (this.invincible) {
            this.invincibleTimer -= dt;
            if (this.invincibleTimer <= 0) { this.invincible = false; }
        }
        if (this.hitFlash > 0) this.hitFlash -= dt;

        // Knockback
        if (Math.abs(this.kbVx) > 1 || Math.abs(this.kbVy) > 1) {
            const nx = this.x + this.kbVx * dt;
            const ny = this.y + this.kbVy * dt;
            if (!game.currentRoom || !game.currentRoom.isWall(nx, this.y)) this.x = nx;
            if (!game.currentRoom || !game.currentRoom.isWall(this.x, ny)) this.y = ny;
            this.kbVx *= 0.8;
            this.kbVy *= 0.8;
        }

        // Status effects
        this.frozen = false;
        this.statusEffects = this.statusEffects.filter(e => !StatusEffects.update(e, this, dt, null, game));

        // HP regen
        if (this.regen > 0) {
            this.regenTimer += dt;
            if (this.regenTimer >= 1) {
                this.regenTimer -= 1;
                const healed = Math.min(this.regen, this.maxHp - this.hp);
                if (healed > 0) {
                    this.hp += healed;
                    if (game && typeof game.addDamageNumber === 'function') {
                        game.addDamageNumber(this.x, this.y - 40, Math.ceil(healed), '#44ff88', { role: 'player' });
                    }
                }
            }
        }

        if (this.frozen) return;

        // Movement
        const keys = game.keys;
        let dx = 0, dy = 0;
        if (keys['KeyW'] || keys['ArrowUp'])    dy -= 1;
        if (keys['KeyS'] || keys['ArrowDown'])  dy += 1;
        if (keys['KeyA'] || keys['ArrowLeft'])  dx -= 1;
        if (keys['KeyD'] || keys['ArrowRight']) dx += 1;

        if (dx !== 0) this.facing = dx > 0 ? 1 : -1;

        // Mobile joystick
        if (game.joystick && game.joystick.active) {
            dx += game.joystick.dx;
            dy += game.joystick.dy;
        }

        const len = Math.sqrt(dx*dx+dy*dy);
        if (len > 0) {
            this.animTimer += dt;
            const spd = this.moveSpeed * this.moveSpeedMult;
            const nx = this.x + (dx/len) * spd * dt;
            const ny = this.y + (dy/len) * spd * dt;
            if (!game.currentRoom || !game.currentRoom.isWall(nx, this.y)) this.x = nx;
            if (!game.currentRoom || !game.currentRoom.isWall(this.x, ny)) this.y = ny;
        }

        // Clamp to canvas
        this.x = Math.max(30, Math.min(770, this.x));
        this.y = Math.max(30, Math.min(570, this.y));

        // Hazard tiles
        if (game.currentRoom) {
            const tileType = game.currentRoom.tileAt(this.x, this.y);
            if (tileType === TILE.SPIKE) {
                if (!this._spikeTimer) this._spikeTimer = 0;
                this._spikeTimer += dt;
                if (this._spikeTimer > 0.5) { this._spikeTimer = 0; this.takeDamage(8, game); }
            } else if (tileType === TILE.POISON) {
                this.applyEffect('poison');
            } else if (tileType === TILE.CORRUPTION) {
                if (!this._corruptionTimer) this._corruptionTimer = 0;
                this._corruptionTimer += dt;
                if (this._corruptionTimer > 0.35) { this._corruptionTimer = 0; this.takeDamage(6, game); }
                this.applyEffect('slow');
            } else if (tileType === TILE.RUNE) {
                this.applyEffect('slow');
            } else if (tileType === TILE.CRYSTAL) {
                this.applyEffect('slow');
                if (!this._crystalTick) this._crystalTick = 0;
                this._crystalTick += dt;
                if (this._crystalTick > 0.7) { this._crystalTick = 0; this.takeDamage(4, game); }
            }
        }

        // Auto-attack (pause during dash)
        const dash = this.dashAbility;
        const isDashing = dash && dash.dashing;
        if (!isDashing) {
            this.atkCooldown -= dt;
            if (this.atkCooldown <= 0) {
                const targets = this._getAutoTargets(game);
                if (targets.length > 0) {
                    this.atkCooldown = this.atkInterval;
                    for (const t of targets) this._shootAt(t, game);
                }
            }
        }

        // Ability updates
        for (const ab of this.abilities) {
            if (ab.update) ab.update(dt, game);
        }

        // Chronomancer slow aura
        if (this.chronoSlowAura) {
            for (const e of game.enemies) {
                if (e.dead) continue;
                const ex = e.x - this.x, ey = e.y - this.y;
                if (ex*ex+ey*ey < 200*200) {
                    e._slowTimer = Math.max(e._slowTimer || 0, 0.15);
                    e._slowMult = Math.min(e._slowMult || 1, 0.85);
                }
            }
        }

        // Chronomancer auto-repeat passive
        if (this.chronoRepeatInterval < 999) {
            this.chronoRepeatTimer += dt;
            if (this.chronoRepeatTimer >= this.chronoRepeatInterval) {
                this.chronoRepeatTimer = 0;
                // Auto-use first available non-dash ability
                const ab = this.abilities.find(a => !a.isDash && typeof a.canUse === 'function' && a.canUse());
                if (ab) ab.use(game);
            }
        }
    }

    _getAutoTargets(game) {
        const enemies = game.enemies.filter(e => !e.dead);
        if (enemies.length === 0) return [];
        const sorted = enemies.map(e => {
            const dx = e.x - this.x, dy = e.y - this.y;
            return { e, dist: Math.sqrt(dx*dx+dy*dy) };
        }).sort((a, b) => a.dist - b.dist);

        const inRange = sorted.filter(({dist}) => dist <= this.range);
        if (inRange.length === 0) return [];
        return inRange.slice(0, this.multiShot || 1).map(({e}) => e);
    }

    _shootAt(target, game) {
        let dmg = this.baseAtk * this.atkMult;
        let isCrit = false;
        if (this.critChance > 0 && Math.random() < this.critChance) {
            const critMult = 2 + (this.critDmgBonus || 0);
            dmg *= critMult;
            isCrit = true;
        }

        const proj = new Projectile({
            x: this.x, y: this.y,
            tx: target.x, ty: target.y,
            target, homing: true,
            speed: 420, damage: dmg,
            size: 10, type: 'arrow',
            color: isCrit ? '#ffff44' : '#ffcc44',
            glowColor: isCrit ? '#ffff00' : null,
            owner: 'player',
            maxLife: 2,
            onHit: (enemy, gm) => {
                if (this.lifeSteal > 0) {
                    this.hp = Math.min(this.maxHp, this.hp + dmg * this.lifeSteal);
                }
                if (this.onHitBurnChance > 0 && Math.random() < this.onHitBurnChance) {
                    enemy.applyEffect('burn', this.baseAtk * this.atkMult);
                }
                if (this.onHitPoisonChance > 0 && Math.random() < this.onHitPoisonChance) {
                    enemy.applyEffect('poison', 0);
                }
                if (this.onHitSlow) {
                    enemy._slowTimer = (enemy._slowTimer || 0) + 1;
                    enemy._slowMult = Math.min(enemy._slowMult || 1, 0.6);
                }
                if (isCrit && gm && typeof gm.addDamageNumber === 'function') {
                    gm.addDamageNumber(enemy.x, enemy.y - 30, Math.ceil(dmg), '#ffff44', { big: true, role: 'enemy' });
                }
                if (this.thorns > 0) enemy.knockback(this.x, this.y, 120);
            }
        });
        game.projectiles.push(proj);
    }

    render(ctx) {
        ctx.save();

        // Stealth: semi-transparent
        if (this._stealth) ctx.globalAlpha = 0.4;

        // Invincibility flicker
        if (this.invincible && Math.floor(Date.now()/80) % 2 === 0) {
            ctx.globalAlpha = Math.min(ctx.globalAlpha || 1, 0.4);
        }

        if (this.hitFlash > 0) ctx.filter = `brightness(${2 + this.hitFlash*3})`;

        const s = 48;
        if (this.facing < 0) {
            ctx.translate(this.x, this.y);
            ctx.scale(-1, 1);
            Assets.draw(ctx, this.spriteKey, -s/2, -s/2, s, s);
        } else {
            Assets.draw(ctx, this.spriteKey, this.x - s/2, this.y - s/2, s, s);
        }

        ctx.filter = 'none';
        ctx.globalAlpha = 1;
        ctx.restore();

        // Frost armor ring
        if (this._frostArmor) {
            ctx.strokeStyle = '#88ccff';
            ctx.globalAlpha = 0.6 + Math.sin(Date.now()/150)*0.3;
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(this.x, this.y, 30, 0, Math.PI*2); ctx.stroke();
            ctx.globalAlpha = 1;
        }

        // Status rings
        for (const eff of this.statusEffects) {
            ctx.strokeStyle = StatusEffects.getColor(eff.type);
            ctx.globalAlpha = 0.6;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, 28, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        // Shadow blades
        for (const ab of this.abilities) {
            if (ab.renderBlades) ab.renderBlades(ctx);
        }
    }
}
