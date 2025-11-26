const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const config = require('./config');

const app = express();
const PORT = config.PORT;

// Initialize Discord Bot
const discord = require('./discord');
discord.initDiscord(); // Start the bot

// Middleware
app.use(bodyParser.json({ limit: '50mb' }));
app.use(cookieParser());
app.use(express.static(config.FRONTEND_DIR));

// APIs
require('./apis/auth')(app);
require('./apis/users')(app);
require('./apis/profiles')(app);
require('./apis/analytics')(app);
require('./apis/files')(app);
require('./apis/upload')(app);
require('./apis/account')(app);
require('./apis/discord-auth')(app);
require('./apis/ads')(app);
require('./apis/premium')(app);
require('./apis/ai')(app);
require('./apis/admin')(app);

// Premium Redirect
app.get('/premium', (req, res) => {
	res.redirect('https://discord.com/users/1342119031552872489');
});

// Serve Dashboard V3
app.get('/dashboard', (req, res) => {
	res.sendFile(path.join(config.FRONTEND_DIR, 'dashboard-v3.html'));
});

// Explicit root-level pages
app.get('/register', (req, res) => {
	return res.sendFile(path.join(config.FRONTEND_DIR, 'register.html'));
});

app.get('/login', (req, res) => {
	return res.sendFile(path.join(config.FRONTEND_DIR, 'login.html'));
});

// Discord Redirect
app.get('/discord', (req, res) => {
	res.redirect('https://discord.gg/THbZwYpsJs');
});

// Vanity URL handling
app.get('/@:username', (req, res) => {
	const username = req.params.username;

	// 1. Check for published site
	const sitePath = path.join(config.SITES_DIR || path.join(__dirname, '../frontend/sites'), username, 'index.html');
	if (fs.existsSync(sitePath)) {
		return res.sendFile(sitePath);
	}

	// 2. Check for redirect (claimed username)
	const usernamesPath = path.join(__dirname, 'data/usernames.json');
	let usernames = {};
	try {
		const data = fs.readFileSync(usernamesPath, 'utf8');
		usernames = JSON.parse(data);
	} catch (e) { }

	const entry = usernames[username];

	if (entry && entry.redirectUrl) {
		return res.redirect(302, entry.redirectUrl);
	}

	// 3. Not found - redirect to register with username
	res.redirect(`/register?username=${encodeURIComponent(username)}`);
});

// Explicit routes for pages
const validRoutes = [
	'/about', '/status', '/tos', '/privacy-policy', '/sitemap',
	'/ads', '/support', '/verify', '/premium', '/games', '/chat',
	'/admin', '/owner', '/editor', '/profile-preview', '/customer-support'
];

validRoutes.forEach(route => {
	app.get(route, (req, res, next) => {
		const filePath = path.join(config.FRONTEND_DIR, `${route.slice(1)}.html`);
		if (fs.existsSync(filePath)) {
			return res.sendFile(filePath);
		}
		// Check for index.html in subdirectory
		const indexPath = path.join(config.FRONTEND_DIR, route.slice(1), 'index.html');
		if (fs.existsSync(indexPath)) {
			return res.sendFile(indexPath);
		}
		next();
	});
});

// Catch-all - redirect to home ONLY if no file exists
app.use((req, res) => {
	// Check if static file exists
	const filePath = path.join(config.FRONTEND_DIR, req.path);
	if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
		return res.sendFile(filePath);
	}
	// Otherwise redirect to home
	res.redirect('/');
});

app.listen(PORT, () => {
	console.log(`Server running on http://localhost:${PORT}`);
});
