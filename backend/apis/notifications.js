const { readJSON, writeJSON } = require('../utils/storage');
const path = require('path');

const NOTIFICATIONS_FILE = path.join(__dirname, '../data/notifications.json');
const USER_READS_FILE = path.join(__dirname, '../data/notification_reads.json');

const getNotifications = () => readJSON(NOTIFICATIONS_FILE) || [];
const getUserReads = () => readJSON(USER_READS_FILE) || {};
const saveUserReads = (reads) => writeJSON(USER_READS_FILE, reads);

module.exports = function (app) {

    // Get all notifications (public - no auth required)
    app.get('/api/notifications/all', (req, res) => {
        const notifications = getNotifications();
        res.json(notifications.slice(-20).reverse()); // Last 20, newest first
    });

    // Mark notifications as read for current user
    app.post('/api/notifications/mark-read', (req, res) => {
        try {
            const token = req.cookies?.authToken;
            if (!token) {
                return res.json({ success: false });
            }

            const { verifyToken } = require('../utils/security');
            const decoded = verifyToken(token);
            if (!decoded) {
                return res.json({ success: false });
            }

            const username = decoded.username;
            const notifications = getNotifications();
            const userReads = getUserReads();

            userReads[username] = notifications.map(n => n.id);
            saveUserReads(userReads);

            res.json({ success: true });
        } catch (err) {
            console.error('Mark read error:', err);
            res.json({ success: false });
        }
    });

    // Get unread count for user
    app.get('/api/notifications/unread-count', (req, res) => {
        try {
            const token = req.cookies?.authToken;
            if (!token) {
                return res.json({ count: 0 });
            }

            const { verifyToken } = require('../utils/security');
            const decoded = verifyToken(token);
            if (!decoded) {
                return res.json({ count: 0 });
            }

            const username = decoded.username;
            const notifications = getNotifications();
            const userReads = getUserReads();
            const readIds = userReads[username] || [];

            const unreadCount = notifications.filter(n => !readIds.includes(n.id)).length;
            res.json({ count: unreadCount });
        } catch (err) {
            console.error('Unread count error:', err);
            res.json({ count: 0 });
        }
    });
};
