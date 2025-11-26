const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { readJSON, writeJSON } = require('../../utils/storage');
const path = require('path');

const STAFF_ROLES = ['1418550771426791535', '1418550773150781462', '1418691698959323239'];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('user')
        .setDescription('User management commands (Staff only)')
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Show user information')
                .addStringOption(option =>
                    option.setName('username')
                        .setDescription('Username to lookup')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('ban')
                .setDescription('Ban a user')
                .addStringOption(option =>
                    option.setName('username')
                        .setDescription('Username to ban')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('unban')
                .setDescription('Unban a user')
                .addStringOption(option =>
                    option.setName('username')
                        .setDescription('Username to unban')
                        .setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        const hasStaffRole = interaction.member.roles.cache.some(role => STAFF_ROLES.includes(role.id));
        if (!hasStaffRole) {
            return interaction.reply({ content: 'You do not have permission!', flags: 64 });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'info') {
            await userInfo(interaction);
        } else if (subcommand === 'ban') {
            await banUser(interaction);
        } else if (subcommand === 'unban') {
            await unbanUser(interaction);
        }
    }
};

async function userInfo(interaction) {
    const username = interaction.options.getString('username');

    const USERS_FILE = path.join(__dirname, '../../data/users.json');
    const LEVELS_FILE = path.join(__dirname, '../../data/levels.json');
    const PREMIUM_FILE = path.join(__dirname, '../../data/premium.json');

    const usersData = readJSON(USERS_FILE);
    const levels = readJSON(LEVELS_FILE) || [];
    const premium = readJSON(PREMIUM_FILE) || [];

    // Add null checks for username
    const user = usersData?.users?.find(u => u.username && u.username.toLowerCase() === username.toLowerCase());
    const userStats = levels.find(u => u.username && u.username.toLowerCase() === username.toLowerCase());
    const isPremium = premium.find(p => p.username && p.username.toLowerCase() === username.toLowerCase() && p.active);

    if (!user) {
        return interaction.reply({ content: `User **${username}** not found!`, flags: 64 });
    }

    let info = `👤 **User Information: ${user.username}**\n\n`;
    info += `📧 Created: ${new Date(user.createdAt).toLocaleDateString()}\n`;
    info += `🎨 Theme: ${user.theme}\n`;
    info += `🔗 Links: ${user.links?.length || 0}\n\n`;

    if (userStats) {
        info += `📊 **Stats:**\n`;
        info += `Level: **${userStats.level}**\n`;
        info += `XP: **${userStats.xp}**\n`;
        info += `Coins: **${userStats.coins}**\n`;
        info += `Badges: **${userStats.badges.length}**\n\n`;
    }

    info += `🌟 Premium: **${isPremium ? 'Yes' : 'No'}**\n`;
    if (isPremium) {
        info += `Expires: ${new Date(isPremium.expiry_date).toLocaleDateString()}\n`;
    }

    await interaction.reply(info);
}

async function banUser(interaction) {
    const username = interaction.options.getString('username');

    const BANNED_FILE = path.join(__dirname, '../../data/banned.json');
    let banned = readJSON(BANNED_FILE) || [];

    if (banned.includes(username.toLowerCase())) {
        return interaction.reply({ content: 'User is already banned!', flags: 64 });
    }

    banned.push(username.toLowerCase());
    writeJSON(BANNED_FILE, banned);

    await interaction.reply(`✅ User **${username}** has been banned!`);

    // Log action
    const { logAction } = require('../../discord');
    await logAction('User Banned', `User: ${username}`, {
        staff: interaction.user.tag
    });
}

async function unbanUser(interaction) {
    const username = interaction.options.getString('username');

    const BANNED_FILE = path.join(__dirname, '../../data/banned.json');
    let banned = readJSON(BANNED_FILE) || [];

    const index = banned.indexOf(username.toLowerCase());
    if (index === -1) {
        return interaction.reply({ content: 'User is not banned!', flags: 64 });
    }

    banned.splice(index, 1);
    writeJSON(BANNED_FILE, banned);

    await interaction.reply(`✅ User **${username}** has been unbanned!`);

    // Log action
    const { logAction } = require('../../discord');
    await logAction('User Unbanned', `User: ${username}`, {
        staff: interaction.user.tag
    });
}
