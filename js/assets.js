'use strict';
const Assets = {
    images: {},
    loaded: 0,
    total: 0,
    _cb: null,

    NAMES: [
        'player_knight','player_mage','player_rogue',
        // New class player sprites
        'player_adventurer','player_fire_mage','player_ranger',
        'player_frost_knight','player_venom_rogue','player_stormcaller',
        'player_necromancer','player_gunslinger','player_paladin',
        'player_dragon_knight','player_void_assassin','player_chronomancer',
        // Portraits
        'portrait_adventurer','portrait_fire_mage','portrait_ranger',
        'portrait_frost_knight','portrait_venom_rogue','portrait_stormcaller',
        'portrait_necromancer','portrait_gunslinger','portrait_paladin',
        'portrait_dragon_knight','portrait_void_assassin','portrait_chronomancer',
        // Enemies
        'enemy_slime','enemy_bat','enemy_skeleton','enemy_spider',
        'enemy_bomber','enemy_healer','enemy_summoner','enemy_minion',
        'enemy_elite_overlay','boss_necromancer',
        // Tiles
        'tile_floor_crypt','tile_wall_crypt',
        'tile_floor_forest','tile_wall_forest',
        'tile_floor_lava','tile_wall_lava',
        'tile_door','tile_spike','tile_poison_puddle','tile_lava_crack',
        // Original ability icons
        'icon_fireball','icon_dash','icon_nova',
        'icon_coin','icon_crystal','icon_heart','icon_xp',
        // New ability icons
        'icon_quick_slash','icon_dash_strike',
        'icon_fireball_shot','icon_flame_dash',
        'icon_piercing_arrow','icon_roll_dash',
        'icon_ice_slam','icon_shield_dash','icon_frost_armor',
        'icon_toxic_daggers','icon_shadow_dash','icon_poison_cloud',
        'icon_chain_bolt','icon_blink_dash','icon_thunder_ring',
        'icon_bone_spear','icon_wraith_dash','icon_raise_skeleton','icon_soul_burst',
        'icon_revolver_shot','icon_combat_roll','icon_ricochet_bullet','icon_bullet_storm',
        'icon_holy_strike','icon_divine_dash','icon_heal_wave','icon_judgment_beam',
        'icon_flame_claw','icon_inferno_dash','icon_dragon_breath','icon_lava_eruption','icon_meteor_crash',
        'icon_void_slash','icon_rift_dash','icon_shadow_blades','icon_phase_shift','icon_void_collapse',
        'icon_time_bolt','icon_warp_dash','icon_rewind','icon_time_stop','icon_collapse',
        // Passive icons
        'passive_adventurer','passive_fire_mage','passive_ranger',
        'passive_frost_knight','passive_venom_rogue','passive_stormcaller',
        'passive_necromancer','passive_gunslinger','passive_paladin',
        'passive_dragon_knight','passive_void_assassin','passive_chronomancer',
        // Rarity frames
        'frame_common','frame_rare','frame_epic','frame_legendary','frame_mythic',
        // Effects
        'effect_fireball','effect_explosion','effect_freeze',
        'effect_poison','effect_burn','effect_shock','effect_dash_trail',
        // Objects
        'chest','chest_open','portal','coin_pickup','crystal_pickup','shopkeeper',
        // Upgrade icons
        'upgrade_damage','upgrade_speed','upgrade_fireball','upgrade_attackspeed',
        'upgrade_maxhp','upgrade_range','upgrade_nova','upgrade_dash',
        'upgrade_lifesteal','upgrade_multishot','upgrade_thorns','upgrade_critical',
        'xp_gem','particle_spark','heal_effect','ui_frame'
    ],

    // Fallback colors if images fail to load
    FALLBACKS: {
        player_knight:'#4488cc', player_mage:'#8844cc', player_rogue:'#44aa44',
        // New class fallbacks
        player_adventurer:'#5588dd', player_fire_mage:'#dd4400', player_ranger:'#44aa66',
        player_frost_knight:'#88bbff', player_venom_rogue:'#44cc44', player_stormcaller:'#ffee44',
        player_necromancer:'#8833aa', player_gunslinger:'#ccaa44', player_paladin:'#ffeeaa',
        player_dragon_knight:'#cc4400', player_void_assassin:'#6622aa', player_chronomancer:'#44aaff',
        portrait_adventurer:'#5588dd', portrait_fire_mage:'#dd4400', portrait_ranger:'#44aa66',
        portrait_frost_knight:'#88bbff', portrait_venom_rogue:'#44cc44', portrait_stormcaller:'#ffee44',
        portrait_necromancer:'#8833aa', portrait_gunslinger:'#ccaa44', portrait_paladin:'#ffeeaa',
        portrait_dragon_knight:'#cc4400', portrait_void_assassin:'#6622aa', portrait_chronomancer:'#44aaff',
        // Ability icon fallbacks
        icon_quick_slash:'#ffcc88', icon_dash_strike:'#ffaa44',
        icon_fireball_shot:'#ff8800', icon_flame_dash:'#ff6600',
        icon_piercing_arrow:'#88ffcc', icon_roll_dash:'#44ddaa',
        icon_ice_slam:'#88ccff', icon_shield_dash:'#aaddff', icon_frost_armor:'#cceeFF',
        icon_toxic_daggers:'#88ff44', icon_shadow_dash:'#8833aa', icon_poison_cloud:'#44cc00',
        icon_chain_bolt:'#ffff44', icon_blink_dash:'#ffffaa', icon_thunder_ring:'#ffee00',
        icon_bone_spear:'#ccddbb', icon_wraith_dash:'#9944cc', icon_raise_skeleton:'#ccddbb', icon_soul_burst:'#9933ff',
        icon_revolver_shot:'#ffdd66', icon_combat_roll:'#ddaa33', icon_ricochet_bullet:'#ffcc44', icon_bullet_storm:'#ffdd44',
        icon_holy_strike:'#ffeeaa', icon_divine_dash:'#ffffcc', icon_heal_wave:'#44ff88', icon_judgment_beam:'#ffee88',
        icon_flame_claw:'#ff6600', icon_inferno_dash:'#ff8800', icon_dragon_breath:'#cc4400', icon_lava_eruption:'#ff4400', icon_meteor_crash:'#ff2200',
        icon_void_slash:'#8822ff', icon_rift_dash:'#6622aa', icon_shadow_blades:'#5500aa', icon_phase_shift:'#4400cc', icon_void_collapse:'#330099',
        icon_time_bolt:'#4499ff', icon_warp_dash:'#88ccff', icon_rewind:'#44ccff', icon_time_stop:'#aaeeff', icon_collapse:'#2288ff',
        // Passives
        passive_adventurer:'#5588dd', passive_fire_mage:'#dd4400', passive_ranger:'#44aa66',
        passive_frost_knight:'#88bbff', passive_venom_rogue:'#44cc44', passive_stormcaller:'#ffee44',
        passive_necromancer:'#8833aa', passive_gunslinger:'#ccaa44', passive_paladin:'#ffeeaa',
        passive_dragon_knight:'#cc4400', passive_void_assassin:'#6622aa', passive_chronomancer:'#44aaff',
        // Rarity frames
        frame_common:'#888888', frame_rare:'#4488ff', frame_epic:'#aa44cc', frame_legendary:'#ffaa00', frame_mythic:'#cc2222',
        // Existing
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
