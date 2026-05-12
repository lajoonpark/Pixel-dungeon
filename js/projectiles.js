'use strict';
class Projectile {
    constructor(cfg) {
        this.x = cfg.x;
        this.y = cfg.y;
        this.tx = cfg.tx;        // target x (final)
        this.ty = cfg.ty;        // target y
        this.target = cfg.target || null; // enemy ref for homing
        this.speed = cfg.speed || 400;
        this.damage = cfg.damage || 10;
        this.size = cfg.size || 10;
        this.color = cfg.color || '#ffcc44';
        this.type = cfg.type || 'arrow';  // arrow, fireball, boss, poison, minion
        this.onHit = cfg.onHit || null;   // callback(enemy)
        this.aoe = cfg.aoe || 0;          // radius for aoe blast
        this.homing = cfg.homing || false;
        this.dead = false;
        this.owner = cfg.owner || 'player'; // 'player' or 'enemy'
        this.glowColor = cfg.glowColor || null;
        this.piercing = !!cfg.piercing;
        this.pierceRemaining = Math.max(0, Math.floor(cfg.pierceCount || 0));
        this.hitTargets = new Set();
        this.angle = Math.atan2(cfg.ty - cfg.y, cfg.tx - cfg.x);
        this._vx = Math.cos(this.angle) * this.speed;
        this._vy = Math.sin(this.angle) * this.speed;
        this.life = 0;
        this.maxLife = cfg.maxLife || 3;
    }

    update(dt) {
        this.life += dt;
        if (this.life > this.maxLife) { this.dead = true; return; }

        // Homing: update angle toward target each frame
        if (this.homing && this.target && !this.target.dead) {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            this.angle = Math.atan2(dy, dx);
            this._vx = Math.cos(this.angle) * this.speed;
            this._vy = Math.sin(this.angle) * this.speed;
        }

        this.x += this._vx * dt;
        this.y += this._vy * dt;
    }

    distanceTo(x, y) {
        const dx = this.x - x, dy = this.y - y;
        return Math.sqrt(dx*dx + dy*dy);
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        if (this.glowColor) {
            ctx.shadowColor = this.glowColor;
            ctx.shadowBlur = 12;
        }

        switch (this.type) {
            case 'fireball': {
                const img = Assets.get('effect_fireball');
                if (img) ctx.drawImage(img, -this.size, -this.size*0.6, this.size*2, this.size*1.2);
                else {
                    ctx.fillStyle = '#ff8800';
                    ctx.beginPath();
                    ctx.arc(0, 0, this.size * 0.6, 0, Math.PI*2);
                    ctx.fill();
                }
                break;
            }
            case 'arrow': {
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.ellipse(0, 0, this.size * 0.7, this.size * 0.3, 0, 0, Math.PI*2);
                ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(this.size * 0.3, 0, this.size * 0.2, 0, Math.PI*2);
                ctx.fill();
                break;
            }
            case 'bone': {
                ctx.fillStyle = '#e0e0cc';
                ctx.fillRect(-this.size*0.6, -this.size*0.2, this.size*1.2, this.size*0.4);
                ctx.beginPath();
                ctx.arc(-this.size*0.5, 0, this.size*0.25, 0, Math.PI*2);
                ctx.arc(this.size*0.5, 0, this.size*0.25, 0, Math.PI*2);
                ctx.fill();
                break;
            }
            case 'boss': {
                ctx.fillStyle = '#cc44ff';
                ctx.shadowColor = '#aa00ff';
                ctx.shadowBlur = 16;
                ctx.beginPath();
                ctx.arc(0, 0, this.size * 0.8, 0, Math.PI*2);
                ctx.fill();
                ctx.fillStyle = '#eeccff';
                ctx.beginPath();
                ctx.arc(0, 0, this.size * 0.4, 0, Math.PI*2);
                ctx.fill();
                break;
            }
            case 'minion': {
                ctx.fillStyle = '#ff6644';
                ctx.beginPath();
                ctx.arc(0, 0, this.size*0.5, 0, Math.PI*2);
                ctx.fill();
                break;
            }
            case 'poison': {
                ctx.fillStyle = '#aa44cc';
                ctx.beginPath();
                ctx.arc(0, 0, this.size*0.55, 0, Math.PI*2);
                ctx.fill();
                ctx.fillStyle = '#cc66ee';
                ctx.beginPath();
                ctx.arc(-this.size*0.2, -this.size*0.2, this.size*0.2, 0, Math.PI*2);
                ctx.fill();
                break;
            }
            default: {
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(0, 0, this.size * 0.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();
    }
}

// Particle for visual effects (explosions, trails, etc.)
class Particle {
    constructor(x, y, vx, vy, color, life, size) {
        this.x = x; this.y = y;
        this.vx = vx; this.vy = vy;
        this.color = color;
        this.maxLife = life;
        this.life = 0;
        this.size = size || 4;
        this.dead = false;
    }
    update(dt) {
        this.life += dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vy += 60 * dt; // gravity
        this.vx *= 0.98;
        if (this.life >= this.maxLife) this.dead = true;
    }
    render(ctx) {
        const t = 1 - this.life / this.maxLife;
        ctx.globalAlpha = t;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * t, 0, Math.PI*2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

function spawnExplosion(particles, x, y, count, colors, speed, size) {
    colors = colors || ['#ff8800','#ffcc00','#ff4400'];
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = (0.3 + Math.random() * 0.7) * (speed || 120);
        const col = colors[Math.floor(Math.random() * colors.length)];
        particles.push(new Particle(x, y, Math.cos(angle)*spd, Math.sin(angle)*spd - 40, col, 0.5 + Math.random()*0.4, size || 5));
    }
}
