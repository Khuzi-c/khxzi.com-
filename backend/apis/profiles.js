const fs = require('fs');
const path = require('path');
const {
	readJSON,
	writeJSON,
	USERS_FILE,
	PUBLISHED_FILE
} = require('../utils/storage');
const { requireAuth } = require('../middleware/auth');
const generateProfileHTML = require('../generators/generateProfileHTML');

const config = require('../config');
const SITES_DIR = config.SITES_DIR || path.join(__dirname, '../../frontend/sites');

const loadUsers = () => readJSON(USERS_FILE).users || [];
const savePublished = (data) => writeJSON(PUBLISHED_FILE, data);

const getPublishedIndex = () => {
	const data = readJSON(PUBLISHED_FILE);
	if (!data.profiles) data.profiles = {};
	return data;
};

const ensureSitesDir = (dirPath) => {
	if (!fs.existsSync(dirPath)) {
		fs.mkdirSync(dirPath, { recursive: true });
	}
};

module.exports = function (app) {
	// Publish Profile
	app.post('/api/profile/publish', requireAuth, (req, res) => {
		const users = loadUsers();
		const user = users.find(u => u.username === req.user.username);

		if (!user) return res.status(404).json({ error: 'User not found' });

		const html = generateProfileHTML(user);
		const userSiteDir = path.join(SITES_DIR, user.username);

		ensureSitesDir(userSiteDir);
		fs.writeFileSync(path.join(userSiteDir, 'index.html'), html);

		const published = getPublishedIndex();
		const previous = published.profiles[user.username] || { version: 0 };
		published.profiles[user.username] = {
			username: user.username,
			theme: user.theme,
			lastPublishedAt: new Date().toISOString(),
			linkCount: Array.isArray(user.links) ? user.links.length : 0,
			version: previous.version + 1
		};

		savePublished(published);

		res.json({
			success: true,
			message: 'Profile published',
			profile: published.profiles[user.username]
		});
	});

	// Check if published
	app.get('/api/profile/check/:username', (req, res) => {
		const published = getPublishedIndex();
		const record = published.profiles[req.params.username];
		res.json({
			published: !!record,
			data: record || null
		});
	});
};
