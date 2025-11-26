const { SlashCommandBuilder } = require('discord.js');
const { readJSON, writeJSON } = require('../../utils/storage');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('redeem')
        .setDescription('Redeem a special code for rewards')
        .addStringOption(option =>
            option.setName('code')
                .setDescription('Redeem code')
                .setRequired(true)),

    async execute(interaction) {
        const code = interaction.options.getString('code').toUpperCase();
        const userId = interaction.user.id;
        const username = interaction.user.username;

        const LEVELS_FILE = path.join(__dirname, '../../data/levels.json');
        const REDEEMED_FILE = path.join(__dirname, '../../data/redeemed.json');

        let levels = readJSON(LEVELS_FILE) || [];
        let redeemed = readJSON(REDEEMED_FILE) || {};

        // Check if user already redeemed this code
        if (redeemed[userId]?.includes(code)) {
            return interaction.reply({ content: 'You have already redeemed this code!', flags: 64 });
        }

        // Special codes
        const codes = {
            'OG-KHXZI': {
                badge: 'OG Member',
                xp: 500,
                coins: 100,
                message: '🎉 **OG Badge Unlocked!** You are now an OG member of Khxzi!'
            },
            'BETA-TESTER': {
                badge: 'Beta Tester',
                xp: 250,
                coins: 50,
                message: '🧪 **Beta Tester Badge Unlocked!** Thank you for testing!'
            },
            'EARLY-BIRD': {
                badge: 'Early Bird',
                xp: 100,
                coins: 25,
                message: '🐦 **Early Bird Badge Unlocked!** You were here early!'
            }
        };

        const reward = codes[code];

        if (!reward) {
            return interaction.reply({ content: 'Invalid redeem code!', flags: 64 });
        }

        // Find or create user
        let userIndex = levels.findIndex(u => u.username === username);
        if (userIndex === -1) {
            levels.push({
                username,
                xp: 0,
                level: 1,
                coins: 0,
                badges: []
            });
            userIndex = levels.length - 1;
        }

        // Add rewards
        levels[userIndex].xp += reward.xp;
        levels[userIndex].coins += reward.coins;

        if (!levels[userIndex].badges.includes(reward.badge)) {
            levels[userIndex].badges.push(reward.badge);
        }

        // Update level
        levels[userIndex].level = Math.floor(1 + Math.sqrt(levels[userIndex].xp / 100));

        // Mark as redeemed
        if (!redeemed[userId]) redeemed[userId] = [];
        redeemed[userId].push(code);

        writeJSON(LEVELS_FILE, levels);
        writeJSON(REDEEMED_FILE, redeemed);

        await interaction.reply(`${reward.message}\n+${reward.xp} XP, +${reward.coins} coins`);

        // Log action
        const { logAction } = require('../../discord');
        await logAction('Code Redeemed', `${username} redeemed ${code}`, {
            user: username
        });
    }
};
