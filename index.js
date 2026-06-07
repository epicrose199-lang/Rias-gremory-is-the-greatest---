require('dotenv').config();
const { 
    Client, 
    GatewayIntentBits, 
    ApplicationCommandOptionType, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    StringSelectMenuBuilder, 
    EmbedBuilder, 
    ChannelType, 
    PermissionFlagsBits
} = require('discord.js');
const { Client: SelfClient, RichPresence } = require('discord.js-selfbot-v13');

const mainBot = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const activeSessions = new Map();
const spammerLoops = new Map();
const savedRpcLayouts = new Map(); 
const prefix = "&"; 
const OWNER_ID = "1404189983807639672"; 

const delay = ms => new Promise(res => setTimeout(res, ms));

const MESSAGES = {
    serverInvalid: "Please provide a valid server location ID context.",
    channelInvalid: "Please provide a valid connection channel destination ID context.",
    tokenInvalid: "An unexpected authorization checkpoint error occurred.",
    maxSessionsReached: "<a:rWarning:1494077439670878329> You have **reached your maximum limit** of 4 simultaneous sessions.\n<a:rArrow:1493252548826763275> Use /247-stopall to clean them up",
    noActiveSessions: "<a:rWarning:1494077439670878329> You don't have any running **sessions** !",
    allStopped: "<a:rSuccess:1494078302632149083> **All active sessions and tokens have been fully cleared.**\n\n<a:rArrow:1493252548826763275> **Use /247 to run it again <a:rRitaMaid:1494319991187574794>**",
    slotStopped: (slot) => `<a:rSuccess:1494078302632149083> **Session slot ${slot} was fully shut down and tokens disconnected.**`,
    slotRelocated: (slot) => `<a:rSuccess:1494078302632149083> Relocated session slot **${slot}** to its new location successfully!`,
    allRelocated: "<a:rSuccess:1494078302632149083> Relocated all active tokens across your sessions **successfully**",
    processFailed: "<a:rWarning:1494077439670878329> Process complete. No profiles could successfully connect. Verification failed.",
    altMuted: (target) => `**<a:rArrow:1493252548826763275> Alts inside ${target} have been muted <:rMicrophone:1507766561723781381>**`,
    altUnmuted: (target) => `**<a:rArrow:1493252548826763275> Alts inside ${target} have been unmuted successfully**`,
    altDeafened: (target) => `**<a:rArrow:1493252548826763275> Alts inside ${target} have been deafened <:rDeafen:1494357361694085121>**`,
    altUndeafened: (target) => `**<a:rArrow:1493252548826763275> Alts inside ${target} have been undeafened**`,
    statusUpdated: (statusName) => `**<a:rArrow:1493252548826763275> your alts status has been updated to ${statusName} successfully**`,
    cameraUpdated: (target, flag) => `**<a:rArrow:1493252548826763275> Camera mode set to **${flag.toUpperCase()}** across ${target}.**`,
    liveUpdated: (target, flag) => `**<a:rArrow:1493252548826763275> Voice Channel Red Live stream mode set to **${flag.toUpperCase()}** across ${target}.**`,
    spammerUpdated: (flag) => `**<a:rArrow:1493252548826763275> Background text spammer state switched to: **${flag.toUpperCase()}****`,
    editSuccess: (slot) => `**<a:rSuccess:1494078302632149083> Session slot ${slot} tokens updated and deployed successfully!**`,
    restartingAll: `**🔄 Restarting all active sessions and re-verifying connection gateways...**`,
    restartingSlot: (slot) => `**🔄 Restarting active session slot ${slot}...**`,
    buildSuccessLine: (username, channelName, guildName) => `<a:rSuccess:1494078302632149083> • The **${username}** has successfully joined **${channelName}** on the server **${guildName}**\n`,
    successFooter: `i will stay there 24/7 don't worry <a:rRitaMaid:1494319991187574794>\n\n<a:rPurple:1493250339359555654> if u want to change the channel or server just run the cmd /change-place \`and follow the step\` <a:rWarn:1494077016939430039>`
};

const TICKET_PANEL_DESC = `- __We want to keep our community safe, friendly, and fun for everyone. To help with this, we have a report system you can use to tell us about any problems or questions you have. Here's a quick look at the different parts of our report system:__  ⁘\n\n` +
`- <:rAllumix:1493253489130733600>  **Pub** : \`Report spam or pub\` \n\n` +
`- <:rBughunter:1493253428695011409> **Bugs** : \`Report bugs or issues\` \n\n` +
`- <:rDiscord_employe:1493323538487054435>  **Abuse** : \`Report abuse or harassment\` \n\n` +
`- <:rquarantined:1493324162155024415> **Server** : \`Bot info or requests\` \n\n` +
`- <:rbans:1493323589145989140> **Staff Abuse** : \`Report staff issues\` \n\n\n` +
`- <:rHmm:1494304201319252170>   __Use these modules for assistance or to report issues. Our team is here to help!__`;

