const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const ROOT = path.join(__dirname, '..');
const FRONTEND_DIR = path.join(ROOT, process.env.FRONTEND_DIR || 'frontend');
const DATA_DIR = path.join(__dirname, process.env.DATA_DIR || 'data');
const SITES_DIR = path.join(FRONTEND_DIR, process.env.SITES_DIR || 'sites');
const PORT = parseInt(process.env.PORT, 10) || 3001;

module.exports = {
    ROOT,
    FRONTEND_DIR,
    DATA_DIR,
    SITES_DIR,
    PORT
};
