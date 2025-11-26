const { SlashCommandBuilder } = require('discord.js');
const { readJSON } = require('../../utils/storage');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('Show user profile stats')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('Username to lookup')
                .setRequired(true)),

    async execute(interaction) {
        try {
            const username = interaction.options.getString('username');
            const LEVELS_FILE = path.join(__dirname, '../../data/levels.json');
            const PREMIUM_FILE = path.join(__dirname, '../../data/premium.json');

            const levelsData = readJSON(LEVELS_FILE);
            const levels = Array.isArray(levelsData) ? levelsData : (levelsData.users || []);

            const premiumData = readJSON(PREMIUM_FILE);
            const premium = Array.isArray(premiumData) ? premiumData : (premiumData.users || []);

            const userStats = levels.find(u => u.username.toLowerCase() === username.toLowerCase());
            const isPremium = premium.find(p => p.username.toLowerCase() === username.toLowerCase() && p.active);

            if (!userStats) {
                return interaction.reply(`User **${username}** not found!`);
            }

            let profile = `👤 **Profile: ${userStats.username}**\n\n`;
            profile += `📊 Level: **${userStats.level}**\n`;
            profile += `⭐ XP: **${userStats.xp}**\n`;
            profile += `💰 Coins: **${userStats.coins}**\n`;
            profile += `🏅 Badges: **${userStats.badges.length > 0 ? userStats.badges.join(', ') : 'None'}**\n`;
            profile += `🌟 Premium: **${isPremium ? 'Yes' : 'No'}**\n`;

            if (isPremium) {
                profile += `⏰ Expires: **${new Date(isPremium.expiry_date).toLocaleDateString()}**\n`;
            }

            await interaction.reply(profile);
        } catch (err) {
            console.error('Profile error:', err);
            await interaction.reply('Failed to fetch profile.');
        }
    }
};