mainBot.once('ready', async () => {
    console.log(`🚀 Main bot online: ${mainBot.user.tag}`);
    
    const commands = [
        {
            name: '247',
            description: 'Start keeping up to 5 tokens in a voice channel (Max 4 sessions)',
            options: [
                { name: 'server-id', description: 'The Server ID', type: ApplicationCommandOptionType.String, required: true },
                { name: 'channel-id', description: 'The Voice Channel ID', type: ApplicationCommandOptionType.String, required: true },
                { name: 'token1', description: 'First account token', type: ApplicationCommandOptionType.String, required: true },
                { name: 'token2', description: 'Second account token', type: ApplicationCommandOptionType.String, required: false },
                { name: 'token3', description: 'Third account token', type: ApplicationCommandOptionType.String, required: false },
                { name: 'token4', description: 'Fourth account token', type: ApplicationCommandOptionType.String, required: false },
                { name: 'token5', description: 'Fifth account token', type: ApplicationCommandOptionType.String, required: false },
            ]
        },
        { 
            name: '247-stop', 
            description: 'Stop a specific running session slot',
            options: [{ name: 'slot', description: 'The active session slot number to destroy (1-4)', type: ApplicationCommandOptionType.Integer, required: true }]
        },
        { name: '247-stopall', description: 'Force kill all running sessions and drop connections globally' },
        { name: '247-storage', description: 'Inspect the exact full authorization token strings running inside your active slots' },
        { 
            name: '247-restart', 
            description: 'Restart active sessions',
            options: [{ name: 'slot', description: 'Target a specific slot to restart. Leave blank to restart ALL slots.', type: ApplicationCommandOptionType.Integer, required: false }]
        },
        {
            name: 'change-place',
            description: 'Move active tokens to a new server/channel location',
            options: [
                { name: 'new-server-id', description: 'The new Server ID', type: ApplicationCommandOptionType.String, required: true },
                { name: 'new-channel-id', description: 'The new Voice Channel ID', type: ApplicationCommandOptionType.String, required: true },
                { name: 'slot', description: 'Target a specific slot to move. Leave blank to move ALL running slots.', type: ApplicationCommandOptionType.Integer, required: false }
            ]
        },
        {
            name: '247-edit',
            description: 'Edit, overwrite, add, or drop tokens inside a running session slot directly',
            options: [
                { name: 'slot', description: 'The Session Slot to change (1-4)', type: ApplicationCommandOptionType.Integer, required: true },
                { name: 'token1', description: 'First account token', type: ApplicationCommandOptionType.String, required: true },
                { name: 'token2', description: 'Second account token', type: ApplicationCommandOptionType.String, required: false },
                { name: 'token3', description: 'Third account token', type: ApplicationCommandOptionType.String, required: false },
                { name: 'token4', description: 'Fourth account token', type: ApplicationCommandOptionType.String, required: false },
                { name: 'token5', description: 'Fifth account token', type: ApplicationCommandOptionType.String, required: false },
            ]
        },
        {
            name: '247-mute',
            description: 'Mute or unmute your running tokens',
            options: [
                { name: 'status', description: 'True to mute, False to unmute', type: ApplicationCommandOptionType.Boolean, required: true },
                { name: 'slot', description: 'Target specific slot only. Leave blank for all slots.', type: ApplicationCommandOptionType.Integer, required: false }
            ]
        },
        {
            name: '247-deaf',
            description: 'Deafen or undeafen your running tokens',
            options: [
                { name: 'status', description: 'True to deafen, False to undeafen', type: ApplicationCommandOptionType.Boolean, required: true },
                { name: 'slot', description: 'Target specific slot only. Leave blank for all slots.', type: ApplicationCommandOptionType.Integer, required: false }
            ]
        },
        {
            name: '247-camera',
            description: 'Toggle camera green icon visibility inside your active voice channels',
            options: [
                { name: 'status', description: 'True to switch on, False to switch off', type: ApplicationCommandOptionType.Boolean, required: true },
                { name: 'slot', description: 'Target specific slot only. Leave blank for all slots.', type: ApplicationCommandOptionType.Integer, required: false }
            ]
        },
        {
            name: '247-live-badge',
            description: 'Toggle the Red Voice Channel Live stream marker',
            options: [
                { name: 'status', description: 'True to turn on red live view, False to hide', type: ApplicationCommandOptionType.Boolean, required: true },
                { name: 'slot', description: 'Target specific slot only. Leave blank for all slots.', type: ApplicationCommandOptionType.Integer, required: false }
            ]
        },
        {
            name: '247-status',
            description: 'Change the online presence status of all active profiles',
            options: [
                {
                    name: 'type',
                    description: 'Choose status type',
                    type: ApplicationCommandOptionType.String,
                    required: true,
                    choices: [
                        { name: 'Online', value: 'online' },
                        { name: 'Idle', value: 'idle' },
                        { name: 'Do Not Disturb', value: 'dnd' },
                        { name: 'Invisible', value: 'invisible' }
                    ]
                }
            ]
        },
        {
            name: '247-rpc',
            description: 'Configure Rich Presence layouts (Text & Media unified combined)',
            options: [
                {
                    name: 'activity-type',
                    description: 'The display type of the activity layout',
                    type: ApplicationCommandOptionType.String,
                    required: true,
                    choices: [
                        { name: 'Playing', value: 'PLAYING' },
                        { name: 'Streaming', value: 'STREAMING' },
                        { name: 'Listening', value: 'LISTENING' },
                        { name: 'Watching', value: 'WATCHING' },
                        { name: 'Competing', value: 'COMPETING' }
                    ]
                },
                { name: 'name', description: 'The primary status title name text', type: ApplicationCommandOptionType.String, required: false },
                { name: 'state', description: 'Secondary subtext info line detail', type: ApplicationCommandOptionType.String, required: false },
                { name: 'url', description: 'Stream link (Required for STREAMING type)', type: ApplicationCommandOptionType.String, required: false },
                { name: 'application-id', description: 'Custom Application Client ID override', type: ApplicationCommandOptionType.String, required: false },
                { name: 'large-image', description: 'Large picture media link or text asset key string', type: ApplicationCommandOptionType.String, required: false },
                { name: 'small-image', description: 'Small round badge picture link or asset key string', type: ApplicationCommandOptionType.String, required: false }
            ]
        },
        {
            name: '247-rpc-edit',
            description: 'Edit your existing Rich Presence details dynamically all at once',
            options: [
                { name: 'name', description: 'Update status title name text', type: ApplicationCommandOptionType.String, required: false },
                { name: 'state', description: 'Update secondary subtext line detail', type: ApplicationCommandOptionType.String, required: false },
                { name: 'url', description: 'Update streaming channel link', type: ApplicationCommandOptionType.String, required: false },
                { name: 'large-image', description: 'Update large picture media asset asset link', type: ApplicationCommandOptionType.String, required: false },
                { name: 'small-image', description: 'Update small round badge asset link', type: ApplicationCommandOptionType.String, required: false }
            ]
        },
        {
            name: '247-rpc-toggle',
            description: 'Turn your custom Rich Presence status visibility display ON or OFF completely',
            options: [{ name: 'status', description: 'True to enable custom status, False to hide it completely', type: ApplicationCommandOptionType.Boolean, required: true }]
        },
        {
            name: '247-spammer',
            description: 'Configure multi-account background text spamming configurations loops',
            options: [
                { name: 'status', description: 'True to enable loop, False to close and kill loop', type: ApplicationCommandOptionType.Boolean, required: true },
                { name: 'slot', description: 'Target session slot configuration (1-4)', type: ApplicationCommandOptionType.Integer, required: false },
                { name: 'text', description: 'The text phrase to spam', type: ApplicationCommandOptionType.String, required: false },
                { name: 'channel-id', description: 'Target text channel ID', type: ApplicationCommandOptionType.String, required: false },
                { name: 'delay', description: 'Delay wait time between messages sent (in milliseconds)', type: ApplicationCommandOptionType.Integer, required: false }
            ]
        },
        { name: 'stats', description: 'View current status across your active sessions' }
    ];

    await mainBot.application.commands.set(commands).catch(console.error);
});

