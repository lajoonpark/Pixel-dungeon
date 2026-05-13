'use strict';

const UI = {
    // Floating damage numbers
    renderDamageNumbers(ctx, nums) {
        for (const dn of nums) {
            ctx.globalAlpha = Math.max(0, 1 - dn.life / dn.maxLife);
            ctx.font = dn.big ? 'bold 22px monospace' : 'bold 16px monospace';
            ctx.fillStyle = dn.color;
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.strokeText(dn.text, dn.x - 10, dn.y);
            ctx.fillText(dn.text, dn.x - 10, dn.y);
        }
        ctx.globalAlpha = 1;
    },

    // In-game HUD
    renderHUD(ctx, game) {
        const p = game.player;

        // HP bar
        const hpW = 200, hpH = 18;
        const hpX = 10, hpY = 10;
        ctx.fillStyle = '#220000';
        ctx.fillRect(hpX, hpY, hpW, hpH);
        const hpFrac = p.hp / p.maxHp;
        ctx.fillStyle = hpFrac > 0.5 ? '#44cc44' : hpFrac > 0.25 ? '#ccaa22' : '#cc2222';
        ctx.fillRect(hpX, hpY, hpW * hpFrac, hpH);
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;
        ctx.strokeRect(hpX, hpY, hpW, hpH);
        Assets.draw(ctx, 'icon_heart', hpX - 2, hpY - 2, 20, 20);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(`${Math.ceil(p.hp)}/${p.maxHp}`, hpX + 24, hpY + 13);

        // XP bar
        const xpW = 200, xpH = 8;
        const xpX = 10, xpY = 32;
        ctx.fillStyle = '#002200';
        ctx.fillRect(xpX, xpY, xpW, xpH);
        ctx.fillStyle = '#44ff88';
        ctx.fillRect(xpX, xpY, xpW * (p.xp / p.xpToNext), xpH);
        ctx.strokeStyle = '#333';
        ctx.strokeRect(xpX, xpY, xpW, xpH);
        ctx.fillStyle = '#aaffcc';
        ctx.font = '10px monospace';
        ctx.fillText(`Lv.${p.level}`, xpX + 205, xpY + 8);

        // Coins & crystals
        Assets.draw(ctx, 'icon_coin', 10, 46, 16, 16);
        ctx.fillStyle = '#ffcc44';
        ctx.font = 'bold 13px monospace';
        ctx.fillText(`${game.coins}`, 30, 59);

        Assets.draw(ctx, 'icon_crystal', 60, 46, 16, 16);
        ctx.fillStyle = '#cc88ff';
        ctx.fillText(`${game.saveData.crystals}`, 80, 59);

        // Room indicator
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(330, 8, 140, 20);
        ctx.fillStyle = '#cccccc';
        ctx.font = '11px monospace';
        ctx.fillText(`Room ${game.roomIndex + 1} / ${game.rooms.length}`, 338, 23);

        // Room dots
        const dotY = 34;
        const MIN_DOT_SPACING = 4;
        const MAX_DOT_SPACING = 14;
        const AVAILABLE_DOT_WIDTH = 132;
        const dotSpacing = Math.max(MIN_DOT_SPACING, Math.min(MAX_DOT_SPACING, AVAILABLE_DOT_WIDTH / Math.max(1, game.rooms.length)));
        const startX = 332 + (136 - game.rooms.length * dotSpacing) / 2;
        for (let i = 0; i < game.rooms.length; i++) {
            const dx = startX + i * dotSpacing;
            ctx.beginPath();
            ctx.arc(dx + 6, dotY, 4, 0, Math.PI * 2);
            if (i < game.roomIndex) {
                ctx.fillStyle = '#888888';
            } else if (i === game.roomIndex) {
                ctx.fillStyle = '#ffffff';
            } else {
                ctx.fillStyle = '#333333';
            }
            ctx.fill();
            // Boss marker
            if (i === game.rooms.length - 1) {
                ctx.strokeStyle = '#ff4444';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
        }

        // Abilities
        this._renderAbilities(ctx, p, game);

        // Boss HP bar (if boss room)
        const boss = game.enemies.find(e => e.isBoss && !e.dead);
        if (boss) this._renderBossBar(ctx, boss, game);
    },

    _renderAbilities(ctx, p, game) {
        const abs = p.abilities || [];
        const count = abs.length;
        if (count === 0) return;
        const size = 34, gap = 6;
        const totalW = count * (size + gap) - gap;
        const startX = 800 - totalW - 8;
        const y = 555;

        abs.forEach((ab, i) => {
            if (!ab) return;
            const cx = startX + i * (size + gap) + size / 2;
            const cy = y + size / 2;

            ctx.fillStyle = '#222233';
            ctx.strokeStyle = '#444466';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(cx - size/2, cy - size/2, size, size, 5);
            ctx.fill(); ctx.stroke();

            Assets.draw(ctx, ab.iconKey, cx - size/2 + 3, cy - size/2 + 3, size-6, size-6);

            if (ab.cooldown > 0 && ab.maxCooldown > 0) {
                const frac = ab.cooldown / ab.maxCooldown;
                ctx.fillStyle = 'rgba(0,0,0,0.65)';
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.arc(cx, cy, size/2 - 2, -Math.PI/2, -Math.PI/2 + frac * Math.PI * 2, false);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 10px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(ab.cooldown.toFixed(1), cx, cy + 4);
                ctx.textAlign = 'left';
            }

            ctx.fillStyle = '#aaaacc';
            ctx.font = 'bold 9px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(ab.label || ab.key || String(i), cx, cy + size/2 + 10);
            ctx.textAlign = 'left';
        });
    },

    _renderBossBar(ctx, boss, game) {
        const bw = 600, bh = 22;
        const bx = (800 - bw) / 2, by = 560;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(bx - 4, by - 22, bw + 8, bh + 26);
        ctx.fillStyle = '#330011';
        ctx.fillRect(bx, by, bw, bh);
        const frac = boss.hp / boss.maxHp;
        // Gradient
        const isCorrupted = game && game.currentDungeonId === 'dungeon2';
        const grad = ctx.createLinearGradient(bx, 0, bx + bw * frac, 0);
        if (isCorrupted) {
            grad.addColorStop(0, '#6f2cff');
            grad.addColorStop(0.5, '#be44ff');
            grad.addColorStop(1, '#ff66c4');
        } else {
            grad.addColorStop(0, '#aa0044');
            grad.addColorStop(0.5, '#dd2266');
            grad.addColorStop(1, '#ff4488');
        }
        ctx.fillStyle = grad;
        ctx.fillRect(bx, by, bw * frac, bh);
        ctx.strokeStyle = '#880033';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, by, bw, bh);

        // Phase 2 marker
        ctx.strokeStyle = '#ffcc00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bx + bw * 0.5, by);
        ctx.lineTo(bx + bw * 0.5, by + bh);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'center';
        const bossName = (boss && typeof boss.getDisplayName === 'function') ? boss.getDisplayName() : 'Boss';
        const phaseText = boss.phase ? ` (Phase ${boss.phase})` : '';
        ctx.fillText(`☠ ${bossName}${phaseText} — ${Math.ceil(boss.hp)} / ${boss.maxHp}`, 400, by + 15);
        ctx.textAlign = 'left';

        ctx.fillStyle = isCorrupted ? '#c878ff' : '#cc88ff';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('BOSS', 400, by - 6);
        ctx.textAlign = 'left';
    },

    // Main menu
    renderMenu(ctx, saveData, hoverBtn) {
        // Background
        ctx.fillStyle = '#0a0810';
        ctx.fillRect(0, 0, 800, 600);

        // Atmospheric particles (stars)
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 60; i++) {
            const px = (Math.sin(i * 2.3 + Date.now()*0.0002) * 0.5 + 0.5) * 800;
            const py = (Math.cos(i * 1.7 + Date.now()*0.0001) * 0.5 + 0.5) * 600;
            const alpha = 0.2 + Math.sin(i + Date.now()*0.003) * 0.15;
            ctx.globalAlpha = Math.max(0, alpha);
            ctx.fillRect(px, py, 1.5, 1.5);
        }
        ctx.globalAlpha = 1;

        // Title
        ctx.save();
        ctx.shadowColor = '#aa44ff';
        ctx.shadowBlur = 30;
        ctx.fillStyle = '#ddaaff';
        ctx.font = 'bold 56px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('PIXEL DUNGEON', 400, 140);
        ctx.fillStyle = '#9966cc';
        ctx.font = 'bold 22px monospace';
        ctx.fillText('CRAWLER', 400, 175);
        ctx.restore();

        // Subtitle
        ctx.fillStyle = '#887799';
        ctx.font = '14px monospace';
        ctx.textAlign = 'center';
        const dungeonCount = (typeof DUNGEON_DEFS !== 'undefined') ? Object.keys(DUNGEON_DEFS).length : 2;
        ctx.fillText(`Auto-attack roguelite • 12 Classes • ${dungeonCount} Dungeons`, 400, 208);

        // Buttons
        const btns = [
            { id:'play',           label:'▶  START RUN',          y:225, color:'#2244aa', hover:'#3355cc' },
            { id:'class_select',   label:'⚔  CLASS SELECT',       y:270, color:'#1f3f77', hover:'#2f53a0' },
            { id:'cards',          label:'🃏  CARDS',              y:315, color:'#2b3f2a', hover:'#3a5a3d' },
            { id:'card_shop',      label:'🛒  SHOP',               y:360, color:'#5a3a16', hover:'#7a4d1d' },
            { id:'permanent_shop', label:'🔮  PERMANENT UPGRADES', y:405, color:'#442200', hover:'#664400' },
            { id:'settings',       label:'⚙  SETTINGS',           y:450, color:'#332244', hover:'#554477' },
        ];

        for (const b of btns) {
            const bx = 260, bw = 280, bh = 44;
            const isHover = hoverBtn === b.id;
            ctx.fillStyle = isHover ? b.hover : b.color;
            ctx.strokeStyle = isHover ? '#8899ff' : '#445566';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(bx, b.y, bw, bh, 8);
            ctx.fill(); ctx.stroke();

            ctx.fillStyle = isHover ? '#ffffff' : '#ccccdd';
            ctx.font = 'bold 18px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(b.label, 400, b.y + 28);
        }
        ctx.textAlign = 'left';

        // Best run stats
        if (saveData && (saveData.bestRun.floor > 0 || saveData.crystals > 0)) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(50, 450, 300, 80);
            ctx.strokeStyle = '#443355';
            ctx.strokeRect(50, 450, 300, 80);
            ctx.fillStyle = '#aaaacc';
            ctx.font = 'bold 12px monospace';
            ctx.fillText('BEST RUN', 60, 470);
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px monospace';
            ctx.fillText(`Floor: ${saveData.bestRun.floor}  Kills: ${saveData.bestRun.kills}`, 60, 490);
            ctx.fillText(`Crystals: ${saveData.crystals} total`, 60, 510);
            ctx.fillText(`Runs: ${saveData.totalRuns || 0}`, 60, 526);
        }

        // Controls hint
        ctx.fillStyle = '#555566';
        ctx.font = '11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('WASD/Arrows: Move  •  J: Fireball  •  K: Dash  •  L: Ice Nova  •  Esc: Pause', 400, 580);
        ctx.textAlign = 'left';
    },

    renderDungeonSelect(ctx, saveData, hoverDungeon, dungeonDefs) {
        ctx.fillStyle = '#0a0810';
        ctx.fillRect(0, 0, 800, 600);
        ctx.fillStyle = '#ddaaff';
        ctx.font = 'bold 34px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('SELECT DUNGEON', 400, 70);

        const unlocked = (saveData && saveData.unlockedDungeons) || ['dungeon1'];
        const selected = (saveData && saveData.selectedDungeon) || 'dungeon1';
        const ids = ['dungeon1', 'dungeon2'];

        ids.forEach((id, i) => {
            const d = dungeonDefs[id];
            const x = 130 + i * 280;
            const y = 170;
            const w = 240;
            const h = 300;
            const isUnlocked = unlocked.includes(id);
            const isHover = hoverDungeon === id;
            const isSelected = selected === id;

            ctx.fillStyle = isHover ? '#231634' : '#170f25';
            ctx.strokeStyle = isSelected ? '#ffdd66' : (isUnlocked ? '#6f5d88' : '#4b3e5e');
            ctx.lineWidth = isSelected ? 3 : 2;
            ctx.beginPath();
            ctx.roundRect(x, y, w, h, 12);
            ctx.fill();
            ctx.stroke();

            const icon = id === 'dungeon2' ? 'icon_dungeon_corrupted' : 'icon_dungeon_crypt';
            Assets.draw(ctx, icon, x + w / 2 - 28, y + 15, 56, 56);

            ctx.fillStyle = isUnlocked ? '#ffffff' : '#8f7caa';
            ctx.font = 'bold 16px monospace';
            ctx.fillText(d.name, x + w / 2, y + 90);

            ctx.fillStyle = '#b9abd0';
            ctx.font = '12px monospace';
            ctx.fillText(`Difficulty: ${d.difficulty}`, x + w / 2, y + 118);
            ctx.fillText(`Rooms: ${d.totalRooms}`, x + w / 2, y + 138);
            ctx.fillText(`Bosses: ${d.miniBossRoom ? 'Mini + Final' : 'Final'}`, x + w / 2, y + 158);
            ctx.fillText(`Rewards: ${d.rewardLabel}`, x + w / 2, y + 178);
            ctx.fillText(`Status: ${isUnlocked ? 'Unlocked' : 'Locked'}`, x + w / 2, y + 198);

            if (id === 'dungeon2' && !isUnlocked) {
                ctx.fillStyle = '#cc88aa';
                ctx.font = '11px monospace';
                ctx.fillText('Unlock: Clear Dungeon 1 once', x + w / 2, y + 226);
            } else {
                ctx.fillStyle = '#88e3b5';
                ctx.font = '11px monospace';
                ctx.fillText(isSelected ? 'Selected' : 'Click to select', x + w / 2, y + 226);
            }

            ctx.fillStyle = '#8f81a8';
            ctx.font = '10px monospace';
            const roomText = id === 'dungeon2'
                ? 'Room Types: Combat, Ritual, Crystal, Maze, Elite, Vault, Flood, Shrine'
                : 'Themes: Crypt, Forest, Lava';
            ctx.fillText(roomText.slice(0, 42), x + w / 2, y + 252);
            if (roomText.length > 42) ctx.fillText(roomText.slice(42), x + w / 2, y + 266);
        });

        this._menuButton(ctx, '← BACK', 90, 525, '#223344');
        ctx.textAlign = 'left';
    },

    renderClassSelect(ctx, saveData, hoverClass, dungeonDef) {
        ctx.fillStyle = '#0a0810';
        ctx.fillRect(0, 0, 800, 600);
        ctx.fillStyle = '#ddaaff';
        ctx.font = 'bold 30px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('SELECT CLASS', 400, 55);
        if (dungeonDef) {
            ctx.fillStyle = '#9987b7';
            ctx.font = '12px monospace';
            ctx.fillText(`Dungeon: ${dungeonDef.name} • ${dungeonDef.difficulty} • ${dungeonDef.totalRooms} rooms`, 400, 72);
        }

        const unlocked = (saveData && saveData.unlockedClasses) || ['human_adventurer'];
        const selected = (saveData && saveData.selectedClass) || 'human_adventurer';
        const cardW = 160, cardH = 200, gapX = 20;
        const perRow = Math.min(unlocked.length, 4);
        const totalW = perRow * cardW + (perRow-1)*gapX;
        const startX = (800 - totalW) / 2;

        unlocked.forEach((id, i) => {
            const classDef = (typeof ClassSystem !== 'undefined') ? ClassSystem.get(id) : null;
            const col = i % perRow, row = Math.floor(i / perRow);
            const cx = startX + col*(cardW+gapX), cy = 100 + row*220;
            const isHover = hoverClass === id;
            const isSelected = selected === id;
            const rarity = classDef ? classDef.rarity : 'common';
            const rarityColor = (typeof RARITY_COLORS !== 'undefined') ? RARITY_COLORS[rarity] : '#888';

            ctx.fillStyle = isHover ? '#2a1a3a' : '#130f1e';
            ctx.strokeStyle = isSelected ? '#ffdd44' : (isHover ? rarityColor : '#443355');
            ctx.lineWidth = isSelected ? 3 : (isHover ? 2 : 1.5);
            ctx.beginPath();
            ctx.roundRect(cx, cy, cardW, cardH, 10);
            ctx.fill(); ctx.stroke();

            // Rarity tag
            ctx.fillStyle = rarityColor;
            ctx.font = 'bold 9px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(rarity.toUpperCase(), cx + cardW/2, cy + 13);

            // Sprite
            const spriteKey = classDef ? classDef.spriteKey : 'player_adventurer';
            Assets.draw(ctx, spriteKey, cx + cardW/2 - 24, cy + 18, 48, 48);

            // Name
            ctx.fillStyle = isHover ? '#ffffff' : '#ddaaff';
            ctx.font = 'bold 11px monospace';
            const name = classDef ? classDef.name : id;
            // Word-wrap name
            let nWords = name.split(' '), nLine = '', nLy = cy + 82;
            for (const w of nWords) {
                if ((nLine + w).length > 14) { ctx.fillText(nLine.trim(), cx + cardW/2, nLy); nLine = w + ' '; nLy += 13; }
                else nLine += w + ' ';
            }
            ctx.fillText(nLine.trim(), cx + cardW/2, nLy);

            // Stats
            if (classDef) {
                ctx.fillStyle = '#aaaacc'; ctx.font = '9px monospace';
                ctx.fillText(`HP:${classDef.maxHp} ATK:${classDef.baseAtk}`, cx + cardW/2, cy + 112);
                ctx.fillText(`SPD:${classDef.moveSpeed}`, cx + cardW/2, cy + 124);
            }

            // Passive
            if (classDef && classDef.passiveDesc) {
                ctx.fillStyle = '#88ffaa'; ctx.font = '8px monospace';
                const pd = classDef.passiveDesc;
                const maxChars = 22;
                if (pd.length > maxChars) {
                    ctx.fillText(pd.slice(0, maxChars), cx+cardW/2, cy+140);
                    ctx.fillText(pd.slice(maxChars), cx+cardW/2, cy+151);
                } else {
                    ctx.fillText(pd, cx+cardW/2, cy+140);
                }
            }

            // Abilities count
            if (classDef) {
                ctx.fillStyle = '#8888ff'; ctx.font = '9px monospace';
                ctx.fillText(`${classDef.abilityIds.length} abilities`, cx+cardW/2, cy+163);
            }

            // Selected badge / click hint
            if (isSelected) {
                ctx.fillStyle = '#ffdd44';
                ctx.font = 'bold 9px monospace';
                ctx.fillText('EQUIPPED', cx + cardW/2, cy + cardH - 8);
            } else if (isHover) {
                ctx.fillStyle = '#ccccff';
                ctx.font = 'bold 9px monospace';
                ctx.fillText('[CLICK TO PLAY]', cx + cardW/2, cy + cardH - 8);
            }
        });

        ctx.textAlign = 'left';

        // Buttons row at bottom
        const rollCost = (saveData && saveData.rollCost) || 10;
        const canAfford = saveData && saveData.crystals >= rollCost;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 525, 800, 75);

        // Back
        ctx.fillStyle = '#332244'; ctx.strokeStyle = '#665577'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(20, 535, 140, 30, 6); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ccbbdd'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center';
        ctx.fillText('← BACK', 90, 555);

        // Collection
        ctx.fillStyle = '#1a1a44'; ctx.strokeStyle = '#4444aa'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(600, 492, 180, 33, 6); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#aabbff'; ctx.font = 'bold 12px monospace';
        ctx.fillText('📖 COLLECTION', 690, 513);

        // Roll
        ctx.fillStyle = canAfford ? '#2a1a00' : '#1a1a1a';
        ctx.strokeStyle = canAfford ? '#aa6600' : '#443344'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(600, 531, 180, 33, 6); ctx.fill(); ctx.stroke();
        ctx.fillStyle = canAfford ? '#ffcc44' : '#887799'; ctx.font = 'bold 12px monospace';
        ctx.fillText(`🎲 ROLL (${rollCost}💎)`, 690, 552);

        // Crystal count
        ctx.fillStyle = '#cc88ff'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'left';
        ctx.fillText(`💎 ${(saveData && saveData.crystals) || 0}`, 180, 553);
        ctx.textAlign = 'left';
    },

    renderClassCollection(ctx, saveData) {
        ctx.fillStyle = '#0a0810';
        ctx.fillRect(0, 0, 800, 600);

        ctx.fillStyle = '#ddaaff';
        ctx.font = 'bold 28px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('CLASS COLLECTION', 400, 45);

        const allClasses = (typeof ClassSystem !== 'undefined') ? ClassSystem.all() : [];
        const unlocked = (saveData && saveData.unlockedClasses) || ['human_adventurer'];
        const shards = (saveData && saveData.classShards) || {};

        const cardW = 105, cardH = 140, gapX = 8, gapY = 10;
        const perRow = 6;
        const totalW = perRow * cardW + (perRow-1)*gapX;
        const startX = (800 - totalW) / 2;

        allClasses.forEach((cls, i) => {
            const isUnlocked = unlocked.includes(cls.id);
            const col = i % perRow, row = Math.floor(i / perRow);
            const cx = startX + col*(cardW+gapX), cy = 65 + row*(cardH+gapY);
            const rarityColor = (typeof RARITY_COLORS !== 'undefined') ? RARITY_COLORS[cls.rarity] : '#888';

            ctx.globalAlpha = isUnlocked ? 1 : 0.4;
            ctx.fillStyle = '#131025';
            ctx.strokeStyle = isUnlocked ? rarityColor : '#332233';
            ctx.lineWidth = isUnlocked ? 2 : 1;
            ctx.beginPath(); ctx.roundRect(cx, cy, cardW, cardH, 8); ctx.fill(); ctx.stroke();

            // Portrait / sprite
            if (isUnlocked) {
                Assets.draw(ctx, cls.spriteKey, cx + cardW/2 - 20, cy + 8, 40, 40);
            } else {
                ctx.fillStyle = '#332244';
                ctx.fillRect(cx + cardW/2 - 16, cy + 10, 32, 32);
                ctx.fillStyle = '#443355'; ctx.font = 'bold 22px monospace'; ctx.textAlign = 'center';
                ctx.fillText('?', cx + cardW/2, cy + 32);
            }

            // Rarity
            ctx.fillStyle = rarityColor; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
            ctx.fillText(cls.rarity.toUpperCase(), cx + cardW/2, cy + 55);

            // Name
            ctx.fillStyle = isUnlocked ? '#ddccff' : '#554466'; ctx.font = 'bold 9px monospace';
            const words = cls.name.split(' ');
            let line = '', ly = cy + 68;
            for (const w of words) {
                if ((line + w).length > 12) { ctx.fillText(line.trim(), cx+cardW/2, ly); line = w+' '; ly+=11; }
                else line += w + ' ';
            }
            ctx.fillText(line.trim(), cx+cardW/2, ly);

            if (isUnlocked) {
                // Abilities count
                ctx.fillStyle = '#8888ff'; ctx.font = '8px monospace';
                ctx.fillText(`${cls.abilityIds.length} abilities`, cx+cardW/2, cy + 92);
                // Passive snippet
                ctx.fillStyle = '#88ffaa'; ctx.font = '7px monospace';
                const pd = cls.passiveDesc || '';
                ctx.fillText(pd.slice(0, 18), cx+cardW/2, cy+104);
                if (pd.length > 18) ctx.fillText(pd.slice(18, 36), cx+cardW/2, cy+113);
                // Shards
                if (shards[cls.id]) {
                    ctx.fillStyle = '#cc88ff'; ctx.font = '7px monospace';
                    ctx.fillText(`${shards[cls.id]} shards`, cx+cardW/2, cy+cardH-6);
                }
            } else {
                ctx.fillStyle = '#553366'; ctx.font = '8px monospace';
                ctx.fillText('LOCKED', cx+cardW/2, cy+90);
                ctx.fillText('Roll to unlock', cx+cardW/2, cy+101);
            }

            ctx.globalAlpha = 1;
        });

        ctx.textAlign = 'center';
        ctx.fillStyle = '#887799'; ctx.font = '11px monospace';
        ctx.fillText(`${unlocked.length} / ${allClasses.length} classes unlocked`, 400, 560);
        this._menuButton(ctx, '← BACK', 400, 570, '#223344');
        ctx.textAlign = 'left';
    },

    renderClassRoll(ctx, saveData, animActive, animPhase, animResult, animTimer, fortuneRank) {
        ctx.fillStyle = '#0a0810';
        ctx.fillRect(0, 0, 800, 600);

        ctx.fillStyle = '#ddaaff';
        ctx.font = 'bold 32px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('CLASS ROLL', 400, 60);

        const cost = (saveData && saveData.rollCost) || 10;
        const crystals = (saveData && saveData.crystals) || 0;
        const rollCount = (saveData && saveData.rollCount) || 0;
        const canAfford = crystals >= cost;

        // Stats
        ctx.fillStyle = '#887799'; ctx.font = '14px monospace';
        ctx.fillText(`Total rolls: ${rollCount}`, 400, 95);
        ctx.fillStyle = '#cc88ff';
        ctx.fillText(`💎 ${crystals} crystals`, 400, 118);

        // Rarity odds display
        const weights = (typeof ClassSystem !== 'undefined' && typeof ClassSystem.getRarityWeights === 'function')
            ? ClassSystem.getRarityWeights(fortuneRank || 0)
            : { common: 60, rare: 25, epic: 10, legendary: 4, mythic: 1 };
        const rarities = [
            { r:'common',    pct:`${weights.common.toFixed(1)}%`, color:'#888888' },
            { r:'rare',      pct:`${weights.rare.toFixed(1)}%`, color:'#4488ff' },
            { r:'epic',      pct:`${weights.epic.toFixed(1)}%`, color:'#aa44cc' },
            { r:'legendary', pct:`${weights.legendary.toFixed(1)}%`, color:'#ffaa00' },
            { r:'mythic',    pct:`${weights.mythic.toFixed(1)}%`, color:'#cc2222' },
        ];
        ctx.font = '12px monospace';
        rarities.forEach((r, i) => {
            const x = 100 + i * 130;
            ctx.fillStyle = r.color;
            ctx.fillText(r.r.toUpperCase(), x, 150);
            ctx.fillStyle = '#cccccc';
            ctx.fillText(r.pct, x, 165);
        });
        ctx.fillStyle = '#9f8abf';
        ctx.fillText(`Fortune rank: ${fortuneRank || 0}`, 400, 176);

        // Cost ladder display
        ctx.fillStyle = '#887799'; ctx.font = '11px monospace';
        ctx.fillText('Cost: 20 → 30 → ... → 100 (capped)', 400, 188);

        // Animation / result area
        const boxX = 250, boxY = 200, boxW = 300, boxH = 200;
        ctx.fillStyle = '#1a1530';
        ctx.strokeStyle = '#443355'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(boxX, boxY, boxW, boxH, 14); ctx.fill(); ctx.stroke();

        if (!animActive || animPhase === 'idle') {
            ctx.fillStyle = '#554466'; ctx.font = 'bold 18px monospace';
            ctx.fillText('Press ROLL to start!', 400, 310);
        } else if (animPhase === 'spinning') {
            // Spinning rarity flash
            const t = animTimer;
            const flashColors = ['#888888','#4488ff','#aa44cc','#ffaa00','#cc2222'];
            const fc = flashColors[Math.floor(t*12) % flashColors.length];
            ctx.fillStyle = fc;
            ctx.font = 'bold 24px monospace';
            ctx.fillText('Rolling...', 400, 295);
            ctx.font = '60px monospace';
            ctx.fillText(['⚡','✨','🎲','💫','⭐'][Math.floor(t*8) % 5], 400, 345);
        } else if (animPhase === 'reveal' && animResult) {
            const rc = (typeof RARITY_COLORS !== 'undefined') ? RARITY_COLORS[animResult.rarity] : '#888';
            ctx.fillStyle = rc;
            ctx.font = 'bold 20px monospace';
            ctx.fillText(animResult.rarity.toUpperCase(), 400, 230);

            Assets.draw(ctx, animResult.spriteKey || 'player_adventurer', 364, 240, 72, 72);

            ctx.fillStyle = '#ffffff'; ctx.font = 'bold 18px monospace';
            ctx.fillText(animResult.name, 400, 330);

            if (animResult.isDuplicate) {
                ctx.fillStyle = '#cc88ff'; ctx.font = '13px monospace';
                ctx.fillText('DUPLICATE — Converted to shards!', 400, 355);
                const bonusCrystals = { common:2, rare:4, epic:8, legendary:12, mythic:20 }[animResult.rarity] || 2;
                ctx.fillStyle = '#ffcc44';
                ctx.fillText(`+${bonusCrystals} 💎 crystals returned`, 400, 372);
            } else {
                ctx.fillStyle = '#44ff88'; ctx.font = 'bold 13px monospace';
                ctx.fillText('NEW CLASS UNLOCKED!', 400, 357);
            }
        }

        // Roll button
        ctx.fillStyle = canAfford ? (animPhase === 'idle' || !animActive ? '#2a1a00' : '#1a1a1a') : '#1a1a1a';
        ctx.strokeStyle = canAfford ? '#aa6600' : '#443344'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(300, 430, 200, 44, 10); ctx.fill(); ctx.stroke();
        ctx.fillStyle = canAfford ? '#ffcc44' : '#665566'; ctx.font = 'bold 18px monospace';
        ctx.fillText(`🎲 ROLL (${cost} 💎)`, 400, 458);

        if (!canAfford) {
            ctx.fillStyle = '#cc4444'; ctx.font = '11px monospace';
            ctx.fillText('Not enough crystals!', 400, 488);
        }

        ctx.fillStyle = '#554466'; ctx.font = '12px monospace';
        ctx.fillText('Next cost: ' + Math.min(cost + 10, 100) + ' 💎', 400, 510);

        this._menuButton(ctx, '← BACK', 400, 560, '#223344');
        ctx.textAlign = 'left';
    },

    renderLevelUp(ctx, choices) {
        // Dim overlay
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(0, 0, 800, 600);

        ctx.fillStyle = '#ffee88';
        ctx.font = 'bold 32px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('✨ LEVEL UP! ✨', 400, 100);
        ctx.fillStyle = '#ccccaa';
        ctx.font = '16px monospace';
        ctx.fillText('Choose an upgrade:', 400, 135);

        const cardW = 180, cardH = 230;
        const totalW = choices.length * cardW + (choices.length - 1) * 20;
        const startX = (800 - totalW) / 2;

        choices.forEach((upg, i) => {
            const x = startX + i * (cardW + 20);
            const y = 160;
            const isHover = UI._hoveredCard === i;

            const rarityColors = { common:'#4488cc', rare:'#cc8844', epic:'#aa44cc' };
            const c = rarityColors[upg.rarity] || '#888';

            ctx.fillStyle = isHover ? '#2a2244' : '#1a1530';
            ctx.strokeStyle = isHover ? c : '#443355';
            ctx.lineWidth = isHover ? 3 : 1.5;
            ctx.beginPath();
            ctx.roundRect(x, y, cardW, cardH, 10);
            ctx.fill(); ctx.stroke();

            // Rarity label
            ctx.fillStyle = c;
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(upg.rarity.toUpperCase(), x + cardW/2, y + 16);

            // Icon
            Assets.draw(ctx, upg.icon, x + cardW/2 - 20, y + 22, 40, 40);

            // Name
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 13px monospace';
            const words = upg.name.split(' ');
            let line = '', ly = y + 78;
            for (const w of words) {
                if ((line + w).length > 14) {
                    ctx.fillText(line.trim(), x + cardW/2, ly); line = w + ' '; ly += 16;
                } else line += w + ' ';
            }
            ctx.fillText(line.trim(), x + cardW/2, ly);

            // Description
            ctx.fillStyle = '#aaaacc';
            ctx.font = '11px monospace';
            const dwords = upg.desc.split(' ');
            line = ''; ly += 20;
            for (const w of dwords) {
                if ((line + w).length > 20) {
                    ctx.fillText(line.trim(), x + cardW/2, ly); line = w + ' '; ly += 14;
                } else line += w + ' ';
            }
            ctx.fillText(line.trim(), x + cardW/2, ly);

            // Key hint
            ctx.fillStyle = isHover ? '#ffffff' : '#666677';
            ctx.font = 'bold 14px monospace';
            ctx.fillText(`[${i+1}]`, x + cardW/2, y + cardH - 12);
        });
        ctx.textAlign = 'left';
    },

    renderGameOver(ctx, game) {
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(0, 0, 800, 600);

        ctx.fillStyle = '#cc2222';
        ctx.font = 'bold 60px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('YOU DIED', 400, 180);

        ctx.fillStyle = '#888899';
        ctx.font = '18px monospace';
        ctx.fillText(`Reached Floor ${game.roomIndex + 1}`, 400, 240);
        ctx.fillText(`Enemies Slain: ${game.killCount}`, 400, 268);
        ctx.fillText(`Coins Collected: ${game.coins}`, 400, 296);
        ctx.fillText(`Crystals Earned: ${game.runCrystalsEarned || 0}`, 400, 324);
        ctx.fillText(`Total Crystals: ${game.crystals || 0}`, 400, 352);

        this._menuButton(ctx, 'RETRY', 400, 390, '#441122');
        this._menuButton(ctx, 'MAIN MENU', 400, 450, '#222233');
        ctx.textAlign = 'left';
    },

    renderVictory(ctx, game) {
        ctx.fillStyle = 'rgba(10,5,30,0.88)';
        ctx.fillRect(0, 0, 800, 600);

        ctx.save();
        ctx.shadowColor = '#ffcc44';
        ctx.shadowBlur = 30;
        ctx.fillStyle = '#ffdd66';
        ctx.font = 'bold 54px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('VICTORY!', 400, 160);
        ctx.restore();

        ctx.fillStyle = '#aaaacc';
        ctx.font = '18px monospace';
        ctx.textAlign = 'center';
        const dungeonName = (game.currentDungeon && game.currentDungeon.name) || 'Dungeon';
        const clearText = game.currentDungeonId === 'dungeon2'
            ? 'The Void Herald has fallen!'
            : 'The Necromancer has fallen!';
        ctx.fillText(clearText, 400, 220);
        ctx.fillStyle = '#9c8bb4';
        ctx.font = '13px monospace';
        ctx.fillText(`Cleared: ${dungeonName}`, 400, 242);
        ctx.fillStyle = '#aaaacc';
        ctx.font = '18px monospace';
        ctx.fillText(`Floors cleared: ${game.rooms.length}`, 400, 256);
        ctx.fillText(`Enemies slain: ${game.killCount}`, 400, 284);
        ctx.fillStyle = '#ffcc44';
        ctx.fillText(`+${game.runCrystalsEarned || 0} Crystals earned!`, 400, 320);
        ctx.fillText(`Total Crystals: ${game.crystals || 0}`, 400, 348);

        this._menuButton(ctx, 'SPEND CRYSTALS', 400, 390, '#442200');
        this._menuButton(ctx, 'MAIN MENU', 400, 450, '#222233');
        ctx.textAlign = 'left';
    },

    renderShop(ctx, saveData, hoverUpg, selectedCategory, hoverTab) {
        ctx.fillStyle = '#0c0a14';
        ctx.fillRect(0, 0, 800, 600);

        Assets.draw(ctx, 'shopkeeper', 30, 200, 90, 90);
        ctx.fillStyle = '#ddbb88';
        ctx.font = 'bold 28px monospace';
        ctx.fillText('PERMANENT UPGRADES', 130, 50);

        ctx.fillStyle = '#887766';
        ctx.font = '14px monospace';
        const categoryLabel = (typeof UpgradeSystem !== 'undefined' && typeof UpgradeSystem.getPermanentCategories === 'function')
            ? UpgradeSystem.getPermanentCategories().map(c => c[0].toUpperCase() + c.slice(1)).join(' • ')
            : 'Defense • Offense • Utility';
        ctx.fillText(`"${categoryLabel}"`, 130, 75);

        // Crystal balance
        Assets.draw(ctx, 'icon_crystal', 680, 10, 20, 20);
        ctx.fillStyle = '#cc88ff';
        ctx.font = 'bold 18px monospace';
        ctx.fillText(`${saveData.crystals} crystals`, 704, 27);

        const categories = (typeof UpgradeSystem !== 'undefined' && typeof UpgradeSystem.getPermanentCategories === 'function')
            ? UpgradeSystem.getPermanentCategories()
            : ['defense', 'offense', 'utility'];
        const activeCategory = selectedCategory || 'defense';
        const activeList = (typeof UpgradeSystem !== 'undefined' && typeof UpgradeSystem.getPermanentUpgradesByCategory === 'function')
            ? UpgradeSystem.getPermanentUpgradesByCategory(activeCategory)
            : [];
        const categoryIcons = {
            defense: 'category_defense',
            offense: 'category_offense',
            utility: 'category_utility'
        };

        categories.forEach((category, idx) => {
            const x = 130 + idx * 175;
            const y = 98;
            const w = 160;
            const h = 34;
            const isSelected = category === activeCategory;
            const isHover = hoverTab === category;
            ctx.fillStyle = isSelected ? '#3a2b58' : (isHover ? '#2a2239' : '#1b1727');
            ctx.strokeStyle = isSelected ? '#cda7ff' : '#5f4f77';
            ctx.lineWidth = isSelected ? 2.5 : 1.5;
            ctx.beginPath();
            ctx.roundRect(x, y, w, h, 8);
            ctx.fill();
            ctx.stroke();
            Assets.draw(ctx, categoryIcons[category], x + 8, y + 7, 20, 20);
            ctx.fillStyle = isSelected ? '#efe0ff' : '#b8a6d3';
            ctx.font = 'bold 13px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(category.toUpperCase(), x + w / 2 + 10, y + 23);
        });
        ctx.textAlign = 'left';

        activeList.forEach((pu, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const x = 130 + col * 270;
            const y = 150 + row * 190;
            const rank = saveData.permanentUpgrades[pu.id] || 0;
            const cost = UpgradeSystem.permanentCost(pu, rank);
            const isHover = hoverUpg === i;
            const canAfford = saveData.crystals >= cost;
            const maxed = rank >= pu.maxRank;

            ctx.fillStyle = isHover && !maxed ? '#2a2030' : '#1a1525';
            ctx.strokeStyle = isHover ? '#9966cc' : '#443355';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(x, y, 250, 170, 8);
            ctx.fill(); ctx.stroke();

            Assets.draw(ctx, pu.icon, x + 8, y + 8, 32, 32);

            ctx.fillStyle = '#ddccff';
            ctx.font = 'bold 13px monospace';
            ctx.fillText(pu.name, x + 48, y + 22);
            ctx.fillStyle = '#aa99cc';
            ctx.font = '11px monospace';
            ctx.textAlign = 'right';
            ctx.fillText(`Rank ${rank}/${pu.maxRank}`, x + 238, y + 22);
            ctx.textAlign = 'left';

            ctx.fillStyle = '#9988aa';
            ctx.font = '11px monospace';
            ctx.fillText(pu.description || '', x + 8, y + 55);
            ctx.fillStyle = '#99b6ff';
            ctx.fillText(`Effect: ${pu.effectPerRank || ''}`, x + 8, y + 73);

            // Rank stars
            for (let r = 0; r < pu.maxRank; r++) {
                ctx.fillStyle = r < rank ? '#ffcc44' : '#333344';
                ctx.beginPath();
                ctx.arc(x + 14 + r * 20, y + 95, 7, 0, Math.PI*2);
                ctx.fill();
            }

            ctx.fillStyle = '#ccb9e6';
            ctx.font = '10px monospace';
            if (maxed) {
                ctx.fillText('Next: MAXED', x + 8, y + 118);
            } else if (typeof pu.nextRankPreview === 'function') {
                ctx.fillText(`Next: ${pu.nextRankPreview(rank)}`, x + 8, y + 118);
            } else {
                ctx.fillText('Next: +1 rank', x + 8, y + 118);
            }

            // Buy button
            if (!maxed) {
                ctx.fillStyle = canAfford ? (isHover ? '#5522aa' : '#331188') : '#331122';
                ctx.strokeStyle = canAfford ? '#8844ff' : '#442233';
                ctx.beginPath();
                ctx.roundRect(x + 75, y + 130, 100, 28, 6);
                ctx.fill(); ctx.stroke();
                ctx.fillStyle = canAfford ? '#ffffff' : '#885566';
                ctx.font = 'bold 12px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(`Buy (${cost})`, x + 125, y + 149);
                ctx.textAlign = 'left';
            } else {
                ctx.fillStyle = '#448844';
                ctx.font = 'bold 12px monospace';
                ctx.fillText('✓ MAXED', x + 98, y + 149);
            }
        });

        ctx.fillStyle = '#887799';
        ctx.font = '13px monospace';
        ctx.fillText('← Back to Menu', 30, 580);
    },

    renderCardsMenu(ctx, saveData, cards, hoverIdx, rarityFilter, typeFilter) {
        ctx.fillStyle = '#0b0a14';
        ctx.fillRect(0, 0, 800, 600);
        ctx.fillStyle = '#d8c5ff';
        ctx.font = 'bold 30px monospace';
        ctx.fillText('CARDS', 30, 48);

        Assets.draw(ctx, 'icon_coins', 640, 20, 18, 18);
        ctx.fillStyle = '#ffcc55';
        ctx.font = 'bold 16px monospace';
        ctx.fillText(`${(saveData && saveData.coins) || 0}`, 664, 35);

        const equipped = new Set((saveData && saveData.equippedCardIds) || []);
        const owned = new Set((saveData && saveData.ownedCardIds) || []);
        ctx.fillStyle = '#9e8fb8';
        ctx.font = '13px monospace';
        ctx.fillText(`Equipped: ${equipped.size}  Owned: ${owned.size}/${(typeof UpgradeSystem !== 'undefined' && UpgradeSystem.allCards().length) || 0}`, 30, 75);

        ctx.fillStyle = '#1b2233';
        ctx.fillRect(40, 95, 130, 30);
        ctx.fillRect(190, 95, 170, 30);
        ctx.fillStyle = '#c8d4ff';
        ctx.fillText(`Rarity: ${(rarityFilter || 'all').toUpperCase()}`, 48, 115);
        ctx.fillText(`Type: ${(typeFilter || 'all').toUpperCase()}`, 198, 115);

        const preset = (saveData && Array.isArray(saveData.cardPresets))
            ? saveData.cardPresets.find(p => p.id === saveData.selectedCardPresetId)
            : null;
        ctx.fillStyle = '#9e8fb8';
        ctx.fillText(`Preset: ${(preset && preset.name) || 'None'}`, 590, 80);
        const presetBtns = ['Save', 'Load', 'Rename', 'Create', 'Delete', 'Next'];
        presetBtns.forEach((label, i) => {
            ctx.fillStyle = '#2f2a43';
            ctx.fillRect(590, 95 + i * 35, 170, 30);
            ctx.fillStyle = '#d7d0ec';
            ctx.fillText(label, 650, 115 + i * 35);
        });

        cards.forEach((card, i) => {
            const col = i % 4;
            const row = Math.floor(i / 4);
            const x = 70 + col * 170;
            const y = 180 + row * 170;
            const rarityColor = (typeof ClassSystem !== 'undefined' && ClassSystem.rarityColor) ? ClassSystem.rarityColor(card.rarity) : '#888';
            const isOwned = owned.has(card.id);
            const isEquipped = equipped.has(card.id);
            ctx.fillStyle = hoverIdx === i ? '#2a233a' : '#171326';
            ctx.strokeStyle = rarityColor;
            ctx.lineWidth = isEquipped ? 3 : 2;
            ctx.beginPath();
            ctx.roundRect(x, y, 150, 150, 8);
            ctx.fill();
            ctx.stroke();
            if (!isOwned) ctx.fillStyle = 'rgba(0,0,0,0.55)', ctx.fillRect(x, y, 150, 150);
            Assets.draw(ctx, card.icon || 'card_back', x + 54, y + 12, 42, 42);
            if (!isOwned) Assets.draw(ctx, 'icon_lock', x + 116, y + 8, 24, 24);
            if (isEquipped) Assets.draw(ctx, 'icon_equipped', x + 8, y + 8, 24, 24);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(card.name, x + 75, y + 70);
            ctx.fillStyle = '#a9a4c7';
            ctx.font = '10px monospace';
            ctx.fillText((card.description || card.desc || '').slice(0, 32), x + 75, y + 86);
            ctx.fillStyle = isOwned ? (isEquipped ? '#88ff88' : '#9ba9d0') : '#aa8899';
            ctx.fillText(!isOwned ? 'LOCKED' : (isEquipped ? 'EQUIPPED' : 'CLICK TO EQUIP'), x + 75, y + 138);
            ctx.textAlign = 'left';
        });
        ctx.fillStyle = '#887799';
        ctx.font = '13px monospace';
        ctx.fillText('← Back to Menu', 30, 580);
    },

    renderCardShop(ctx, saveData, shopData, hoverIdx) {
        ctx.fillStyle = '#0c0a14';
        ctx.fillRect(0, 0, 800, 600);
        ctx.fillStyle = '#e6cc88';
        ctx.font = 'bold 30px monospace';
        ctx.fillText('CARD SHOP', 30, 50);
        Assets.draw(ctx, 'icon_coins', 610, 18, 22, 22);
        ctx.fillStyle = '#ffcc55';
        ctx.font = 'bold 18px monospace';
        ctx.fillText(`${(saveData && saveData.coins) || 0}`, 640, 35);

        const remainingSec = Math.ceil(((shopData && shopData.remainingMs) || 0) / 1000);
        const mm = String(Math.floor(remainingSec / 60)).padStart(2, '0');
        const ss = String(remainingSec % 60).padStart(2, '0');
        ctx.fillStyle = '#a6a0c7';
        ctx.font = '13px monospace';
        ctx.fillText(`Next rotation: ${mm}:${ss}`, 30, 78);

        const cards = (shopData && shopData.cards) || [];
        if (cards.length === 0) {
            ctx.fillStyle = '#c8c4dc';
            ctx.font = 'bold 22px monospace';
            ctx.fillText('All cards owned', 270, 310);
        }

        cards.forEach((card, i) => {
            const x = 70 + i * 180;
            const y = 210;
            const rarityColor = (typeof ClassSystem !== 'undefined' && ClassSystem.rarityColor) ? ClassSystem.rarityColor(card.rarity) : '#888';
            const cost = card.shopCost || 0;
            const owned = ((saveData && saveData.ownedCardIds) || []).includes(card.id);
            const canAfford = ((saveData && saveData.coins) || 0) >= cost;
            ctx.fillStyle = hoverIdx === i ? '#2a233a' : '#171326';
            ctx.strokeStyle = rarityColor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(x, y, 160, 220, 9);
            ctx.fill();
            ctx.stroke();
            Assets.draw(ctx, card.icon || 'card_back', x + 56, y + 16, 48, 48);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(card.name, x + 80, y + 82);
            ctx.fillStyle = '#b0a6ca';
            ctx.font = '10px monospace';
            ctx.fillText((card.description || card.desc || '').slice(0, 30), x + 80, y + 100);
            ctx.fillStyle = '#ffd36e';
            ctx.font = 'bold 12px monospace';
            ctx.fillText(`${cost} coins`, x + 80, y + 132);
            ctx.fillStyle = owned ? '#334a66' : (canAfford ? '#325e2f' : '#4b2a32');
            ctx.fillRect(x + 30, y + 170, 100, 28);
            ctx.fillStyle = owned ? '#bdd4ff' : (canAfford ? '#ccffd0' : '#d09aaa');
            ctx.fillText(owned ? 'OWNED' : (canAfford ? 'BUY' : 'NOT ENOUGH'), x + 80, y + 189);
            ctx.textAlign = 'left';
        });

        ctx.fillStyle = '#887799';
        ctx.font = '13px monospace';
        ctx.fillText('← Back to Menu', 30, 580);
    },

    renderPause(ctx) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, 800, 600);
        ctx.fillStyle = '#ddaaff';
        ctx.font = 'bold 48px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', 400, 260);
        ctx.fillStyle = '#887799';
        ctx.font = '18px monospace';
        ctx.fillText('Press Esc to resume', 400, 320);
        ctx.fillStyle = '#664455';
        ctx.font = '14px monospace';
        ctx.fillText('Click "Quit to Menu" to abandon run', 400, 360);
        this._menuButton(ctx, 'Resume', 400, 410, '#223344');
        this._menuButton(ctx, 'Quit to Menu', 400, 465, '#442233');
        ctx.textAlign = 'left';
    },

    renderHelp(ctx) {
        ctx.fillStyle = '#0a0810';
        ctx.fillRect(0, 0, 800, 600);
        ctx.fillStyle = '#ddaaff';
        ctx.font = 'bold 28px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('HOW TO PLAY', 400, 50);

        const lines = [
            ['Controls', '#ffcc88'],
            ['WASD / Arrow Keys — Move', '#cccccc'],
            ['J — Fireball (auto-targets nearest enemy, AOE)', '#cccccc'],
            ['K — Dash (invincible dash in move direction)', '#cccccc'],
            ['L — Ice Nova (freeze all nearby enemies)', '#cccccc'],
            ['Esc — Pause', '#cccccc'],
            ['', ''],
            ['Gameplay', '#ffcc88'],
            ['Auto-attack fires at nearest enemy in range.', '#cccccc'],
            ['Clear all enemies to open the exit door.', '#cccccc'],
            ['Progress through your selected dungeon to face its Boss!', '#cccccc'],
            ['Level up to choose powerful upgrades.', '#cccccc'],
            ['Earn crystals to buy permanent upgrades.', '#cccccc'],
            ['', ''],
            ['Status Effects', '#ffcc88'],
            ['🔥 Burn: 5 dmg/sec  ❄ Freeze: stop movement', '#cccccc'],
            ['☠ Poison: 3 dmg/sec  ⚡ Shock: chains to nearby', '#cccccc'],
        ];

        ctx.textAlign = 'left';
        let ly = 90;
        for (const [text, color] of lines) {
            ctx.fillStyle = color;
            ctx.font = color === '#ffcc88' ? 'bold 14px monospace' : '13px monospace';
            ctx.fillText(text, 80, ly);
            ly += text ? 22 : 10;
        }

        this._menuButton(ctx, '← Back', 400, 560, '#223344');
        ctx.textAlign = 'left';
    },

    renderSettings(ctx, saveData) {
        ctx.fillStyle = '#0a0810';
        ctx.fillRect(0, 0, 800, 600);
        ctx.fillStyle = '#ddaaff';
        ctx.font = 'bold 30px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('SETTINGS', 400, 90);

        ctx.fillStyle = '#887799';
        ctx.font = '13px monospace';
        ctx.fillText('Manage your local save data.', 400, 130);

        ctx.fillStyle = '#aaaacc';
        ctx.fillText(`Crystals: ${(saveData && saveData.crystals) || 0}  •  Coins: ${(saveData && saveData.coins) || 0}  •  Runs: ${(saveData && saveData.totalRuns) || 0}`, 400, 170);

        this._menuButton(ctx, 'HOW TO PLAY', 400, 240, '#244433');
        this._menuButton(ctx, 'DELETE SAVE', 400, 300, '#552233');
        this._menuButton(ctx, '← Back', 400, 360, '#223344');

        ctx.fillStyle = '#cc8899';
        ctx.font = '11px monospace';
        ctx.fillText('delete save resets progress to default values.', 400, 425);
        ctx.textAlign = 'left';
    },

    renderLoading(ctx, progress) {
        ctx.fillStyle = '#0a0810';
        ctx.fillRect(0, 0, 800, 600);
        ctx.fillStyle = '#ddaaff';
        ctx.font = 'bold 28px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Loading...', 400, 280);
        ctx.fillStyle = '#220033';
        ctx.fillRect(200, 310, 400, 18);
        ctx.fillStyle = '#9944cc';
        ctx.fillRect(200, 310, 400 * progress, 18);
        ctx.strokeStyle = '#443355';
        ctx.strokeRect(200, 310, 400, 18);
        ctx.fillStyle = '#887799';
        ctx.font = '14px monospace';
        ctx.fillText(`${Math.floor(progress * 100)}%`, 400, 350);
        ctx.textAlign = 'left';
    },

    _menuButton(ctx, label, cx, y, bg) {
        const w = 220, h = 40;
        ctx.fillStyle = bg || '#222233';
        ctx.strokeStyle = '#446688';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(cx - w/2, y, w, h, 8);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ccddff';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(label, cx, y + 26);
    },

    _hoveredCard: -1,

    // Mobile on-screen controls
    renderMobileControls(ctx, joystick) {
        // Joystick base
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(70, 500, 50, 0, Math.PI*2);
        ctx.fill();

        // Joystick knob
        if (joystick && joystick.active) {
            ctx.fillStyle = '#aaaaff';
            ctx.beginPath();
            ctx.arc(70 + joystick.dx * 35, 500 + joystick.dy * 35, 20, 0, Math.PI*2);
            ctx.fill();
        } else {
            ctx.fillStyle = '#8888cc';
            ctx.beginPath();
            ctx.arc(70, 500, 20, 0, Math.PI*2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }
};
