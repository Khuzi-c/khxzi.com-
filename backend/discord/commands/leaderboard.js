const { SlashCommandBuilder } = require('discord.js');
const { readJSON } = require('../../utils/storage');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Show top users by XP, coins, and badges'),

    async execute(interaction) {
        try {
            const LEVELS_FILE = path.join(__dirname, '../../data/levels.json');
            const levels = readJSON(LEVELS_FILE) || [];

            if (levels.length === 0) {
                return interaction.reply('No users found on the leaderboard yet!');
            }

            // Sort by XP
            const topUsers = levels.sort((a, b) => b.xp - a.xp).slice(0, 10);

            let leaderboard = '🏆 **Top 10 Users**\n\n';
            topUsers.forEach((user, index) => {
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                leaderboard += `${medal} **${user.username}** - Level ${user.level} (${user.xp} XP, ${user.coins} coins)\n`;
            });

            await interaction.reply(leaderboard);
        } catch (err) {
            console.error('Leaderboard error:', err);
            await interaction.reply('Failed to fetch leaderboard.');
        }
    }
};
