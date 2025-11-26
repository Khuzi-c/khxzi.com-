const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { readJSON, writeJSON } = require('../../utils/storage');
const crypto = require('crypto');
const path = require('path');

const STAFF_ROLES = ['1418550771426791535', '1418550773150781462', '1418691698959323239'];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('premium')
        .setDescription('Premium management commands (Staff only)')
        .addSubcommand(subcommand =>
            subcommand
                .setName('generate')
                .setDescription('Generate a premium key')
                .addStringOption(option =>
                    option.setName('duration')
                        .setDescription('Duration (1d, 7d, 30d, 1m, 3m, 6m, 1y)')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('notes')
                        .setDescription('Optional notes')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all premium keys'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('revoke')
                .setDescription('Revoke a premium key')
                .addStringOption(option =>
                    option.setName('key')
                        .setDescription('Key to revoke')
                        .setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        // Check staff role
        const hasStaffRole = interaction.member.roles.cache.some(role => STAFF_ROLES.includes(role.id));
        if (!hasStaffRole) {
            return interaction.reply({ content: 'You do not have permission to use this command!', ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'generate') {
            await generateKey(interaction);
        } else if (subcommand === 'list') {
            await listKeys(interaction);
        } else if (subcommand === 'revoke') {
            await revokeKey(interaction);
        }
    }
};

async function generateKey(interaction) {
    const duration = interaction.options.getString('duration');
    const notes = interaction.options.getString('notes') || '';

    const KEYS_FILE = path.join(__dirname, '../../data/keys.json');
    let keys = readJSON(KEYS_FILE) || [];

    const key = crypto.randomBytes(8).toString('hex').toUpperCase();
    const newKey = {
        key,
        duration,
        created_at: new Date().toISOString(),
        used: false,
        used_by: null,
        expiry_date: null,
        admin_notes: notes,
        created_by: interaction.user.tag
    };

    keys.push(newKey);
    writeJSON(KEYS_FILE, keys);

    await interaction.reply(`✅ Premium key generated!\n\`\`\`${key}\`\`\`\nDuration: **${duration}**\nNotes: ${notes || 'None'}`);

    // Log action
    const { logAction } = require('../../discord');
    await logAction('Premium Key Generated', `Key: ${key}, Duration: ${duration}`, {
        staff: interaction.user.tag
    });
}

async function listKeys(interaction) {
    const KEYS_FILE = path.join(__dirname, '../../data/keys.json');
    const keys = readJSON(KEYS_FILE) || [];

    if (keys.length === 0) {
        return interaction.reply('No keys found!');
    }

    const unused = keys.filter(k => !k.used).length;
    const used = keys.filter(k => k.used).length;

    let response = `📊 **Premium Keys Summary**\n\n`;
    response += `Total: **${keys.length}**\n`;
    response += `Unused: **${unused}**\n`;
    response += `Used: **${used}**\n\n`;
    response += `**Recent Keys:**\n`;

    keys.slice(-10).reverse().forEach(k => {
        response += `\`${k.key}\` - ${k.used ? '✅ Used' : '⏳ Unused'} - ${k.duration}\n`;
    });

    await interaction.reply(response);
}

async function revokeKey(interaction) {
    const keyToRevoke = interaction.options.getString('key').toUpperCase();

    const KEYS_FILE = path.join(__dirname, '../../data/keys.json');
    let keys = readJSON(KEYS_FILE) || [];

    const keyIndex = keys.findIndex(k => k.key === keyToRevoke);

    if (keyIndex === -1) {
        return interaction.reply({ content: 'Key not found!', ephemeral: true });
    }

    if (keys[keyIndex].used) {
        return interaction.reply({ content: 'Cannot revoke a used key!', ephemeral: true });
    }

    keys.splice(keyIndex, 1);
    writeJSON(KEYS_FILE, keys);

    await interaction.reply(`✅ Key \`${keyToRevoke}\` has been revoked!`);

    // Log action
    const { logAction } = require('../../discord');
    await logAction('Premium Key Revoked', `Key: ${keyToRevoke}`, {
        staff: interaction.user.tag
    });
}
