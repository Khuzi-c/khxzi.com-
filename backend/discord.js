const { Client, GatewayIntentBits, Partials, EmbedBuilder, Collection } = require('discord.js');
const { writeJSON, readJSON } = require('./utils/storage');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const LOG_CHANNEL_ID = process.env.DISCORD_LOG_CHANNEL_ID || '1442975081088155891';
const OWNER_ID = '1342119031552872489';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel, Partials.Message]
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'discord/commands');
if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const command = require(path.join(commandsPath, file));
        client.commands.set(command.data.name, command);
    }
}

let io;

const initDiscord = (socketIoInstance) => {
    io = socketIoInstance;
    if (TOKEN) {
        client.login(TOKEN);
    } else {
        console.warn('Discord Token not found in environment variables.');
    }
};

client.once('ready', async () => {
    console.log(`Discord Bot logged in as ${client.user.tag}`);

    const commands = [];
    client.commands.forEach(command => {
        commands.push(command.data.toJSON());
    });

    if (TOKEN && CLIENT_ID && GUILD_ID) {
        const rest = new REST({ version: '10' }).setToken(TOKEN);
        try {
            await rest.put(
                Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
                { body: commands }
            );
            console.log('Slash commands registered!');
        } catch (err) {
            console.error('Error registering commands:', err);
        }
    }
});

client.on('interactionCreate', async interaction => {
    // Handle slash commands
    if (interaction.isCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        try {
            await command.execute(interaction);
        } catch (err) {
            console.error('Command error:', err);
            await interaction.reply({ content: 'Error executing command!', flags: 64 });
        }
        return;
    }

    // Handle button clicks
    if (interaction.isButton()) {
        const [action, status, adId] = interaction.customId.split('_');

        if (action === 'ad') {
            const ADS_FILE = path.join(__dirname, 'data/ads.json');
            const ads = readJSON(ADS_FILE) || [];
            const ad = ads.find(a => a.id === adId);

            if (!ad) {
                return interaction.reply({ content: '❌ Ad not found!', ephemeral: true });
            }

            // Update ad status
            if (status === 'approve') {
                ad.status = 'approved';
                await interaction.reply({
                    content: `✅ Ad ${adId} approved! User: <@${ad.discordId}> (${ad.email})`,
                    ephemeral: true
                });
            } else if (status === 'decline') {
                ad.status = 'declined';
                await interaction.reply({
                    content: `❌ Ad ${adId} declined! Please contact <@${ad.discordId}> (${ad.email}) with reason.`,
                    ephemeral: true
                });
            } else if (status === 'hold') {
                ad.status = 'on-hold';
                await interaction.reply({
                    content: `⏸️ Ad ${adId} put on hold! User: <@${ad.discordId}> (${ad.email})`,
                    ephemeral: true
                });
            } else if (status === 'contact') {
                await interaction.reply({
                    content: `📧 Contact Info:\nDiscord: <@${ad.discordId}>\nEmail: ${ad.email}\nLink: ${ad.link}`,
                    ephemeral: true
                });
                return; // Don't save for contact button
            }

            // Save updated ads
            writeJSON(ADS_FILE, ads);

            // Update the original message to show status
            try {
                await interaction.message.edit({
                    content: `${interaction.message.content}\n\n**Status: ${ad.status.toUpperCase()}** (by <@${interaction.user.id}>)`
                });
            } catch (err) {
                console.error('Could not edit message:', err);
            }
        }
    }
});

async function logAction(action, details, data = {}) {
    try {
        if (!LOG_CHANNEL_ID) return;
        const channel = await client.channels.fetch(LOG_CHANNEL_ID);
        if (channel) {
            const embed = new EmbedBuilder()
                .setTitle(`📝 ${action}`)
                .setDescription(details)
                .setColor('#FF0000')
                .setTimestamp();
            if (data.user) embed.addFields({ name: 'User', value: data.user, inline: true });
            if (data.staff) embed.addFields({ name: 'Staff', value: data.staff, inline: true });
            await channel.send({ embeds: [embed] });
        }
        const LOG_FILE = path.join(__dirname, 'data/action_logs.json');
        let logs = readJSON(LOG_FILE) || [];
        logs.push({ action, details, data, timestamp: new Date().toISOString() });
        if (logs.length > 1000) logs = logs.slice(-1000);
        writeJSON(LOG_FILE, logs);
    } catch (err) {
        console.error('Log error:', err);
    }
}

async function postNewAd(adData) {
    try {
        const adsChannelId = '1442975081088155891';
        const channel = await client.channels.fetch(adsChannelId);
        const baseUrl = process.env.BASE_URL || 'http://localhost:3001';

        if (channel) {
            const embed = new EmbedBuilder()
                .setTitle('🎯 New Ad Submission')
                .setColor('#FF0000')
                .addFields(
                    { name: 'Ad ID', value: adData.id, inline: true },
                    { name: 'Discord ID', value: adData.discordId, inline: true },
                    { name: 'Email', value: adData.email, inline: false },
                    { name: 'Link', value: adData.link, inline: false },
                    { name: 'Type', value: adData.type || 'image', inline: true },
                    { name: 'Status', value: adData.status, inline: true }
                )
                .setTimestamp();

            if (adData.banner) {
                const imageUrl = adData.banner.startsWith('http') ? adData.banner : `${baseUrl}/${adData.banner}`;
                embed.setImage(imageUrl);
            }

            // Create action buttons
            const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`ad_approve_${adData.id}`)
                        .setLabel('✅ Approve')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`ad_decline_${adData.id}`)
                        .setLabel('❌ Decline')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId(`ad_hold_${adData.id}`)
                        .setLabel('⏸️ Hold')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`ad_contact_${adData.id}`)
                        .setLabel('📧 Contact')
                        .setStyle(ButtonStyle.Primary)
                );

            await channel.send({
                embeds: [embed],
                components: [row],
                content: `@here New ad submission from <@${adData.discordId}>`
            });
            console.log('Ad notification sent to channel');
        }

        try {
            const owner = await client.users.fetch(OWNER_ID);
            if (owner) {
                const dmEmbed = new EmbedBuilder()
                    .setTitle('🎯 New Ad Submission')
                    .setColor('#FF0000')
                    .setDescription(`New ad from <@${adData.discordId}>`)
                    .addFields(
                        { name: 'Ad ID', value: adData.id },
                        { name: 'Email', value: adData.email },
                        { name: 'Link', value: adData.link }
                    )
                    .setTimestamp();

                if (adData.banner) {
                    const imageUrl = adData.banner.startsWith('http') ? adData.banner : `${baseUrl}/${adData.banner}`;
                    dmEmbed.setImage(imageUrl);
                }

                // Create action buttons for DM
                const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

                const dmRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`ad_approve_${adData.id}`)
                            .setLabel('✅ Approve')
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId(`ad_decline_${adData.id}`)
                            .setLabel('❌ Decline')
                            .setStyle(ButtonStyle.Danger),
                        new ButtonBuilder()
                            .setCustomId(`ad_hold_${adData.id}`)
                            .setLabel('⏸️ Hold')
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId(`ad_contact_${adData.id}`)
                            .setLabel('📧 Contact')
                            .setStyle(ButtonStyle.Primary)
                    );

                await owner.send({
                    embeds: [dmEmbed],
                    components: [dmRow]
                });
                console.log('DM sent to owner');
            }
        } catch (dmErr) {
            console.error('Could not DM owner:', dmErr.message);
        }
    } catch (err) {
        console.error('Error posting ad to Discord:', err);
    }
}

module.exports = { initDiscord, logAction, postNewAd, client };
