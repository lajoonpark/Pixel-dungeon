'use strict';
const SaveSystem = {
    KEY: 'pixelDungeon_v1',
    defaultSave: {
        crystals: 0,
        permanentUpgrades: {},
        bestRun: { floor: 0, kills: 0, crystals: 0 },
        settings: { sfx: true, music: true },
        totalRuns: 0,
        // Class system
        unlockedClasses: ['human_adventurer'],
        selectedClass: 'human_adventurer',
        rollCount: 0,
        rollCost: 20,
        classShards: {},
    },

    load() {
        try {
            const raw = localStorage.getItem(this.KEY);
            if (!raw) return this._deep(this.defaultSave);
            return Object.assign(this._deep(this.defaultSave), JSON.parse(raw));
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

