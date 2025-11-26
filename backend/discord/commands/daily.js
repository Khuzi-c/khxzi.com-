const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { readJSON, writeJSON } = require('../../utils/storage');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Award daily XP and coins to a user (Staff only)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to award')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        try {
            const targetUser = interaction.options.getUser('user');
            const LEVELS_FILE = path.join(__dirname, '../../data/levels.json');
            const DAILY_FILE = path.join(__dirname, '../../data/daily.json');

            let levels = readJSON(LEVELS_FILE) || [];
            let dailyLog = readJSON(DAILY_FILE) || {};

            // Check if user already claimed today
            const today = new Date().toDateString();
            if (dailyLog[targetUser.id] === today) {
                return interaction.reply(`${targetUser.username} has already claimed their daily reward today!`);
            }

            // Find or create user
            let userIndex = levels.findIndex(u => u.username === targetUser.username);
            if (userIndex === -1) {
                levels.push({
                    username: targetUser.username,
                    xp: 0,
                    level: 1,
                    coins: 0,
                    badges: []
                });
                userIndex = levels.length - 1;
            }

            // Award daily rewards
            const dailyXP = 50;
            const dailyCoins = 10;

            levels[userIndex].xp += dailyXP;
            levels[userIndex].coins += dailyCoins;

            // Update level
            levels[userIndex].level = Math.floor(1 + Math.sqrt(levels[userIndex].xp / 100));

            // Save
            writeJSON(LEVELS_FILE, levels);
            dailyLog[targetUser.id] = today;
            writeJSON(DAILY_FILE, dailyLog);

            await interaction.reply(`🎁 **${targetUser.username}** received their daily reward!\n+${dailyXP} XP, +${dailyCoins} coins`);

            // Log action
            logAction(interaction.guild, 'Daily Reward', `${interaction.user.tag} awarded daily to ${targetUser.tag}`);
        } catch (err) {
            console.error('Daily error:', err);
            await interaction.reply('Failed to award daily reward.');
        }
    }
};

function logAction(guild, action, details) {
    const LOG_CHANNEL_ID = '1418691746816196738'; // Support channel for logs
    const channel = guild.channels.cache.get(LOG_CHANNEL_ID);
    if (channel) {
        channel.send(`📝 **${action}**: ${details}`);
    }
}
