'use strict';
// Abilities: Fireball (J), Dash (K), Ice Nova (L)

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

class DashAbility {
    constructor(player) {
        this.player = player;
        this.baseCooldown = 5;
        this.cooldown = 0;
        this.key = 'k';
        this.name = 'Dash';
        this.iconKey = 'icon_dash';
        this.dashSpeed = 700;
        this.dashDuration = 0.18;
        this.dashing = false;
        this.dashTimer = 0;
        this.dashVx = 0;
        this.dashVy = 0;
        this.trailTimer = 0;
    }

    get maxCooldown() {
        return this.baseCooldown * (this.player.abilityCooldownMult||1);
    }

    canUse() { return this.cooldown <= 0 && !this.dashing; }

    use(game) {
        if (!this.canUse()) return false;
        const p = this.player;

        // Dash in movement direction, or toward mouse/nearest enemy
        let dx = 0, dy = 0;
        const keys = game.keys;
        if (keys['KeyW']||keys['ArrowUp'])    dy -= 1;
        if (keys['KeyS']||keys['ArrowDown'])  dy += 1;
        if (keys['KeyA']||keys['ArrowLeft'])  dx -= 1;
        if (keys['KeyD']||keys['ArrowRight']) dx += 1;

        if (dx === 0 && dy === 0) {
            // dash toward nearest enemy
            const t = game.nearestEnemy(p.x, p.y, 9999);
            if (t) {
                dx = t.x - p.x; dy = t.y - p.y;
            } else {
                dx = 1;
            }
        }
        const len = Math.sqrt(dx*dx+dy*dy);
        this.dashVx = (dx/len) * this.dashSpeed;
        this.dashVy = (dy/len) * this.dashSpeed;
        this.dashing = true;
        this.dashTimer = 0;
        p.invincible = true;
        this.cooldown = this.maxCooldown;
        return true;
    }

    update(dt, game) {
        if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt);

        if (this.dashing) {
            this.dashTimer += dt;
            const p = this.player;

            // Move player
            const nx = p.x + this.dashVx * dt;
            const ny = p.y + this.dashVy * dt;
            if (!game.currentRoom || !game.currentRoom.isWall(nx, p.y)) p.x = nx;
            if (!game.currentRoom || !game.currentRoom.isWall(p.x, ny)) p.y = ny;

            // Spawn trail particles
            this.trailTimer += dt;
            if (this.trailTimer > 0.03) {
                this.trailTimer = 0;
                spawnExplosion(game.particles, p.x, p.y, 3, ['#4488ff','#88ccff','#aaddff'], 50, 6);
            }

            if (this.dashTimer >= this.dashDuration) {
                this.dashing = false;
                p.invincible = false;
            }
        }
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
