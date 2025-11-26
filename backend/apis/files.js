const fs = require('fs');
const path = require('path');
const { requireAuth } = require('../middleware/auth');
const { FILES_DIR, ensureDir } = require('../utils/storage');

const isSafePath = (targetPath = '') => {
	const normalized = path.normalize(targetPath);
	return !normalized.includes('..');
};

const resolveFilePath = (targetPath = '') => {
	if (!isSafePath(targetPath)) {
		throw new Error('Invalid path');
	}
	return path.join(FILES_DIR, targetPath);
};

const listDirectory = (dirPath, base = '') => {
	if (!fs.existsSync(dirPath)) return [];
	const entries = fs.readdirSync(dirPath, { withFileTypes: true });
	return entries.map(entry => {
		const relPath = path.join(base, entry.name);
		if (entry.isDirectory()) {
			return {
				name: entry.name,
				path: relPath,
				type: 'directory',
				children: listDirectory(path.join(dirPath, entry.name), relPath)
			};
		}
		return {
			name: entry.name,
			path: relPath,
			type: 'file'
		};
	});
};

module.exports = function (app) {
	// List Files / Directories
	app.get('/api/files/list', requireAuth, (req, res) => {
		ensureDir(FILES_DIR);
		const tree = listDirectory(FILES_DIR);
		res.json({ files: tree });
	});

	// Read File
	app.get('/api/files/read', requireAuth, (req, res) => {
		const filePath = req.query.path;
		if (!filePath) return res.status(400).json({ error: 'Path required' });

		try {
			const fullPath = resolveFilePath(filePath);
			if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
				return res.status(404).json({ error: 'File not found' });
			}

			const content = fs.readFileSync(fullPath, 'utf8');
			res.json({ path: filePath, content });
		} catch (err) {
			res.status(400).json({ error: err.message });
		}
	});

	// Write File
	app.post('/api/files/write', requireAuth, (req, res) => {
		const { path: targetPath, content } = req.body;
		if (!targetPath || content === undefined) {
			return res.status(400).json({ error: 'Path and content required' });
		}

		try {
			const fullPath = resolveFilePath(targetPath);
			ensureDir(path.dirname(fullPath));
			fs.writeFileSync(fullPath, content);
			res.json({ success: true });
		} catch (err) {
			res.status(400).json({ error: err.message });
		}
	});

	// Create File or Directory
	app.post('/api/files/create', requireAuth, (req, res) => {
		const { path: targetPath, type = 'file' } = req.body;
		if (!targetPath) return res.status(400).json({ error: 'Path required' });

		try {
			const fullPath = resolveFilePath(targetPath);
			if (fs.existsSync(fullPath)) {
				return res.status(400).json({ error: 'Path already exists' });
			}

			if (type === 'directory') {
				fs.mkdirSync(fullPath, { recursive: true });
			} else {
				ensureDir(path.dirname(fullPath));
				fs.writeFileSync(fullPath, '');
			}

			res.json({ success: true });
		} catch (err) {
			res.status(400).json({ error: err.message });
		}
	});

	// Delete File / Directory
	app.delete('/api/files/delete', requireAuth, (req, res) => {
		const { path: targetPath } = req.body;
		if (!targetPath) return res.status(400).json({ error: 'Path required' });

		try {
			const fullPath = resolveFilePath(targetPath);
			if (!fs.existsSync(fullPath)) {
				return res.status(404).json({ error: 'Path not found' });
			}

			const stat = fs.statSync(fullPath);
			if (stat.isDirectory()) {
				fs.rmSync(fullPath, { recursive: true, force: true });
			} else {
				fs.unlinkSync(fullPath);
			}

			res.json({ success: true });
		} catch (err) {
			res.status(400).json({ error: err.message });
		}
	});
};
