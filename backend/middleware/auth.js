const {
	verifyToken,
	getTokenFromRequest
} = require('../utils/security');

const requireAuth = (req, res, next) => {
	const token = getTokenFromRequest(req);
	if (!token) return res.status(401).json({ error: 'Not authenticated' });

	const decoded = verifyToken(token);
	if (!decoded) return res.status(401).json({ error: 'Invalid or expired token' });

	req.user = decoded;
	next();
};

module.exports = { requireAuth };
