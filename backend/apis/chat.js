const { readJSON, writeJSON } = require('../utils/storage');
const path = require('path');
require('dotenv').config();

const CHAT_FILE = path.join(__dirname, '../data/chat.json');

const getMessages = () => readJSON(CHAT_FILE) || [];
const saveMessages = (messages) => writeJSON(CHAT_FILE, messages);

// Helper to get or create webhook
async function getWebhook(client) {
    try {
        const LOG_CHANNEL_ID = process.env.DISCORD_LOG_CHANNEL_ID;
        if (!LOG_CHANNEL_ID || !client) return null;

        const channel = await client.channels.fetch(LOG_CHANNEL_ID);
        if (!channel) return null;

        const webhooks = await channel.fetchWebhooks();
        let webhook = webhooks.find(wh => wh.owner.id === client.user.id);

        if (!webhook) {
            webhook = await channel.createWebhook({
                name: 'Khxzi Chat Logger',
                avatar: 'https://khxzi.com/assets/khxzilogo.png',
            });
        }
        return webhook;
    } catch (err) {
        console.error('Error fetching webhook:', err);
        return null;
    }
}

module.exports = function (app, io, discordClient) {

    // Send Message
    app.post('/api/chat/send', async (req, res) => {
        try {
            const { username, message, discordName } = req.body;

            if (!username || !message) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            const messages = getMessages();
            const newMessage = {
                id: Date.now().toString(),
                username,
                discordName: discordName || null,
                message,
                timestamp: new Date().toISOString()
            };

            messages.push(newMessage);

            // Keep only last 500 messages
            if (messages.length > 500) {
                messages.shift();
            }

            saveMessages(messages);

            // Broadcast via Socket.io
            if (io) {
                io.emit('chat_message', newMessage);
            }

            // Send to Discord via webhook
            if (discordClient) {
                const webhook = await getWebhook(discordClient);
                if (webhook) {
                    try {
                        const displayName = discordName || `${username} (Website-Unauthorized)`;
                        await webhook.send({
                            content: message,
                            username: displayName
                        });
                    } catch (err) {
                        console.error('Discord webhook error:', err);
                    }
                }
            }

            res.json({ success: true, message: newMessage });
        } catch (err) {
            console.error('Chat send error:', err);
            res.status(500).json({ error: 'Server error' });
        }
    });

    // Get Recent Messages
    app.get('/api/chat/messages', (req, res) => {
        const messages = getMessages();
        const recent = messages.slice(-100); // Last 100 messages
        res.json(recent);
    });

    // Delete Message (Admin)
    app.delete('/api/chat/delete/:messageId', (req, res) => {
        try {
            const { messageId } = req.params;
            const messages = getMessages();
            const filtered = messages.filter(m => m.id !== messageId);
            saveMessages(filtered);

            if (io) {
                io.emit('message_deleted', messageId);
            }

            res.json({ success: true });
        } catch (err) {
            console.error('Delete message error:', err);
            res.status(500).json({ error: 'Server error' });
        }
    });
};