function sendVoicePayload(client, serverId, channelId, mute=false, deaf=false, video=false) {
    try {
        client.ws.broadcast({
            op: 4,
            d: {
                guild_id: serverId,
                channel_id: channelId,
                self_mute: mute,
                self_deaf: deaf,
                self_video: video
            }
        });
    } catch(e) {
        console.error(`Error casting gateway payload:`, e);
    }
}

// Fixed core voice payload stream parser loop configuration block
const sendStreamPayload = (client, serverId, channelId, active) => {
    try {
        client.ws.broadcast({
            op: 18, 
            d: active ? {
                type: "guild",
                guild_id: serverId,
                channel_id: channelId,
                preferred_region: null
            } : null
        });
    } catch(e) {
        console.error("Failed handling live gateway broadcasting parameters:", e);
    }
};

function syncRichPresenceToClient(t) {
    const savedLayout = savedRpcLayouts.get(t.userId);
    if (!savedLayout || !savedLayout.enabled) {
        try { t.selfClient.user.setActivity(null); } catch(e){}
        return;
    }

    try {
        const pr = new RichPresence(t.selfClient);
        if (savedLayout.applicationId) pr.setApplicationId(savedLayout.applicationId);
        if (savedLayout.activityType) pr.setType(savedLayout.activityType);
        if (savedLayout.name) pr.setName(savedLayout.name);
        if (savedLayout.state) pr.setState(savedLayout.state);
        
        if (savedLayout.activityType === 'STREAMING' && savedLayout.url) {
            pr.setURL(savedLayout.url);
        }
        if (savedLayout.activityType === 'LISTENING') {
            pr.setStartTimestamp(Date.now());
        }
        
        if (savedLayout.largeImage) pr.setLargeImage(savedLayout.largeImage);
        if (savedLayout.smallImage) pr.setSmallImage(savedLayout.smallImage);

        t.selfClient.user.setActivity(pr);
    } catch (e) {
        console.error(`Error syncing presence layout state for ${t.username}:`, e);
    }
}

async function launchSelfbot(userId, token, serverId, channelId, interaction) {
    const selfClient = new SelfClient({ checkUpdate: false, patchVoice: true });
    
    return new Promise((resolve) => {
        const timeoutTracker = setTimeout(() => {
            try { selfClient.destroy(); } catch(e){}
            resolve({ error: true });
        }, 25000);

        selfClient.on('shardConnect', () => {
            selfClient.user.client.options.ws.properties = {
                ...selfClient.user.client.options.ws.properties,
                friend_source_flags: { all: true, mutual_friends: true, mutual_guilds: true }
            };
        });

        selfClient.on('ready', async () => {
            try {
                if (selfClient.user.settings) {
                    selfClient.user.settings.friendSourceFlags = { all: true, mutualFriends: true, mutualGuilds: true };
                }

                const guild = await selfClient.guilds.fetch(serverId).catch(() => null);
                if (!guild) {
                    clearTimeout(timeoutTracker);
                    selfClient.destroy();
                    return resolve({ error: true });
                }

                const channel = await selfClient.channels.fetch(channelId).catch(() => null);
                if (!channel || !channel.isVoice()) {
                    clearTimeout(timeoutTracker);
                    selfClient.destroy();
                    return resolve({ error: true });
                }

                sendVoicePayload(selfClient, serverId, channelId, false, false, false);
                clearTimeout(timeoutTracker);

                selfClient.on('voiceStateUpdate', async (oldState, newState) => {
                    if (newState.member.id === selfClient.user.id) {
                        if (!newState.channelId || newState.channelId !== channelId) {
                            await delay(4000);
                            
                            const sessionReference = activeSessions.get(userId)?.find(s => s.channelId === channelId);
                            const tokenObj = sessionReference?.tokens.find(t => t.token === token);
                            
                            const isMuted = tokenObj ? tokenObj.muted : false;
                            const isDeaf = tokenObj ? tokenObj.deafened : false;
                            const isCam = tokenObj ? tokenObj.camera : false;
                            const isLive = tokenObj ? tokenObj.live : false;

                            sendVoicePayload(selfClient, serverId, channelId, isMuted, isDeaf, isCam);
                            sendStreamPayload(selfClient, serverId, channelId, isLive);
                        }
                    }
                });

                const logChannel = await mainBot.channels.fetch(process.env.LOGS_CHANNEL_ID).catch(() => null);
                if (logChannel) {
                    let logText = MESSAGES.buildSuccessLine(selfClient.user.username, channel.name, guild.name);
                    logText += MESSAGES.successFooter;
                    await logChannel.send(logText).catch(() => null);
                }

                const tObj = { 
                    userId,
                    token, 
                    selfClient, 
                    serverId, 
                    channelId, 
                    muted: false, 
                    deafened: false,
                    camera: false,
                    live: false,
                    username: selfClient.user.username,
                    channelName: channel.name,
                    guildName: guild.name
                };

                syncRichPresenceToClient(tObj);
                resolve(tObj);
            } catch (err) {
                clearTimeout(timeoutTracker);
                try { selfClient.destroy(); } catch(e){}
                resolve({ error: true });
            }
        });

        selfClient.login(token).catch(async () => {
            clearTimeout(timeoutTracker);
            resolve({ error: true });
        });
    });
}

