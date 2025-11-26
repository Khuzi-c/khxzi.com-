const { readJSON, writeJSON } = require('../utils/storage');
const path = require('path');

const LEVELS_FILE = path.join(__dirname, '../data/levels.json');
const USERS_FILE = path.join(__dirname, '../data/users.json');

const getLevels = () => readJSON(LEVELS_FILE) || [];
const saveLevels = (levels) => writeJSON(LEVELS_FILE, levels);

// XP required for each level
function getXPForLevel(level) {
    return Math.floor(100 * Math.pow(1.5, level - 1));
}

// Calculate level from XP
function calculateLevel(xp) {
    let level = 1;
    while (xp >= getXPForLevel(level + 1)) {
        level++;
    }
    return level;
}

module.exports = function (app, io) {

    // Add XP to User
    app.post('/api/leveling/add-xp', (req, res) => {
        try {
            const { username, xp, reason } = req.body;

            if (!username || !xp) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            const levels = getLevels();
            let userIndex = levels.findIndex(u => u.username === username);

            if (userIndex === -1) {
                levels.push({
                    username,
                    xp: 0,
                    level: 1,
                    coins: 0,
                    badges: []
                });
                userIndex = levels.length - 1;
            }

            const oldLevel = levels[userIndex].level;
            levels[userIndex].xp += xp;
            levels[userIndex].level = calculateLevel(levels[userIndex].xp);

            const leveledUp = levels[userIndex].level > oldLevel;

            saveLevels(levels);

            // Notify via Socket.io
            if (io && leveledUp) {
                io.emit('level_up', {
                    username,
                    level: levels[userIndex].level
                });
            }

            res.json({
                success: true,
                xp: levels[userIndex].xp,
                level: levels[userIndex].level,
                leveledUp
            });
        } catch (err) {
            console.error('Add XP error:', err);
            res.status(500).json({ error: 'Server error' });
        }
    });

    // Add Coins
    app.post('/api/leveling/add-coins', (req, res) => {
        try {
            const { username, coins } = req.body;

            const levels = getLevels();
            let userIndex = levels.findIndex(u => u.username === username);

            if (userIndex === -1) {
                levels.push({
                    username,
                    xp: 0,
                    level: 1,
                    coins: 0,
                    badges: []
                });
                userIndex = levels.length - 1;
            }

            levels[userIndex].coins += coins;
            saveLevels(levels);

            res.json({ success: true, coins: levels[userIndex].coins });
        } catch (err) {
            console.error('Add coins error:', err);
            res.status(500).json({ error: 'Server error' });
        }
    });

    // Add Badge
    app.post('/api/leveling/add-badge', (req, res) => {
        try {
            const { username, badge } = req.body;

            const levels = getLevels();
            let userIndex = levels.findIndex(u => u.username === username);

            if (userIndex === -1) {
                levels.push({
                    username,
                    xp: 0,
                    level: 1,
                    coins: 0,
                    badges: []
                });
                userIndex = levels.length - 1;
            }

            if (!levels[userIndex].badges.includes(badge)) {
                levels[userIndex].badges.push(badge);
            }

            saveLevels(levels);

            res.json({ success: true, badges: levels[userIndex].badges });
        } catch (err) {
            console.error('Add badge error:', err);
            res.status(500).json({ error: 'Server error' });
        }
    });

    // Get User Stats
    app.get('/api/leveling/stats/:username', (req, res) => {
        const { username } = req.params;
        const levels = getLevels();
        const user = levels.find(u => u.username === username);

        if (!user) {
            return res.json({
                xp: 0,
                level: 1,
                coins: 0,
                badges: []
            });
        }

        res.json(user);
    });

    // Get Leaderboard
    app.get('/api/leveling/leaderboard', (req, res) => {
        const levels = getLevels();
        const sorted = levels.sort((a, b) => b.xp - a.xp).slice(0, 10);
        res.json(sorted);
    });
};
