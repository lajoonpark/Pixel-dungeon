'use strict';
const SaveSystem = {
    KEY: 'pixelDungeon_v1',
    defaultSave: {
        crystals: 0,
        permanentUpgrades: {},
        bestRun: { floor: 0, kills: 0, crystals: 0 },
        bestRunsByDungeon: {},
        settings: { sfx: true, music: true },
        totalRuns: 0,
        dungeonClears: {},
        unlockedDungeons: ['dungeon1'],
        selectedDungeon: 'dungeon1',
        // Class system
        unlockedClasses: ['human_adventurer'],
        selectedClass: 'human_adventurer',
        rollCount: 0,
        rollCost: 10,
        classShards: {},
    },

    load() {
        try {
            const raw = localStorage.getItem(this.KEY);
            const save = !raw
                ? this._deep(this.defaultSave)
                : Object.assign(this._deep(this.defaultSave), JSON.parse(raw));
            if (!Array.isArray(save.unlockedDungeons)) save.unlockedDungeons = ['dungeon1'];
            if (!save.unlockedDungeons.includes('dungeon1')) save.unlockedDungeons.push('dungeon1');
            if (!save.selectedDungeon) save.selectedDungeon = 'dungeon1';
            return save;
        } catch (e) {
            return this._deep(this.defaultSave);
        }
    },

    save(data) {
        try { localStorage.setItem(this.KEY, JSON.stringify(data)); } catch (e) {}
    },

    reset() {
        localStorage.removeItem(this.KEY);
        return this._deep(this.defaultSave);
    },

    _deep(obj) { return JSON.parse(JSON.stringify(obj)); }
};
