const { readJSON, writeJSON } = require('../utils/storage');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const PREMIUM_FILE = path.join(__dirname, '../data/premium.json');
const KEYS_FILE = path.join(__dirname, '../data/premium_keys.json');

const getPremiumUsers = () => readJSON(PREMIUM_FILE) || [];
const savePremiumUsers = (users) => writeJSON(PREMIUM_FILE, users);
const getPremiumKeys = () => readJSON(KEYS_FILE) || [];
const savePremiumKeys = (keys) => writeJSON(KEYS_FILE, keys);

function generateKey() {
    return crypto.randomBytes(8).toString('hex').toUpperCase();
}

module.exports = function (app, io, discordClient) {
    // Generate Premium Key
    app.post('/api/premium/generate-key', async (req, res) => {
        try {
            const { duration } = req.body;
            if (!duration) {
                return res.status(400).json({ error: 'Duration required' });
            }
            const key = generateKey();
            const keys = getPremiumKeys();
            const newKey = {
                key,
                duration,
                created_at: new Date().toISOString(),
                status: 'unused',
                used_by: null,
                used_at: null
            };
            keys.push(newKey);
            savePremiumKeys(keys);
            res.json({ success: true, key: newKey });
        } catch (err) {
            console.error('Key generation error:', err);
            res.status(500).json({ error: 'Server error' });
        }
    });

    // Activate Premium (Discord UID)
    app.post('/api/premium/activate', async (req, res) => {
        try {
            const { key, discordId } = req.body;
            if (!key || !discordId) {
                return res.status(400).json({ error: 'Key and Discord ID required' });
            }
            let keys = getPremiumKeys();
            if (!Array.isArray(keys)) keys = [];
            const premiumUsers = getPremiumUsers();
            const keyObj = keys.find(k => k.key === key && k.status === 'unused');
            if (!keyObj) {
                return res.status(404).json({ error: 'Invalid or already used key' });
            }
            const now = new Date();
            const duration = keyObj.duration;
            let expiryDate = new Date(now);
            if (duration.endsWith('d')) {
                expiryDate.setDate(expiryDate.getDate() + parseInt(duration));
            } else if (duration.endsWith('m')) {
                expiryDate.setMonth(expiryDate.getMonth() + parseInt(duration));
            } else if (duration.endsWith('y')) {
                expiryDate.setFullYear(expiryDate.getFullYear() + parseInt(duration));
            }
            // Mark key used
            keyObj.status = 'used';
            keyObj.used_by = discordId;
            keyObj.used_at = now.toISOString();
            savePremiumKeys(keys);
            // Add premium user record
            const premiumUser = {
                discordId,
                key,
                activated_at: now.toISOString(),
                expires_at: expiryDate.toISOString(),
                active: true
            };
            premiumUsers.push(premiumUser);
            savePremiumUsers(premiumUsers);
            // Discord notification
            if (discordClient) {
                try {
                    const { EmbedBuilder } = require('discord.js');
                    const LOG_CHANNEL_ID = process.env.DISCORD_LOG_CHANNEL_ID;
                    if (LOG_CHANNEL_ID) {
                        const channel = await discordClient.channels.fetch(LOG_CHANNEL_ID);
                        const embed = new EmbedBuilder()
                            .setTitle('💎 Premium Activated')
                            .setDescription(`Discord ID: ${discordId}`)
                            .addFields(
                                { name: 'Duration', value: duration, inline: true },
                                { name: 'Expires', value: expiryDate.toLocaleDateString(), inline: true }
                            )
                            .setColor('#FFD700')
                            .setTimestamp();
                        await channel.send({ embeds: [embed] });
                    }
                } catch (e) {
                    console.error('Discord notification error:', e);
                }
            }
            res.json({ success: true, message: 'Premium activated successfully!', expires_at: expiryDate.toISOString() });
        } catch (err) {
            console.error('Premium activation error:', err);
            res.status(500).json({ error: 'Server error' });
        }
    });

    // Get Premium Keys
    app.get('/api/premium/keys', (req, res) => {
        const keys = getPremiumKeys();
        res.json(keys);
    });

    // Get Premium Users
    app.get('/api/premium/users', (req, res) => {
        const users = getPremiumUsers();
        res.json(users);
    });
};
