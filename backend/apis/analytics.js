const fs = require('fs');
const path = require('path');

const ANALYTICS_FILE = path.join(__dirname, '../data/analytics.json');

const getAnalytics = () => {
    if (!fs.existsSync(ANALYTICS_FILE)) return {};
    try {
        const data = fs.readFileSync(ANALYTICS_FILE);
        return JSON.parse(data);
    } catch (e) {
        return {};
    }
};

const saveAnalytics = (data) => {
    fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(data, null, 2));
};

module.exports = function (app) {
    // Increment View
    app.post('/api/analytics/view', (req, res) => {
        const { username } = req.body;
        if (!username) return res.status(400).json({ error: 'Username required' });

        let analytics = getAnalytics();
        if (!analytics[username]) {
            analytics[username] = { views: 0, links: {} };
        }

        analytics[username].views += 1;
        saveAnalytics(analytics);
        res.json({ success: true });
    });

    // Increment Click
    app.post('/api/analytics/click', (req, res) => {
        const { username, linkLabel } = req.body;
        if (!username || !linkLabel) return res.status(400).json({ error: 'Missing data' });

        let analytics = getAnalytics();
        if (!analytics[username]) {
            analytics[username] = { views: 0, links: {} };
        }

        // Ensure links object exists
        if (!analytics[username].links) {
            analytics[username].links = {};
        }

        if (!analytics[username].links[linkLabel]) {
            analytics[username].links[linkLabel] = 0;
        }

        analytics[username].links[linkLabel] += 1;
        saveAnalytics(analytics);
        res.json({ success: true });
    });

    // Get Analytics
    app.get('/api/analytics/user/:username', (req, res) => {
        const analytics = getAnalytics();
        const data = analytics[req.params.username] || { views: 0, links: {} };
        res.json(data);
    });
};
