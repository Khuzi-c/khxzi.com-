const { readJSON, writeJSON } = require('../utils/storage');
const path = require('path');
const fs = require('fs');

const ADS_FILE = path.join(__dirname, '../data/ads.json');

module.exports = function (app) {
    // Submit Ad
    app.post('/api/ads/submit', async (req, res) => {
        try {
            const { discordId, email, link, banner, type } = req.body;

            console.log('Ad submission received:', { discordId, email, link, type });

            if (!discordId || !email || !link || !banner) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields. Please fill in all fields.'
                });
            }

            // Ensure ads file exists
            if (!fs.existsSync(ADS_FILE)) {
                writeJSON(ADS_FILE, []);
            }

            const ads = readJSON(ADS_FILE) || [];
            const newAd = {
                id: Date.now().toString(),
                discordId,
                email,
                link,
                banner,
                type: type || 'image',
                status: 'pending',
                createdAt: new Date().toISOString()
            };

            ads.push(newAd);
            writeJSON(ADS_FILE, ads);

            console.log('Ad submitted successfully:', newAd.id);

            // Try to post to Discord if available
            try {
                const discord = require('../discord');
                if (discord && discord.postNewAd) {
                    await discord.postNewAd(newAd);
                }
            } catch (discordErr) {
                console.log('Discord notification skipped:', discordErr.message);
            }

            res.json({
                success: true,
                message: 'Ad submitted successfully! It will be reviewed shortly.',
                adId: newAd.id
            });

        } catch (err) {
            console.error('Ad submission error:', err);
            res.status(500).json({
                success: false,
                error: 'Failed to submit ad. Please try again.'
            });
        }
    });

    // Get Live Ads
    app.get('/api/ads/live', (req, res) => {
        try {
            if (!fs.existsSync(ADS_FILE)) {
                return res.json([]);
            }
            const ads = readJSON(ADS_FILE) || [];
            const liveAds = ads.filter(a => a.status === 'approved');
            res.json(liveAds);
        } catch (err) {
            console.error('Get ads error:', err);
            res.json([]);
        }
    });

    // Get All Ads (for admin)
    app.get('/api/ads/all', (req, res) => {
        try {
            if (!fs.existsSync(ADS_FILE)) {
                return res.json([]);
            }
            const ads = readJSON(ADS_FILE) || [];
            res.json(ads);
        } catch (err) {
            console.error('Get all ads error:', err);
            res.json([]);
        }
    });
};
