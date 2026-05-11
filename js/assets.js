'use strict';
const Assets = {
    images: {},
    loaded: 0,
    total: 0,
    _cb: null,

    NAMES: [
        'player_knight','player_mage','player_rogue',
        'enemy_slime','enemy_bat','enemy_skeleton','enemy_spider',
        'enemy_bomber','enemy_healer','enemy_summoner','enemy_minion',
        'enemy_elite_overlay','boss_necromancer',
        'tile_floor_crypt','tile_wall_crypt',
        'tile_floor_forest','tile_wall_forest',
        'tile_floor_lava','tile_wall_lava',
        'tile_door','tile_spike','tile_poison_puddle','tile_lava_crack',
        'icon_fireball','icon_dash','icon_nova',
        'icon_coin','icon_crystal','icon_heart','icon_xp',
        'effect_fireball','effect_explosion','effect_freeze',
        'effect_poison','effect_burn','effect_shock','effect_dash_trail',
        'chest','chest_open','portal','coin_pickup','crystal_pickup','shopkeeper',
        'upgrade_damage','upgrade_speed','upgrade_fireball','upgrade_attackspeed',
        'upgrade_maxhp','upgrade_range','upgrade_nova','upgrade_dash',
        'upgrade_lifesteal','upgrade_multishot','upgrade_thorns','upgrade_critical',
        'xp_gem','particle_spark','heal_effect','ui_frame'
    ],

    // Fallback colors if images fail to load
    FALLBACKS: {
        player_knight:'#4488cc', player_mage:'#8844cc', player_rogue:'#44aa44',
        enemy_slime:'#44cc44', enemy_bat:'#8844aa', enemy_skeleton:'#ddddcc',
        enemy_spider:'#886644', enemy_bomber:'#cc2222', enemy_healer:'#44cc88',
        enemy_summoner:'#441166', enemy_minion:'#332244',
        boss_necromancer:'#220033',
        tile_floor_crypt:'#2a2232', tile_wall_crypt:'#181020',
        tile_floor_forest:'#385028', tile_wall_forest:'#3c2814',
        tile_floor_lava:'#321910', tile_wall_lava:'#1e0c08',
        tile_door:'#7a4c1e', tile_spike:'#888888',
        icon_fireball:'#ff8800', icon_dash:'#4488ff',
        icon_nova:'#88ccff', icon_coin:'#ffcc00',
        icon_crystal:'#9933cc', icon_heart:'#dd2244', icon_xp:'#44cc44',
        chest:'#885522', portal:'#8833cc', xp_gem:'#44bb55',
        shopkeeper:'#aa8844'
    },

    load(callback) {
        this._cb = callback;
        this.total = this.NAMES.length;
        this.loaded = 0;
        if (this.total === 0) { callback(); return; }

        for (const name of this.NAMES) {
            const img = new Image();
            img.onload = () => { this.images[name] = img; this._done(); };
            img.onerror = () => {
                // Generate a tiny canvas as fallback
                const fc = document.createElement('canvas');
                fc.width = 32; fc.height = 32;
                const fctx = fc.getContext('2d');
                fctx.fillStyle = this.FALLBACKS[name] || '#888888';
                fctx.fillRect(0, 0, 32, 32);
                fctx.strokeStyle = 'rgba(255,255,255,0.3)';
                fctx.strokeRect(1, 1, 30, 30);
                const fi = new Image();
                fi.src = fc.toDataURL();
                this.images[name] = fi;
                this._done();
            };
            img.src = `public/generated-assets/${name}.png`;
        }
    },

    _done() {
        this.loaded++;
        if (this.loaded >= this.total && this._cb) {
            this._cb();
            this._cb = null;
        }
    },

    get(name) {
        return this.images[name] || null;
    },

    draw(ctx, name, x, y, w, h, alpha) {
        const img = this.get(name);
        if (!img) {
            ctx.fillStyle = this.FALLBACKS[name] || '#888';
            ctx.fillRect(x, y, w, h);
            return;
        }
        const prev = ctx.globalAlpha;
        if (alpha !== undefined) ctx.globalAlpha = alpha;
        ctx.drawImage(img, x, y, w, h);
        ctx.globalAlpha = prev;
    },

    progress() {
        return this.total ? this.loaded / this.total : 1;
    }
};
