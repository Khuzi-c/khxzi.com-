const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { readJSON, writeJSON } = require('../../utils/storage');
const path = require('path');

const OWNER_ID = '1342119031552872489';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('announce')
        .setDescription('Send announcement to all users (Owner only)')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Announcement message')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('title')
                .setDescription('Announcement title')
                .setRequired(false)),

    async execute(interaction) {
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({ content: 'Only the owner can use this command!', flags: 64 });
        }

        const message = interaction.options.getString('message');
        const title = interaction.options.getString('title') || '📢 Announcement';

        const NOTIFICATIONS_FILE = path.join(__dirname, '../../data/notifications.json');
        let notifications = readJSON(NOTIFICATIONS_FILE) || [];

        const notification = {
            id: Date.now().toString(),
            title,
            message,
            created_at: new Date().toISOString(),
            created_by: interaction.user.tag
        };

        notifications.push(notification);
        writeJSON(NOTIFICATIONS_FILE, notifications);

        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(message)
            .setColor('#FF0000')
            .setFooter({ text: `Announced by ${interaction.user.tag}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], content: '✅ Announcement sent to all users!' });

        // Log action
        const { logAction } = require('../../discord');
        await logAction('Announcement Created', `Title: ${title}`, {
            staff: interaction.user.tag,
            message
        });
    }
};
