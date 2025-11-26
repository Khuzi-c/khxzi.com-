const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'khxzi-super-secret-change-me';
const TOKEN_COOKIE = 'khxzi_token';
const TOKEN_MAX_AGE = 12 * 60 * 60 * 1000; // 12 hours

const baseCookieOptions = {
	httpOnly: true,
	sameSite: 'lax',
	secure: process.env.NODE_ENV === 'production',
	maxAge: TOKEN_MAX_AGE
};

const hashPassword = async (password) => bcrypt.hash(password, 12);
const comparePassword = async (password, hashed) => bcrypt.compare(password, hashed);

const signToken = (payload, expiresIn = '12h') => jwt.sign(payload, JWT_SECRET, { expiresIn });

const verifyToken = (token) => {
	try {
		return jwt.verify(token, JWT_SECRET);
	} catch (err) {
		return null;
	}
};

const issueAuthCookie = (res, payload, rememberMe = false) => {
	const token = signToken(payload, rememberMe ? '30d' : '12h');
	const cookieOptions = rememberMe
		? { ...baseCookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 }
		: baseCookieOptions;

	res.cookie(TOKEN_COOKIE, token, cookieOptions);
	return token;
};

const clearAuthCookie = (res) => {
	res.clearCookie(TOKEN_COOKIE, baseCookieOptions);
};

const getTokenFromRequest = (req) => req.cookies?.[TOKEN_COOKIE] || null;

module.exports = {
	hashPassword,
	comparePassword,
	signToken,
	verifyToken,
	issueAuthCookie,
	clearAuthCookie,
	getTokenFromRequest,
	JWT_SECRET,
	TOKEN_COOKIE
};

