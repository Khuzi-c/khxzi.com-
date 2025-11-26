const {
	readJSON,
	writeJSON,
	USERS_FILE
} = require('../utils/storage');
const {
	hashPassword,
	comparePassword,
	issueAuthCookie,
	clearAuthCookie,
	getTokenFromRequest,
	verifyToken
} = require('../utils/security');

const loadUsers = () => readJSON(USERS_FILE).users || [];
const saveUsers = (users) => writeJSON(USERS_FILE, { users });
const sanitizeUser = ({ password, ...rest }) => rest;

const generateUsername = (base) => {
	if (base) return base.trim().toLowerCase();
	return `khxzi_${Math.random().toString(36).slice(2, 8)}`;
};

module.exports = function (app) {
	// Register
	app.post('/api/auth/register', async (req, res) => {
		try {
			const { username, password, bio = '', avatar = '', theme = 'red-black' } = req.body;

			if (!password || password.length < 6) {
				return res.status(400).json({ error: 'Password must be at least 6 characters long' });
			}

			const users = loadUsers();
			let normalizedUsername = generateUsername(username);

			if (users.find(u => u.username.toLowerCase() === normalizedUsername.toLowerCase())) {
				return res.status(400).json({ error: 'Username already taken' });
			}

			const hashedPassword = await hashPassword(password);
			const newUser = {
				username: normalizedUsername,
				password: hashedPassword,
				avatar,
				bio,
				links: [],
				theme,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			};

			users.push(newUser);
			saveUsers(users);

			issueAuthCookie(res, { username: newUser.username });

			res.json({ success: true, user: sanitizeUser(newUser) });
		} catch (err) {
			console.error('Register error:', err);
			res.status(500).json({ error: 'Server error' });
		}
	});

	// Login
	app.post('/api/auth/login', async (req, res) => {
		try {
			const { username, password, rememberMe } = req.body;
			if (!username || !password) {
				return res.status(400).json({ error: 'Username and password required' });
			}

			const users = loadUsers();
			let user = users.find(u => u.username.toLowerCase() === username.toLowerCase());

			if (!user) {
				const hashedPassword = await hashPassword(password);
				user = {
					username: username.trim().toLowerCase(),
					password: hashedPassword,
					avatar: '',
					bio: '',
					links: [],
					theme: 'red-black',
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					lastLoginAt: new Date().toISOString()
				};
				users.push(user);
				saveUsers(users);
			} else if (!(await comparePassword(password, user.password))) {
				return res.status(400).json({ error: 'Invalid credentials' });
			}

			issueAuthCookie(res, { username: user.username }, !!rememberMe);

			user.lastLoginAt = new Date().toISOString();
			saveUsers(users);

			res.json({ success: true, user: sanitizeUser(user) });
		} catch (err) {
			console.error('Login error:', err);
			res.status(500).json({ error: 'Server error' });
		}
	});

	// Logout
	app.post('/api/auth/logout', (req, res) => {
		clearAuthCookie(res);
		res.json({ success: true });
	});

	// Me
	app.get('/api/auth/me', (req, res) => {
		try {
			const token = getTokenFromRequest(req);
			console.log('Auth check - Token:', token ? 'exists' : 'missing');

			if (!token) {
				return res.status(401).json({ error: 'Not authenticated' });
			}

			const decoded = verifyToken(token);
			console.log('Auth check - Decoded:', decoded);

			if (!decoded || !decoded.username) {
				return res.status(401).json({ error: 'Invalid token' });
			}

			const users = loadUsers();
			const user = users.find(u => u.username === decoded.username);

			if (!user) {
				return res.status(401).json({ error: 'User not found' });
			}

			console.log('Auth check - User found:', user.username);
			res.json({ user: sanitizeUser(user) });
		} catch (err) {
			console.error('Auth check error:', err);
			res.status(500).json({ error: 'Server error' });
		}
	});
};
