const fs = require('fs');
const path = require('path');
const {
    readJSON,
    USERS_FILE,
    ANALYTICS_FILE,
    PUBLISHED_FILE
} = require('../utils/storage');
const { requireAuth } = require('../middleware/auth');

const loadUsers = () => readJSON(USERS_FILE).users || [];
const getAnalytics = () => {
    if (!fs.existsSync(ANALYTICS_FILE)) return {};
    try { return JSON.parse(fs.readFileSync(ANALYTICS_FILE)); } catch (e) { return {}; }
};

const getPublished = () => {
    if (!fs.existsSync(PUBLISHED_FILE)) return { profiles: {} };
    try { return JSON.parse(fs.readFileSync(PUBLISHED_FILE)); } catch (e) { return { profiles: {} }; }
};

module.exports = function (app) {
    // Get account overview for signed-in user
    app.get('/api/account/overview', requireAuth, (req, res) => {
        const users = loadUsers();
        const user = users.find(u => u.username === req.user.username);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const analytics = getAnalytics();
        const published = getPublished();

        const idx = users.findIndex(u => u.username === user.username);
        const uid = 650000 + Math.max(0, idx); // deterministic UID derived from index

        const completionChecks = {
            avatar: !!user.avatar,
            bio: !!(user.bio && user.bio.trim()),
            links: Array.isArray(user.links) && user.links.length > 0,
            discord: !!user.discord,
            published: !!(published.profiles && published.profiles[user.username])
        };

        const totalChecks = Object.keys(completionChecks).length;
        const trueCount = Object.values(completionChecks).filter(Boolean).length;
        const completion = Math.round((trueCount / totalChecks) * 100);

        const viewData = analytics[user.username] || { views: 0, links: {} };

        res.json({
            user: {
                username: user.username,
                alias: user.alias || user.displayName || null,
                isAdmin: !!user.isAdmin,
                uid: uid,
                avatar: user.avatar || '',
                bio: user.bio || ''
            },
            analytics: {
                views: Number(viewData.views || 0),
                linkClicks: viewData.links || {}
            },
            profileCompletion: {
                percent: completion,
                checks: completionChecks
            }
        });
    });

    // Get detailed analytics for user
    app.get('/api/account/analytics', requireAuth, (req, res) => {
        const analytics = getAnalytics();
        const userAnalytics = analytics[req.user.username] || { views: 0, links: {} };
        res.json(userAnalytics);
    });
};