function stopSpammerLoop(userId, slotIndex) {
    const key = `${userId}-${slotIndex}`;
    if (spammerLoops.has(key)) {
        clearInterval(spammerLoops.get(key));
        spammerLoops.delete(key);
    }
}

function startSpammerLoop(userId, slotIndex, tokens, text, channelId, delayMs) {
    stopSpammerLoop(userId, slotIndex);
    const key = `${userId}-${slotIndex}`;

    const executeSpamRun = async () => {
        if (!spammerLoops.has(key)) return;

        for (const tokenObj of tokens) {
            try {
                const targetChannel = await tokenObj.selfClient.channels.fetch(channelId).catch(() => null);
                if (targetChannel && targetChannel.isText()) {
                    const antiBotBypassArray = ["", " ", " .", "...", "\u200b", "\u200c"];
                    const variant = antiBotBypassArray[Math.floor(Math.random() * antiBotBypassArray.length)];
                    const formattedPayload = `${text}${variant}`;

                    await targetChannel.send(formattedPayload).catch(() => null);
                    await delay(600); 
                }
            } catch(e){}
        }

        const minDelay = Math.max(delayMs, 1000);
        const jitterValue = Math.floor((Math.random() * 0.3 - 0.15) * minDelay);
        const finalCalculatedNextDelay = minDelay + jitterValue;

        if (spammerLoops.has(key)) {
            const nextTimeout = setTimeout(executeSpamRun, finalCalculatedNextDelay);
            spammerLoops.set(key, nextTimeout);
        }
    };

    const initialTimeout = setTimeout(executeSpamRun, delayMs);
    spammerLoops.set(key, initialTimeout);
}

async function reinitializeSingleSlot(userId, userSessions, slotIndex, interaction) {
    const backup = {
        serverId: userSessions[slotIndex].serverId,
        channelId: userSessions[slotIndex].channelId,
        tokens: userSessions[slotIndex].tokens.map(t => t.token)
    };

    stopSpammerLoop(userId, slotIndex);
    userSessions[slotIndex].tokens.forEach(t => {
        try {
            sendVoicePayload(t.selfClient, t.serverId, null);
            t.selfClient.destroy();
        } catch(e){}
    });

    const launchedTokens = [];
    for (const tokenStr of backup.tokens) {
        const res = await launchSelfbot(userId, tokenStr, backup.serverId, backup.channelId, interaction);
        if (res && !res.error) launchedTokens.push(res);
        await delay(2000);
    }

    if (launchedTokens.length > 0) {
        userSessions[slotIndex].tokens = launchedTokens;
        return true;
    } else {
        userSessions.splice(slotIndex, 1);
        return false;
    }
}

