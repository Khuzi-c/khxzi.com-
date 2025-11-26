const {
    readJSON,
    writeJSON,
    USERS_FILE
} = require('../utils/storage');
const { issueAuthCookie } = require('../utils/security');

const CLIENT_ID = '1442843317590036562';
const CLIENT_SECRET = 'd8xi85hNjzpwlL3sR5ruQl7Oxm2BdGK7';
const BOT_TOKEN = 'MTQ0Mjg0MzMxNzU5MDAzNjU2Mg.G2ZC7D.jWIt6OD07bjxcxFO1nskWQG4Yu4f83LXubX0yw';
const GUILD_ID = '1418226394495713426';

const getUsers = () => readJSON(USERS_FILE).users || [];
const saveUsers = (users) => writeJSON(USERS_FILE, { users });

const findDiscordUser = (users, discordId) => users.find(u => {
    return u.discordId === discordId || u.discord?.id === discordId;
});

module.exports = function (app) {
    // Initiate Discord OAuth for Login/Signup
    app.get('/auth/discord/login', (req, res) => {
        const host = req.headers.host;
        let redirectUri = 'https://khxzi.com/auth/discord/login/callback';
        if (host && host.includes('localhost')) {
            redirectUri = 'http://localhost:3001/auth/discord/login/callback';
        }

        const scope = 'identify email guilds.join';
        const authUrl = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;

        res.redirect(authUrl);
    });

    // Discord OAuth Callback for Login/Signup
    app.get('/auth/discord/login/callback', async (req, res) => {
        const { code } = req.query;
        if (!code) return res.status(400).send('No authorization code provided');

        const host = req.headers.host;
        let redirectUri = 'https://khxzi.com/auth/discord/login/callback';
        if (host && host.includes('localhost')) {
            redirectUri = 'http://localhost:3001/auth/discord/login/callback';
        }

        try {
            // Exchange code for token
            const params = new URLSearchParams();
            params.append('client_id', CLIENT_ID);
            params.append('client_secret', CLIENT_SECRET);
            params.append('code', code);
            params.append('grant_type', 'authorization_code');
            params.append('redirect_uri', redirectUri);
            params.append('scope', 'identify email guilds.join');

            const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: params,
            });

            const tokenData = await tokenResponse.json();
            if (tokenData.error) {
                console.error('Discord Token Error:', tokenData);
                return res.status(400).send('Failed to authenticate with Discord: ' + JSON.stringify(tokenData));
            }

            const { access_token, refresh_token } = tokenData;

            // Fetch User Info
            const userResponse = await fetch('https://discord.com/api/users/@me', {
                headers: { Authorization: `Bearer ${access_token}` },
            });
            const userData = await userResponse.json();

            let users = getUsers();
            let user = findDiscordUser(users, userData.id);
            const nowIso = new Date().toISOString();

            if (user) {
                // Existing user - Login
                console.log(`Discord login: ${userData.username} (${userData.id})`);
            } else {
                // New user - Signup
                console.log(`Discord signup: ${userData.username} (${userData.id})`);

                // Generate unique username
                let username = (userData.username || 'discord').toLowerCase().replace(/[^a-z0-9]/g, '');
                let baseUsername = username || 'discord';
                let counter = 1;
                while (!username || users.find(u => u.username === username)) {
                    username = `${baseUsername}${counter}`;
                    counter++;
                }

                user = {
                    username,
                    password: null, // No password for Discord-only accounts
                    authProvider: 'discord',
                    discordId: userData.id,
                    email: userData.email || '',
                    avatar: userData.avatar ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png` : '',
                    bio: '',
                    links: [],
                    theme: 'red-black',
                    createdAt: nowIso,
                    updatedAt: nowIso,
                    discord: {
                        id: userData.id,
                        username: userData.username,
                        discriminator: userData.discriminator,
                        avatar: userData.avatar,
                        email: userData.email,
                        flags: userData.flags,
                        public_flags: userData.public_flags,
                        accessToken: access_token,
                        refreshToken: refresh_token,
                        joinedServer: false,
                        linkedAt: nowIso
                    }
                };

                users.push(user);
            }

            // Ensure discord info stays fresh
            user.discord = {
                ...(user.discord || {}),
                id: userData.id,
                username: userData.username,
                discriminator: userData.discriminator,
                avatar: userData.avatar,
                email: userData.email,
                flags: userData.flags,
                public_flags: userData.public_flags,
                accessToken: access_token,
                refreshToken: refresh_token,
                linkedAt: user.discord?.linkedAt || nowIso
            };
            user.discordId = user.discord.id;
            user.updatedAt = nowIso;

            // Auto-join user to Discord server
            try {
                const joinResponse = await fetch(`https://discord.com/api/guilds/${GUILD_ID}/members/${userData.id}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bot ${BOT_TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        access_token: access_token
                    })
                });

                if (joinResponse.ok || joinResponse.status === 204) {
                    console.log(`Successfully added ${userData.username} to server ${GUILD_ID}`);
                    if (user.discord) {
                        user.discord.joinedServer = true;
                        user.discord.accessToken = access_token;
                        user.discord.refreshToken = refresh_token;
                    }
                } else {
                    const errorData = await joinResponse.json();
                    console.error('Failed to add user to server:', errorData);
                    // Don't fail login if server join fails
                }
            } catch (joinError) {
                console.error('Error joining user to server:', joinError);
                // Don't fail login if server join fails
            }

            saveUsers(users);

            // Issue JWT token using shared security helper
            issueAuthCookie(res, { username: user.username }, true);

            // Redirect to dashboard
            res.redirect('/dashboard');

        } catch (err) {
            console.error('Discord Auth Error:', err);
            res.status(500).send('Internal Server Error during Discord authentication: ' + err.message);
        }
    });

    // Generic Discord OAuth Callback (fallback for /auth/discord/callback)
    app.get('/auth/discord/callback', async (req, res) => {
        // Redirect to the login callback handler
        const code = req.query.code;
        if (code) {
            res.redirect(`/auth/discord/login/callback?code=${encodeURIComponent(code)}`);
        } else {
            res.status(400).send('No authorization code provided');
        }
    });
};
