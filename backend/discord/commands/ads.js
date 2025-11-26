const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { readJSON, writeJSON } = require('../../utils/storage');
const path = require('path');

const STAFF_ROLES = ['1418550771426791535', '1418550773150781462', '1418691698959323239'];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ads')
        .setDescription('Ads management commands (Staff only)')
        .addSubcommand(subcommand =>
            subcommand
                .setName('approve')
                .setDescription('Approve an ad')
                .addStringOption(option =>
                    option.setName('adid')
                        .setDescription('Ad ID to approve')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('decline')
                .setDescription('Decline an ad')
                .addStringOption(option =>
                    option.setName('adid')
                        .setDescription('Ad ID to decline')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for declining')
                        .setRequired(false)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        const hasStaffRole = interaction.member.roles.cache.some(role => STAFF_ROLES.includes(role.id));
        if (!hasStaffRole) {
            return interaction.reply({ content: 'You do not have permission!', ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'approve') {
            await approveAd(interaction);
        } else if (subcommand === 'decline') {
            await declineAd(interaction);
        }
    }
};

async function approveAd(interaction) {
    const adId = interaction.options.getString('adid');

    const ADS_FILE = path.join(__dirname, '../../data/ads.json');
    let ads = readJSON(ADS_FILE) || [];

    const adIndex = ads.findIndex(a => a.id === adId);
    if (adIndex === -1) {
        return interaction.reply({ content: 'Ad not found!', ephemeral: true });
    }

    ads[adIndex].status = 'approved';
    writeJSON(ADS_FILE, ads);

    await interaction.reply(`✅ Ad #${adId} has been approved!`);

    // Log action
    const { logAction } = require('../../discord');
    await logAction('Ad Approved', `Ad #${adId} approved`, {
        staff: interaction.user.tag,
        user: ads[adIndex].email
    });
}

async function declineAd(interaction) {
    const adId = interaction.options.getString('adid');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    const ADS_FILE = path.join(__dirname, '../../data/ads.json');
    let ads = readJSON(ADS_FILE) || [];

    const adIndex = ads.findIndex(a => a.id === adId);
    if (adIndex === -1) {
        return interaction.reply({ content: 'Ad not found!', ephemeral: true });
    }

    ads[adIndex].status = 'declined';
    ads[adIndex].decline_reason = reason;
    writeJSON(ADS_FILE, ads);

    await interaction.reply(`❌ Ad #${adId} has been declined!\nReason: ${reason}`);

    // Log action
    const { logAction } = require('../../discord');
    await logAction('Ad Declined', `Ad #${adId} declined: ${reason}`, {
        staff: interaction.user.tag,
        user: ads[adIndex].email
    });
}
