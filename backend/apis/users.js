const fs = require('fs');
const path = require('path');
const {
	readJSON,
	writeJSON,
	USERS_FILE,
	ANALYTICS_FILE,
	PUBLISHED_FILE
} = require('../utils/storage');
const { requireAuth } = require('../middleware/auth');

const loadUsers = () => readJSON(USERS_FILE).users || [];
const saveUsers = (users) => writeJSON(USERS_FILE, { users });
const sanitizeUser = ({ password, ...rest }) => rest;

const normalizeLinks = (links = []) => {
	return links
		.filter(link => link && (link.label || link.url))
		.map((link, idx) => ({
			id: link.id || `link_${Date.now()}_${idx}`,
			label: (link.label || '').trim().slice(0, 60),
			url: (link.url || '').trim(),
			icon: (link.icon || '').trim(),
			clicks: Number(link.clicks) || 0
		}));
};

const updateAnalyticsThemeUsage = (username, theme) => {
	const analytics = readJSON(ANALYTICS_FILE);
	if (!analytics[username]) {
		analytics[username] = {
			views: 0,
			publishCount: 0,
			clicks: {},
			themes: {}
		};
	}

	if (!analytics[username].themes[theme]) {
		analytics[username].themes[theme] = 0;
	}
	analytics[username].themes[theme] += 1;
	writeJSON(ANALYTICS_FILE, analytics);
};

const renamePublishedEntry = (oldUsername, newUsername) => {
	const published = readJSON(PUBLISHED_FILE);
	if (published.profiles?.[oldUsername]) {
		published.profiles[newUsername] = published.profiles[oldUsername];
		delete published.profiles[oldUsername];
		writeJSON(PUBLISHED_FILE, published);
	}
};

const renameAnalyticsEntry = (oldUsername, newUsername) => {
	const analytics = readJSON(ANALYTICS_FILE);
	if (analytics[oldUsername]) {
		analytics[newUsername] = analytics[oldUsername];
		delete analytics[oldUsername];
		writeJSON(ANALYTICS_FILE, analytics);
	}
};

module.exports = function (app) {
	// Get User Public Data
	app.get('/api/user/:username', (req, res) => {
		const users = loadUsers();
		const user = users.find(u => u.username.toLowerCase() === req.params.username.toLowerCase());
		if (!user) return res.status(404).json({ error: 'User not found' });

		res.json({ user: sanitizeUser(user) });
	});

	// Update Profile (bio + social fields, avatar, theme, background media)
	app.post('/api/user/updateProfile', requireAuth, (req, res) => {
		const { bio = '', links = [], avatar = '', theme = '', bgMusic = '', bgVideo = '' } = req.body;
		const users = loadUsers();
		const user = users.find(u => u.username === req.user.username);

		if (!user) return res.status(404).json({ error: 'User not found' });

		user.bio = (bio || '').slice(0, 500);
		user.links = normalizeLinks(Array.isArray(links) ? links : []);
		if (avatar) user.avatar = avatar;
		if (theme) user.theme = theme;
		if (bgMusic) user.bgMusic = bgMusic;
		if (bgVideo) user.bgVideo = bgVideo;
		user.updatedAt = new Date().toISOString();

		saveUsers(users);
		res.json({ success: true, user: sanitizeUser(user) });
	});

	// Update Avatar
	app.post('/api/user/updateAvatar', requireAuth, (req, res) => {
		const { avatar } = req.body;
		if (!avatar) return res.status(400).json({ error: 'Avatar required' });

		const users = loadUsers();
		const user = users.find(u => u.username === req.user.username);
		if (!user) return res.status(404).json({ error: 'User not found' });

		user.avatar = avatar;
		user.updatedAt = new Date().toISOString();
		saveUsers(users);

		res.json({ success: true, avatar: user.avatar });
	});

	// Update Theme
	app.post('/api/user/updateTheme', requireAuth, (req, res) => {
		const { theme } = req.body;
		if (!theme) return res.status(400).json({ error: 'Theme required' });

		const users = loadUsers();
		const user = users.find(u => u.username === req.user.username);
		if (!user) return res.status(404).json({ error: 'User not found' });

		user.theme = theme;
		user.updatedAt = new Date().toISOString();
		saveUsers(users);

		updateAnalyticsThemeUsage(user.username, theme);

		res.json({ success: true, theme: user.theme });
	});

	// Update Links
	app.post('/api/user/updateLinks', requireAuth, (req, res) => {
		const { links } = req.body;
		const users = loadUsers();
		const user = users.find(u => u.username === req.user.username);

		if (!user) return res.status(404).json({ error: 'User not found' });

		user.links = normalizeLinks(Array.isArray(links) ? links : []);
		user.updatedAt = new Date().toISOString();
		saveUsers(users);

		res.json({ success: true, links: user.links });
	});

	// Change Username
	app.post('/api/user/changeUsername', requireAuth, (req, res) => {
		const { newUsername } = req.body;
		if (!newUsername || newUsername.length < 3) {
			return res.status(400).json({ error: 'Invalid username' });
		}

		const normalized = newUsername.trim().toLowerCase();
		const users = loadUsers();

		if (users.find(u => u.username.toLowerCase() === normalized)) {
			return res.status(400).json({ error: 'Username taken' });
		}

		const user = users.find(u => u.username === req.user.username);
		if (!user) return res.status(404).json({ error: 'User not found' });

		const oldUsername = user.username;
		user.username = normalized;
		user.updatedAt = new Date().toISOString();
		saveUsers(users);

		renamePublishedEntry(oldUsername, normalized);
		renameAnalyticsEntry(oldUsername, normalized);

		const siteDir = path.join(__dirname, '../../frontend/sites');
		const oldDir = path.join(siteDir, oldUsername);
		const newDir = path.join(siteDir, normalized);
		if (fs.existsSync(oldDir)) {
			fs.renameSync(oldDir, newDir);
		}

		res.json({ success: true, username: user.username });
	});
};
