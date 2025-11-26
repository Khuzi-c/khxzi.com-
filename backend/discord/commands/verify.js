const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const STAFF_ROLES = ['1418550771426791535', '1418550773150781462', '1418691698959323239'];
const VERIFIED_ROLE_ID = '1418691690494955600';
const UNVERIFIED_ROLE_ID = '1418691687923843194';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Verification management (Staff only)')
        .addSubcommand(subcommand =>
            subcommand
                .setName('approve')
                .setDescription('Verify a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to verify')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('revoke')
                .setDescription('Revoke verification')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to unverify')
                        .setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction) {
        const hasStaffRole = interaction.member.roles.cache.some(role => STAFF_ROLES.includes(role.id));
        if (!hasStaffRole) {
            return interaction.reply({ content: 'You do not have permission!', ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'approve') {
            await approveVerification(interaction);
        } else if (subcommand === 'revoke') {
            await revokeVerification(interaction);
        }
    }
};

async function approveVerification(interaction) {
    const user = interaction.options.getUser('user');
    const member = await interaction.guild.members.fetch(user.id);

    try {
        await member.roles.add(VERIFIED_ROLE_ID);
        await member.roles.remove(UNVERIFIED_ROLE_ID);

        await interaction.reply(`✅ ${user.tag} has been verified!`);

        // Log action
        const { logAction } = require('../../discord');
        await logAction('User Verified', `${user.tag} verified`, {
            staff: interaction.user.tag
        });
    } catch (err) {
        console.error('Verification error:', err);
        await interaction.reply({ content: 'Failed to verify user!', ephemeral: true });
    }
}

async function revokeVerification(interaction) {
    const user = interaction.options.getUser('user');
    const member = await interaction.guild.members.fetch(user.id);

    try {
        await member.roles.remove(VERIFIED_ROLE_ID);
        await member.roles.add(UNVERIFIED_ROLE_ID);

        await interaction.reply(`❌ ${user.tag}'s verification has been revoked!`);

        // Log action
        const { logAction } = require('../../discord');
        await logAction('Verification Revoked', `${user.tag} unverified`, {
            staff: interaction.user.tag
        });
    } catch (err) {
        console.error('Revoke error:', err);
        await interaction.reply({ content: 'Failed to revoke verification!', ephemeral: true });
    }
}
