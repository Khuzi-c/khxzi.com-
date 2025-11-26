const { readJSON, writeJSON } = require('../utils/storage');
const path = require('path');
const { assignVerifiedRole } = require('../discord');

const VERIFICATION_FILE = path.join(__dirname, '../data/verification.json');
const CLIENT_ID = '1442843317590036562';
const CLIENT_SECRET = 'd8xi85hNjzpwlL3sR5ruQl7Oxm2BdGK7';

module.exports = function (app, io) {
    // Initiate Verification Login
    app.get('/api/verify/login', (req, res) => {
        const host = req.headers.host;
        let redirectUri = 'https://khxzi.com/api/verify/callback';
        if (host && host.includes('localhost')) {
            redirectUri = 'http://localhost:3001/api/verify/callback';
        }

        const scope = 'identify guilds.join';
        const authUrl = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;
        res.redirect(authUrl);
    });

    // Verification Callback
    app.get('/api/verify/callback', async (req, res) => {
        const { code } = req.query;
        if (!code) return res.redirect('/verify?error=NoCode');

        const host = req.headers.host;
        let redirectUri = 'https://khxzi.com/api/verify/callback';
        if (host && host.includes('localhost')) {
            redirectUri = 'http://localhost:3001/api/verify/callback';
        }

        try {
            // Exchange code
            const params = new URLSearchParams();
            params.append('client_id', CLIENT_ID);
            params.append('client_secret', CLIENT_SECRET);
            params.append('code', code);
            params.append('grant_type', 'authorization_code');
            params.append('redirect_uri', redirectUri);

            const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params
            });
            const tokenData = await tokenResponse.json();
            if (tokenData.error) throw new Error(tokenData.error_description);

            // Get User Info
            const userResponse = await fetch('https://discord.com/api/users/@me', {
                headers: { Authorization: `Bearer ${tokenData.access_token}` }
            });
            const userData = await userResponse.json();

            // Assign Role
            const success = await assignVerifiedRole(userData.id);

            // Save Record
            const records = readJSON(VERIFICATION_FILE) || [];
            const existingIndex = records.findIndex(r => r.discordId === userData.id);
            const record = {
                discordId: userData.id,
                username: userData.username,
                verifiedAt: new Date().toISOString(),
                status: success ? 'verified' : 'failed_role_assignment'
            };

            if (existingIndex !== -1) {
                records[existingIndex] = record;
            } else {
                records.push(record);
            }
            writeJSON(VERIFICATION_FILE, records);

            if (success) {
                res.redirect('/verify?status=success&username=' + userData.username);
            } else {
                res.redirect('/verify?status=failed&error=RoleAssignmentFailed');
            }

        } catch (err) {
            console.error('Verification Error:', err);
            res.redirect('/verify?status=error&message=' + encodeURIComponent(err.message));
        }
    });
};
