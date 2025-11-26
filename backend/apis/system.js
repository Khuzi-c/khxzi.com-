const fs = require('fs');
const path = require('path');

const MUSIC_DIR = path.join(__dirname, '../bgmusic');
const VIDEO_DIR = path.join(__dirname, '../bgvideo');
const CURSOR_DIR = path.join(__dirname, '../cursors');

module.exports = function (app) {
    app.get('/api/system/media', (req, res) => {
        const music = fs.existsSync(MUSIC_DIR) ? fs.readdirSync(MUSIC_DIR) : [];
        const videos = fs.existsSync(VIDEO_DIR) ? fs.readdirSync(VIDEO_DIR) : [];
        const cursors = fs.existsSync(CURSOR_DIR) ? fs.readdirSync(CURSOR_DIR) : [];

        res.json({
            music: music.map(f => `/api/system/music/${f}`),
            videos: videos.map(f => `/api/system/video/${f}`),
            cursors: cursors.map(f => `/api/system/cursor/${f}`)
        });
    });

    // Serve files
    app.get('/api/system/music/:filename', (req, res) => {
        const file = path.join(MUSIC_DIR, req.params.filename);
        if (fs.existsSync(file)) res.sendFile(file);
        else res.status(404).send('Not found');
    });

    app.get('/api/system/video/:filename', (req, res) => {
        const file = path.join(VIDEO_DIR, req.params.filename);
        if (fs.existsSync(file)) res.sendFile(file);
        else res.status(404).send('Not found');
    });

    app.get('/api/system/cursor/:filename', (req, res) => {
        const file = path.join(CURSOR_DIR, req.params.filename);
        if (fs.existsSync(file)) res.sendFile(file);
        else res.status(404).send('Not found');
    });
};
