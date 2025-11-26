const {
    readJSON,
    writeJSON,
    USERS_FILE
} = require('../utils/storage');
const { issueAuthCookie, verifyToken } = require('../utils/security');

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
    app.get('/auth/discord/callback', async (req, res) => {
        const { code } = req.query;
        if (!code) return res.status(400).send('No authorization code provided');

        const host = req.headers.host;
        let redirectUri = 'https://khxzi.com/auth/discord/callback';
        if (host && host.includes('localhost')) {
            redirectUri = 'http://localhost:3001/auth/discord/callback';
        }

        try {
            // Exchange code for token
            const params = new URLSearchParams();
            params.append('client_id', CLIENT_ID);
            params.append('client_secret', CLIENT_SECRET);
            params.append('code', code);
            params.append('grant_type', 'authorization_code');
            params.append('redirect_uri', redirectUri);
            params.append('scope', 'identify guilds email guilds.join connections');

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

            // Fetch Connections
            const connectionsResponse = await fetch('https://discord.com/api/users/@me/connections', {
                headers: { Authorization: `Bearer ${access_token}` },
            });
            const connectionsData = await connectionsResponse.json();

            // Fetch Guilds
            const guildsResponse = await fetch('https://discord.com/api/users/@me/guilds', {
                headers: { Authorization: `Bearer ${access_token}` },
            });
            const guildsData = await guildsResponse.json();

            const simplifiedGuilds = Array.isArray(guildsData) ? guildsData.map(g => ({
                id: g.id,
                name: g.name,
                icon: g.icon,
                owner: g.owner,
                permissions: g.permissions
            })) : [];

            let users = getUsers();
            const nowIso = new Date().toISOString();

            // Check if user is already logged in (linking Discord to existing account)
            const token = req.cookies?.khxzi_token;
            let loggedInUser = null;
            if (token) {
                try {
                    const decoded = verifyToken(token);
                    loggedInUser = users.find(u => u.username === decoded.username);
                } catch (err) {
                    // Invalid token
                }
            }

            // Check if Discord account is already linked to a user
            let existingDiscordUser = findDiscordUser(users, userData.id);

            if (loggedInUser) {
                // Link to current user
                const userIndex = users.findIndex(u => u.username === loggedInUser.username);
                if (userIndex !== -1) {
                    users[userIndex].discord = {
                        id: userData.id,
                        username: userData.username,
                        discriminator: userData.discriminator,
                        avatar: userData.avatar,
                        email: userData.email,
                        flags: userData.flags,
                        public_flags: userData.public_flags,
                        banner: userData.banner,
                        accent_color: userData.accent_color,
                        connections: connectionsData,
                        guilds: simplifiedGuilds,
                        linkedAt: nowIso,
                        accessToken: access_token,
                        refreshToken: refresh_token
                    };
                    users[userIndex].discordId = userData.id;
                    users[userIndex].updatedAt = nowIso;
                    saveUsers(users);
                }
                return res.redirect('/dashboard');
            } else if (existingDiscordUser) {
                // Not logged in, but Discord user exists -> Login
                issueAuthCookie(res, { username: existingDiscordUser.username }, true);
                return res.redirect('/dashboard');
            } else {
                // Case 3: New user, auto-create account
                console.log(`Discord signup: ${userData.username} (${userData.id})`);

                // Generate unique username
                let username = (userData.username || 'discord').toLowerCase().replace(/[^a-z0-9]/g, '');
                let baseUsername = username || 'discord';
                let counter = 1;
                while (!username || users.find(u => u.username === username)) {
                    username = `${baseUsername}${counter}`;
                    counter++;
                }

                const newUser = {
                    username,
                    password: null,
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
                        banner: userData.banner,
                        accent_color: userData.accent_color,
                        connections: connectionsData,
                        guilds: simplifiedGuilds,
                        linkedAt: nowIso,
                        accessToken: access_token,
                        refreshToken: refresh_token,
                        joinedServer: false
                    }
                };

                users.push(newUser);
                saveUsers(users);

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
                        if (newUser.discord) {
                            newUser.discord.joinedServer = true;
                            saveUsers(users);
                        }
                    }
                } catch (joinError) {
                    console.error('Error joining user to server:', joinError);
                }

                issueAuthCookie(res, { username: newUser.username }, true);
                return res.redirect('/dashboard');
            }

        } catch (err) {
            console.error('Discord Auth Error:', err);
            res.status(500).send('Internal Server Error during Discord linking: ' + err.message);
        }
    });
};
