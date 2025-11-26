const {
    readJSON,
    writeJSON,
    USERS_FILE
} = require('../utils/storage');
const {
    hashPassword,
    getTokenFromRequest,
    verifyToken
} = require('../utils/security');
const path = require('path');

const BANNED_URLS_FILE = path.join(__dirname, '../data/banned_urls.json');

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
    const token = getTokenFromRequest(req);
    if (!token) return res.status(401).json({ error: 'Not authenticated' });

    const decoded = verifyToken(token);
    if (!decoded || !decoded.username) return res.status(401).json({ error: 'Invalid token' });

    const users = readJSON(USERS_FILE).users || [];
    const user = users.find(u => u.username === decoded.username);

    if (!user || !user.isAdmin) {
        return res.status(403).json({ error: 'Access denied. Admins only.' });
    }

    req.user = user;
    next();
};

module.exports = function (app) {
    // Get all users
    app.get('/api/admin/users', requireAdmin, (req, res) => {
        const users = readJSON(USERS_FILE).users || [];
        // Return safe user data
        const safeUsers = users.map(u => ({
            username: u.username,
            email: u.email,
            isAdmin: !!u.isAdmin,
            isBanned: !!u.isBanned,
            createdAt: u.createdAt
        }));
        res.json({ users: safeUsers });
    });

    // Reset Password
    app.post('/api/admin/reset-password', requireAdmin, async (req, res) => {
        const { username, newPassword } = req.body;
        if (!username || !newPassword) return res.status(400).json({ error: 'Missing fields' });

        const data = readJSON(USERS_FILE);
        const users = data.users || [];
        const userIndex = users.findIndex(u => u.username === username);

        if (userIndex === -1) return res.status(404).json({ error: 'User not found' });

        users[userIndex].password = await hashPassword(newPassword);
        writeJSON(USERS_FILE, { users });

        res.json({ success: true, message: `Password reset for ${username}` });
    });

    // Ban/Unban User
    app.post('/api/admin/ban-user', requireAdmin, (req, res) => {
        const { username, ban } = req.body;
        if (!username) return res.status(400).json({ error: 'Username required' });

        const data = readJSON(USERS_FILE);
        const users = data.users || [];
        const userIndex = users.findIndex(u => u.username === username);

        if (userIndex === -1) return res.status(404).json({ error: 'User not found' });
        if (users[userIndex].isAdmin) return res.status(403).json({ error: 'Cannot ban an admin' });

        users[userIndex].isBanned = !!ban;
        writeJSON(USERS_FILE, { users });

        res.json({ success: true, message: `User ${username} ${ban ? 'banned' : 'unbanned'}` });
    });

    // Ban Vanity URL
    app.post('/api/admin/ban-url', requireAdmin, (req, res) => {
        const { url } = req.body;
        if (!url) return res.status(400).json({ error: 'URL required' });

        const banned = readJSON(BANNED_URLS_FILE) || { urls: [] };
        if (!banned.urls.includes(url.toLowerCase())) {
            banned.urls.push(url.toLowerCase());
            writeJSON(BANNED_URLS_FILE, banned);
        }

        res.json({ success: true, message: `URL /@${url} has been banned` });
    });
};