// ==========================================
// INTERACTION CONTROLLER
// ==========================================
mainBot.on('interactionCreate', async (interaction) => {
    
    if (interaction.isButton()) {
        const { customId, guild, user } = interaction;

        if (customId === 'setup_btn_mode') {
            const panelEmbed = new EmbedBuilder()
                .setColor("#2F3136")
                .setTitle("<:rTicket:1493253531644203098>   Rias • Ticket Support System")
                .setDescription(TICKET_PANEL_DESC);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('tk_pub').setLabel('Pub').setEmoji('1493253489130733600').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('tk_bugs').setLabel('Bugs').setEmoji('1493253428695011409').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('tk_abuse').setLabel('Abuse').setEmoji('1493323538487054435').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('tk_server').setLabel('Server').setEmoji('1493324162155024415').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('tk_staff').setLabel('Staff Abuse').setEmoji('1493323589145989140').setStyle(ButtonStyle.Secondary)
            );

            await interaction.reply({ content: "✅ Button embed panel deployed successfully.", ephemeral: true }).catch(() => null);
            return interaction.channel.send({ embeds: [panelEmbed], components: [row] });
        }

        if (customId === 'setup_menu_mode') {
            const panelEmbed = new EmbedBuilder()
                .setColor("#2F3136")
                .setTitle("<:rTicket:1493253531644203098>   Rias • Ticket Support System")
                .setDescription(TICKET_PANEL_DESC);

            const menu = new StringSelectMenuBuilder()
                .setCustomId('ticket_select_menu')
                .setPlaceholder('Select a ticket department category...')
                .addOptions([
                    { label: 'Pub', value: 'Pub', description: 'Report spam or pub', emoji: '1493253489130733600' },
                    { label: 'Bugs', value: 'Bugs', description: 'Report bugs or issues', emoji: '1493253428695011409' },
                    { label: 'Abuse', value: 'Abuse', description: 'Report abuse or harassment', emoji: '1493323538487054435' },
                    { label: 'Server', value: 'Server', description: 'Bot info or requests', emoji: '1493324162155024415' },
                    { label: 'Staff Abuse', value: 'Staff Abuse', description: 'Report staff issues', emoji: '1493323589145989140' }
                ]);

            const row = new ActionRowBuilder().addComponents(menu);
            await interaction.reply({ content: "✅ Select Menu dropdown embed deployed successfully.", ephemeral: true }).catch(() => null);
            return interaction.channel.send({ embeds: [panelEmbed], components: [row] });
        }

        if (customId === 'close_ticket') {
            await interaction.reply({ content: "🔒 *This ticket channel is shutting down in 5 seconds...*" }).catch(() => null);
            await delay(5000);
            return interaction.channel.delete().catch(() => null);
        }

        if (customId.startsWith('tk_')) {
            await interaction.deferReply({ ephemeral: true }).catch(() => null);
            const titleMap = { tk_pub: 'Pub', tk_bugs: 'Bugs', tk_abuse: 'Abuse', tk_server: 'Server', tk_staff: 'Staff Abuse' };
            const typeSelected = titleMap[customId];

            const ticketChan = await guild.channels.create({
                name: `${user.username}-ticket`,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
                ]
            }).catch(() => null);

            if (!ticketChan) return interaction.editReply({ content: "❌ Error generating channel permissions frame." });

            const innerEmbed = new EmbedBuilder()
                .setColor("#2F3136")
                .setTitle(`🎫 Department Connection: ${typeSelected}`)
                .setDescription(`Welcome to your request thread <@${user.id}>.\nOur management staff node has been initialized. State your case details below clearly.`);

            const closeRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('close_ticket').setLabel('Close Ticket').setStyle(ButtonStyle.Danger)
            );

            await ticketChan.send({ content: `<@${user.id}>`, embeds: [innerEmbed], components: [closeRow] }).catch(() => null);
            return interaction.editReply({ content: `📬 Ticket opened inside channel target location: ${ticketChan}` });
        }
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select_menu') {
        await interaction.deferReply({ ephemeral: true }).catch(() => null);
        const typeSelected = interaction.values[0];
        const { guild, user } = interaction;

        const ticketChan = await guild.channels.create({
            name: `${user.username}-ticket`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
            ]
        }).catch(() => null);

        if (!ticketChan) return interaction.editReply({ content: "❌ Error generating channel dropdown location frame." });

        const innerEmbed = new EmbedBuilder()
            .setColor("#2F3136")
            .setTitle(`🎫 Department Connection: ${typeSelected}`)
            .setDescription(`Welcome to your request thread <@${user.id}>.\nOur management staff node has been initialized. State your case details below clearly.`);

        const closeRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('close_ticket').setLabel('Close Ticket').setStyle(ButtonStyle.Danger)
        );

        await ticketChan.send({ content: `<@${user.id}>`, embeds: [innerEmbed], components: [closeRow] }).catch(() => null);
        return interaction.editReply({ content: `📬 Ticket opened inside channel target location: ${ticketChan}` });
    }

    if (!interaction.isChatInputCommand()) return;
    const { commandName, user, options } = interaction;

    if (!activeSessions.has(user.id)) activeSessions.set(user.id, []);
    const userSessions = activeSessions.get(user.id);

    if (commandName === '247') {
        await interaction.deferReply({ ephemeral: true }).catch(() => null);

        if (userSessions.length >= 4) {
            return interaction.editReply(MESSAGES.maxSessionsReached).catch(() => null);
        }

        const serverId = options.getString('server-id');
        const channelId = options.getString('channel-id');
        const rawTokens = [
            options.getString('token1'), options.getString('token2'),
            options.getString('token3'), options.getString('token4'), options.getString('token5')
        ].filter(Boolean);

        const launchedTokens = [];
        for (const token of rawTokens) {
            const res = await launchSelfbot(user.id, token, serverId, channelId, interaction);
            if (res && !res.error) launchedTokens.push(res);
            await delay(2000);
        }

        if (launchedTokens.length > 0) {
            userSessions.push({ serverId, channelId, tokens: launchedTokens });

            let userReplyText = "";
            launchedTokens.forEach(t => {
                userReplyText += MESSAGES.buildSuccessLine(t.username, t.channelName, t.guildName);
            });
            userReplyText += MESSAGES.successFooter;
            await interaction.editReply({ content: userReplyText }).catch(() => null);
        } else {
            await interaction.editReply(MESSAGES.processFailed).catch(() => null);
        }
    }

    if (commandName === '247-storage') {
        if (userSessions.length === 0) return interaction.reply({ content: MESSAGES.noActiveSessions, ephemeral: true }).catch(() => null);
        
        let storageOutput = `🔑 **Active Authorization Key Vault Storage**:\n\n`;
        userSessions.forEach((session, slotIdx) => {
            storageOutput += `__**Session Slot [ ${slotIdx + 1} ]**__ (Channel: \`${session.channelId}\`)\n`;
            session.tokens.forEach((tObj, tokenIdx) => {
                storageOutput += `• TOKEN_${tokenIdx + 1} (${tObj.username}) = \`${tObj.token}\`\n`;
            });
            storageOutput += `\n`;
        });

        return interaction.reply({ content: storageOutput, ephemeral: true }).catch(() => null);
    }

    if (commandName === '247-edit') {
        await interaction.deferReply({ ephemeral: true }).catch(() => null);
        const slot = options.getInteger('slot');
        const sessionIndex = slot - 1;

        if (!userSessions[sessionIndex]) {
            return interaction.editReply(`<a:rWarning:1494077439670878329> No active session running inside Slot ${slot}.`).catch(() => null);
        }

        const targetSession = userSessions[sessionIndex];
        
        stopSpammerLoop(user.id, sessionIndex);
        targetSession.tokens.forEach(t => {
            try {
                sendVoicePayload(t.selfClient, t.serverId, null);
                t.selfClient.destroy();
            } catch(e){}
        });

        const rawTokens = [
            options.getString('token1'), options.getString('token2'),
            options.getString('token3'), options.getString('token4'), options.getString('token5')
        ].filter(Boolean);

        const launchedTokens = [];
        for (const token of rawTokens) {
            const res = await launchSelfbot(user.id, token, targetSession.serverId, targetSession.channelId, interaction);
            if (res && !res.error) launchedTokens.push(res);
            await delay(2000);
        }

        if (launchedTokens.length > 0) {
            targetSession.tokens = launchedTokens;
            await interaction.editReply(MESSAGES.editSuccess(slot)).catch(() => null);
        } else {
            userSessions.splice(sessionIndex, 1);
            await interaction.editReply(`<a:rWarning:1494077439670878329> Edit failed. All tokens failed authentication. Slot ${slot} wiped.`).catch(() => null);
        }
    }

    if (commandName === '247-restart') {
        await interaction.deferReply({ ephemeral: true }).catch(() => null);
        if (userSessions.length === 0) return interaction.editReply(MESSAGES.noActiveSessions).catch(() => null);

        const slotOpt = options.getInteger('slot');

        if (slotOpt) {
            const sessionIndex = slotOpt - 1;
            if (!userSessions[sessionIndex]) {
                return interaction.editReply(`<a:rWarning:1494077439670878329> No running session allocated to Slot **${slotOpt}**.`).catch(() => null);
            }
            await interaction.editReply(MESSAGES.restartingSlot(slotOpt)).catch(() => null);
            await reinitializeSingleSlot(user.id, userSessions, sessionIndex, interaction);
            return interaction.editReply(`**<a:rSuccess:1494078302632149083> Reset and re-synchronized session slot ${slotOpt} safely!**`).catch(() => null);
        } else {
            await interaction.editReply(MESSAGES.restartingAll).catch(() => null);
            const originalBackups = JSON.parse(JSON.stringify(userSessions.map(s => ({
                serverId: s.serverId,
                channelId: s.channelId,
                tokens: s.tokens.map(t => t.token)
            }))));

            userSessions.forEach((session, idx) => {
                stopSpammerLoop(user.id, idx);
                session.tokens.forEach(t => {
                    try {
                        sendVoicePayload(t.selfClient, t.serverId, null);
                        t.selfClient.destroy();
                    } catch(e){}
                });
            });
            activeSessions.set(user.id, []);

            for (const backup of originalBackups) {
                const launchedTokens = [];
                for (const tokenStr of backup.tokens) {
                    const res = await launchSelfbot(user.id, tokenStr, backup.serverId, backup.channelId, interaction);
                    if (res && !res.error) launchedTokens.push(res);
                    await delay(2000);
                }
                if (launchedTokens.length > 0) {
                    activeSessions.get(user.id).push({ serverId: backup.serverId, channelId: backup.channelId, tokens: launchedTokens });
                }
            }
            await interaction.editReply(`**<a:rSuccess:1494078302632149083> Restored, reset, and re-synchronized all active profile session routes safely!**`).catch(() => null);
        }
    }

    if (commandName === '247-stop') {
        const slot = options.getInteger('slot');
        const sessionIndex = slot - 1;

        if (!userSessions[sessionIndex]) {
            return interaction.reply({ content: `<a:rWarning:1494077439670878329> There is no running session allocated to Slot **${slot}**.`, ephemeral: true }).catch(() => null);
        }

        stopSpammerLoop(user.id, sessionIndex);
        userSessions[sessionIndex].tokens.forEach(t => {
            try {
                sendVoicePayload(t.selfClient, t.serverId, null);
                t.selfClient.destroy();
            } catch(e){}
        });

        userSessions.splice(sessionIndex, 1);
        return interaction.reply({ content: MESSAGES.slotStopped(slot), ephemeral: true }).catch(() => null);
    }

    if (commandName === '247-stopall') {
        if (userSessions.length === 0) return interaction.reply({ content: MESSAGES.noActiveSessions, ephemeral: true }).catch(() => null);
        
        userSessions.forEach((session, idx) => {
            stopSpammerLoop(user.id, idx);
            session.tokens.forEach(t => { 
                try { 
                    sendVoicePayload(t.selfClient, t.serverId, null);
                    t.selfClient.destroy(); 
                } catch(e){} 
            });
        });
        
        activeSessions.set(user.id, []);
        return interaction.reply({ content: MESSAGES.allStopped, ephemeral: true }).catch(() => null);
    }

    if (commandName === 'change-place') {
        await interaction.deferReply({ ephemeral: true }).catch(() => null);
        if (userSessions.length === 0) return interaction.editReply(MESSAGES.noActiveSessions).catch(() => null);

        const newServerId = options.getString('new-server-id');
        const newChannelId = options.getString('new-channel-id');
        const slotOpt = options.getInteger('slot');

        if (slotOpt) {
            const sessionIndex = slotOpt - 1;
            if (!userSessions[sessionIndex]) {
                return interaction.editReply(`<a:rWarning:1494077439670878329> Session slot **${slotOpt}** is not running.`).catch(() => null);
            }
            const session = userSessions[sessionIndex];
            session.serverId = newServerId;
            session.channelId = newChannelId;
            for (const t of session.tokens) {
                try {
                    sendVoicePayload(t.selfClient, newServerId, newChannelId, t.muted, t.deafened, t.camera);
                    sendStreamPayload(t.selfClient, newServerId, newChannelId, t.live);
                    t.serverId = newServerId; 
                    t.channelId = newChannelId;
                } catch (e) {}
            }
            return interaction.editReply(MESSAGES.slotRelocated(slotOpt)).catch(() => null);
        } else {
            for (const session of userSessions) {
                session.serverId = newServerId;
                session.channelId = newChannelId;
                for (const t of session.tokens) {
                    try {
                        sendVoicePayload(t.selfClient, newServerId, newChannelId, t.muted, t.deafened, t.camera);
                        sendStreamPayload(t.selfClient, newServerId, newChannelId, t.live);
                        t.serverId = newServerId; 
                        t.channelId = newChannelId;
                    } catch (e) {}
                }
            }
            return interaction.editReply(MESSAGES.allRelocated).catch(() => null);
        }
    }

    if (commandName === '247-mute') {
        if (userSessions.length === 0) return interaction.reply({ content: MESSAGES.noActiveSessions, ephemeral: true }).catch(() => null);
        const status = options.getBoolean('status');
        const slotOpt = options.getInteger('slot');

        if (slotOpt) {
            const idx = slotOpt - 1;
            if (!userSessions[idx]) return interaction.reply({ content: `❌ Slot ${slotOpt} is currently empty.`, ephemeral: true });
            userSessions[idx].tokens.forEach(t => {
                t.muted = status;
                sendVoicePayload(t.selfClient, t.serverId, t.channelId, status, t.deafened, t.camera);
            });
            return interaction.reply({ content: status ? MESSAGES.altMuted(`Slot ${slotOpt}`) : MESSAGES.altUnmuted(`Slot ${slotOpt}`) });
        } else {
            userSessions.forEach(session => {
                session.tokens.forEach(t => {
                    t.muted = status;
                    sendVoicePayload(t.selfClient, t.serverId, t.channelId, status, t.deafened, t.camera);
                });
            });
            return interaction.reply({ content: status ? MESSAGES.altMuted("all active slots") : MESSAGES.altUnmuted("all active slots") });
        }
    }

    if (commandName === '247-deaf') {
        if (userSessions.length === 0) return interaction.reply({ content: MESSAGES.noActiveSessions, ephemeral: true }).catch(() => null);
        const status = options.getBoolean('status');
        const slotOpt = options.getInteger('slot');

        if (slotOpt) {
            const idx = slotOpt - 1;
            if (!userSessions[idx]) return interaction.reply({ content: `❌ Slot ${slotOpt} is currently empty.`, ephemeral: true });
            userSessions[idx].tokens.forEach(t => {
                t.deafened = status;
                sendVoicePayload(t.selfClient, t.serverId, t.channelId, t.muted, status, t.camera);
            });
            return interaction.reply({ content: status ? MESSAGES.altDeafened(`Slot ${slotOpt}`) : MESSAGES.altUndeafened(`Slot ${slotOpt}`) });
        } else {
            userSessions.forEach(session => {
                session.tokens.forEach(t => {
                    t.deafened = status;
                    sendVoicePayload(t.selfClient, t.serverId, t.channelId, t.muted, status, t.camera);
                });
            });
            return interaction.reply({ content: status ? MESSAGES.altDeafened("all active slots") : MESSAGES.altUndeafened("all active slots") });
        }
    }

    if (commandName === '247-camera') {
        if (userSessions.length === 0) return interaction.reply({ content: MESSAGES.noActiveSessions, ephemeral: true }).catch(() => null);
        const status = options.getBoolean('status');
        const slotOpt = options.getInteger('slot');

        if (slotOpt) {
            const idx = slotOpt - 1;
            if (!userSessions[idx]) return interaction.reply({ content: `❌ Slot ${slotOpt} is currently empty.`, ephemeral: true });
            userSessions[idx].tokens.forEach(t => {
                t.camera = status;
                sendVoicePayload(t.selfClient, t.serverId, t.channelId, t.muted, t.deafened, status);
            });
            return interaction.reply({ content: MESSAGES.cameraUpdated(`Slot ${slotOpt}`, status ? "on" : "off") });
        } else {
            userSessions.forEach(session => {
                session.tokens.forEach(t => {
                    t.camera = status;
                    sendVoicePayload(t.selfClient, t.serverId, t.channelId, t.muted, t.deafened, status);
                });
            });
            return interaction.reply({ content: MESSAGES.cameraUpdated("all active slots", status ? "on" : "off") });
        }
    }

    if (commandName === '247-live-badge') {
        if (userSessions.length === 0) return interaction.reply({ content: MESSAGES.noActiveSessions, ephemeral: true }).catch(() => null);
        const status = options.getBoolean('status');
        const slotOpt = options.getInteger('slot');

        if (slotOpt) {
            const idx = slotOpt - 1;
            if (!userSessions[idx]) return interaction.reply({ content: `❌ Slot ${slotOpt} is currently empty.`, ephemeral: true });
            userSessions[idx].tokens.forEach(t => {
                t.live = status;
                sendStreamPayload(t.selfClient, t.serverId, t.channelId, status);
                sendVoicePayload(t.selfClient, t.serverId, t.channelId, t.muted, t.deafened, t.camera);
            });
            return interaction.reply({ content: MESSAGES.liveUpdated(`Slot ${slotOpt}`, status ? "on" : "off") });
        } else {
            userSessions.forEach(session => {
                session.tokens.forEach(t => {
                    t.live = status;
                    sendStreamPayload(t.selfClient, t.serverId, t.channelId, status);
                    sendVoicePayload(t.selfClient, t.serverId, t.channelId, t.muted, t.deafened, t.camera);
                });
            });
            return interaction.reply({ content: MESSAGES.liveUpdated("all active slots", status ? "on" : "off") });
        }
    }

    if (commandName === '247-status') {
        if (userSessions.length === 0) return interaction.reply({ content: MESSAGES.noActiveSessions, ephemeral: true }).catch(() => null);
        const statusType = options.getString('type');

        userSessions.forEach(session => {
            session.tokens.forEach(t => {
                try { t.selfClient.user.setStatus(statusType); } catch (e) {}
            });
        });

        const statusDisplayNames = { online: 'Online', idle: 'Idle', dnd: 'Do Not Disturb', invisible: 'Invisible' };
        return interaction.reply({ content: MESSAGES.statusUpdated(statusDisplayNames[statusType]) }).catch(() => null);
    }

    // UNIFIED RICH PRESENCE COMMAND (TEXT + MEDIA LINKED)
    if (commandName === '247-rpc') {
        await interaction.deferReply({ ephemeral: true }).catch(() => null);
        if (userSessions.length === 0) return interaction.editReply(MESSAGES.noActiveSessions).catch(() => null);
        
        const activityType = options.getString('activity-type');
        const name = options.getString('name') || "Activity";
        const state = options.getString('state') || "";
        const url = options.getString('url') || "https://twitch.tv/directory";
        const customAppId = options.getString('application-id') || (activityType === 'LISTENING' ? '232924151325491200' : '1213034914101137458');
        
        // Accepting text and images right inside the same configuration setup
        const largeImage = options.getString('large-image') || undefined;
        const smallImage = options.getString('small-image') || undefined;

        savedRpcLayouts.set(user.id, {
            enabled: true,
            activityType,
            name,
            state,
            url,
            applicationId: customAppId,
            largeImage,
            smallImage
        });

        userSessions.forEach(session => {
            session.tokens.forEach(t => syncRichPresenceToClient(t));
        });

        return interaction.editReply({ content: "🎮 **Rich Presence setup fully loaded and bound dynamically!** Emojis and assets synchronized text parameters successfully." });
    }

    // UNIFIED EDIT COMMAND
    if (commandName === '247-rpc-edit') {
        await interaction.deferReply({ ephemeral: true }).catch(() => null);
        if (userSessions.length === 0) return interaction.editReply(MESSAGES.noActiveSessions).catch(() => null);

        const savedLayout = savedRpcLayouts.get(user.id);
        if (!savedLayout) {
            return interaction.editReply({ content: "❌ No existing configuration map found to update. Run `/247-rpc` first." });
        }

        const nameOpt = options.getString('name');
        const stateOpt = options.getString('state');
        const urlOpt = options.getString('url');
        const largeImgOpt = options.getString('large-image');
        const smallImgOpt = options.getString('small-image');

        if (nameOpt !== null) savedLayout.name = nameOpt;
        if (stateOpt !== null) savedLayout.state = stateOpt;
        if (urlOpt !== null) savedLayout.url = urlOpt;
        if (largeImgOpt !== null) savedLayout.largeImage = largeImgOpt;
        if (smallImgOpt !== null) savedLayout.smallImage = smallImgOpt;

        userSessions.forEach(session => {
            session.tokens.forEach(t => syncRichPresenceToClient(t));
        });

        return interaction.editReply({ content: "📝 **Rich Presence properties and media paths updated simultaneously.**" });
    }

    if (commandName === '247-rpc-toggle') {
        await interaction.deferReply({ ephemeral: true }).catch(() => null);
        if (userSessions.length === 0) return interaction.editReply(MESSAGES.noActiveSessions).catch(() => null);

        const status = options.getBoolean('status');
        const savedLayout = savedRpcLayouts.get(user.id);

        if (!savedLayout) {
            return interaction.editReply({ content: "❌ No saved RPC parameters found to toggle. Run `/247-rpc` first." });
        }

        savedLayout.enabled = status;

        userSessions.forEach(session => {
            session.tokens.forEach(t => syncRichPresenceToClient(t));
        });

        return interaction.editReply({ content: status ? "🟢 Custom Rich Presence state turned **ON**." : "🔴 Custom Rich Presence state turned **OFF** (hidden)." });
    }

    if (commandName === '247-spammer') {
        if (userSessions.length === 0) return interaction.reply({ content: MESSAGES.noActiveSessions, ephemeral: true }).catch(() => null);
        
        const status = options.getBoolean('status');
        const slot = options.getInteger('slot') || 1;
        const sessionIndex = slot - 1;

        if (status === false) {
            stopSpammerLoop(user.id, sessionIndex);
            return interaction.reply({ content: MESSAGES.spammerUpdated("disabled") }).catch(() => null);
        }

        const text = options.getString('text');
        const targetChannelId = options.getString('channel-id');
        const delayMs = options.getInteger('delay');

        if (!text || !targetChannelId || !delayMs) {
            return interaction.reply({ content: "❌ Missing arguments! When enabling (`status: True`), you must fill text, channel-id, and delay configuration metrics.", ephemeral: true }).catch(() => null);
        }

        if (!userSessions[sessionIndex]) {
            return interaction.reply({ content: `<a:rWarning:1494077439670878329> Slot ${slot} does not contain an active session.`, ephemeral: true }).catch(() => null);
        }

        startSpammerLoop(user.id, sessionIndex, userSessions[sessionIndex].tokens, text, targetChannelId, delayMs);
        return interaction.reply({ content: MESSAGES.spammerUpdated("active") }).catch(() => null);
    }

    if (commandName === 'stats') {
        if (userSessions.length === 0) return interaction.reply({ content: MESSAGES.noActiveSessions, ephemeral: true }).catch(() => null);
        let resText = `📊 **Your Active Sessions (${userSessions.length}/4):**\n\n`;
        
        userSessions.forEach((session, sIdx) => {
            resText += `__**Session Slot ${sIdx + 1}:**__\n`;
            session.tokens.forEach((t, tIdx) => {
                const gName = t.selfClient.guilds.cache.get(t.serverId)?.name || "Unknown Server";
                const cName = t.selfClient.channels.cache.get(t.channelId)?.name || "Unknown Channel";
                resText += `<a:rArrow:1493252548826763275> Account ${tIdx + 1}: **${t.username}** | Voice: \`${cName}\` | Server: \`${gName}\` | Live Badge: \`${t.live ? "ON" : "OFF"}\`\n`;
            });
            resText += `\n`;
        });
        
        return interaction.reply({ content: resText, ephemeral: true }).catch(() => null);
    }
});

mainBot.login(process.env.DISCORD_TOKEN);
