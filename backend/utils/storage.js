const fs = require('fs');
const path = require('path');
const config = require('../config');

const DATA_DIR = config.DATA_DIR || path.join(__dirname, '../data');
const FILES_DIR = path.join(DATA_DIR, 'files');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const ANALYTICS_FILE = path.join(DATA_DIR, 'analytics.json');
const PUBLISHED_FILE = path.join(DATA_DIR, 'published.json');

const DEFAULTS = {
	[USERS_FILE]: { users: [] },
	[ANALYTICS_FILE]: {},
	[PUBLISHED_FILE]: { profiles: {} }
};

const ensureDir = (dirPath) => {
	if (!fs.existsSync(dirPath)) {
		fs.mkdirSync(dirPath, { recursive: true });
	}
};

const ensureFile = (filePath, fallback) => {
	ensureDir(path.dirname(filePath));
	if (!fs.existsSync(filePath)) {
		const data = fallback !== undefined ? fallback : DEFAULTS[filePath] || {};
		fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
	}
};

const readJSON = (filePath, fallback) => {
	ensureFile(filePath, fallback);
	const raw = fs.readFileSync(filePath, 'utf8');
	try {
		return JSON.parse(raw);
	} catch (err) {
		const data = fallback !== undefined ? fallback : DEFAULTS[filePath] || {};
		fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
		return data;
	}
};

const writeJSON = (filePath, data) => {
	ensureDir(path.dirname(filePath));
	fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

module.exports = {
	DATA_DIR,
	FILES_DIR,
	USERS_FILE,
	ANALYTICS_FILE,
	PUBLISHED_FILE,
	readJSON,
	writeJSON,
	ensureDir,
	ensureFile
};

