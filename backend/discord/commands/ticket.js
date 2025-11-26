const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');

const TICKET_CATEGORY_ID = '1435626192341569556';
const STAFF_ROLES = ['1418550771426791535', '1418550773150781462', '1418691698959323239'];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Ticket management (Staff only)')
        .addSubcommand(subcommand =>
            subcommand
                .setName('close')
                .setDescription('Close the current ticket channel')),

    async execute(interaction) {
        const hasStaffRole = interaction.member.roles.cache.some(role => STAFF_ROLES.includes(role.id));

        if (interaction.options.getSubcommand() === 'close') {
            if (!hasStaffRole) {
                return interaction.reply({ content: 'Only staff can close tickets!', flags: 64 });
            }

            if (!interaction.channel.name.startsWith('ticket-')) {
                return interaction.reply({ content: 'This is not a ticket channel!', flags: 64 });
            }

            const embed = new EmbedBuilder()
                .setTitle('🎫 Ticket Closed')
                .setDescription(`Ticket closed by ${interaction.user.tag}`)
                .setColor('#FF0000')
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            setTimeout(async () => {
                await interaction.channel.delete();
            }, 5000);

            // Log action
            const { logAction } = require('../../discord');
            await logAction('Ticket Closed', `Channel ${interaction.channel.name} closed`, {
                staff: interaction.user.tag
            });
        }
    }
};

// Function to create ticket from website
async function createTicketChannel(client, userId, username, category, subject) {
    try {
        const guild = await client.guilds.fetch('1418226394495713426');
        const member = await guild.members.fetch(userId);

        // Create channel
        const channel = await guild.channels.create({
            name: `ticket-${username}-${Date.now()}`,
            type: ChannelType.GuildText,
            parent: TICKET_CATEGORY_ID,
            permissionOverwrites: [
                {
                    id: guild.id,
                    deny: ['ViewChannel']
                },
                {
                    id: userId,
                    allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
                },
                ...STAFF_ROLES.map(roleId => ({
                    id: roleId,
                    allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageMessages']
                }))
            ]
        });

        // Send welcome message
        const embed = new EmbedBuilder()
            .setTitle('🎫 Support Ticket')
            .setDescription(`**Category:** ${category}\n**Subject:** ${subject}\n\nA staff member will assist you shortly.`)
            .setColor('#FF0000')
            .setFooter({ text: `Ticket for ${username}` })
            .setTimestamp();

        await channel.send({ content: `<@${userId}>`, embeds: [embed] });

        // Log action
        const { logAction } = require('../../discord');
        await logAction('Ticket Created', `Ticket channel created for ${username}`, {
            user: username,
            category,
            subject
        });

        return channel.id;
    } catch (err) {
        console.error('Create ticket error:', err);
        return null;
    }
}

module.exports.createTicketChannel = createTicketChannel;
