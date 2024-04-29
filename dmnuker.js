require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { Client } = require('discord.js-selfbot-v13');
const { v4: uuidv4 } = require('uuid');
const client = new Client();

const editedText = process.env.EDITED_TEXT;
const minDelay = parseInt(process.env.MIN_DELAY, 10) || 500;
const maxDelay = parseInt(process.env.MAX_DELAY, 10) || 2000;

const allowedExtensions = [
    ".mp4", ".avi", ".mov", ".mkv", ".flv", ".wmv", ".webm", // Video
    ".jpg", ".jpeg", ".png", ".gif", // Image
    ".mp3", ".wav", ".ogg", ".flac", ".m4a", // Audio
    ".txt", ".json", // Text
];

if (!editedText) {
    console.error('Edited text is empty. Please check your .env file.');
    process.exit(1);
}

(async () => {
    client.on('ready', async () => {
        console.log(`${client.user.username} is ready!`);
    });

    client.on('messageCreate', async message => {
        if (message.author.id === client.user.id) {
            if (message.content.toLowerCase() === '.delete') {
                const messages = await fetchAndLogMessages(message, 'delete_history.txt');
                await deleteMessages(messages);
            } else if (message.content.toLowerCase() === '.edit') {
                const messages = await fetchAndLogMessages(message, 'edit_history.txt');
                await editMessages(messages, editedText);
            }
        }
    });

    async function fetchAndLogMessages(message, fileName) {
        const channel = message.channel;
        let folderName = channel.type === 'GUILD_TEXT' ? 'guild-' + channel.guild.name + '-' + channel.name : 'dm-' + channel.recipient?.username;
        if (channel.type === 'GROUP_DM') {
            folderName = 'group-' + channel.name;
        }

        const baseDir = path.join(__dirname, 'channel_history');
        const channelDir = path.join(baseDir, folderName.replace(/[^a-zA-Z0-9-]/g, '_'));
        const historyPath = path.join(channelDir, fileName);
        const attachmentDir = path.join(channelDir, 'attachments');

        fs.mkdirSync(channelDir, {
            recursive: true
        });
        fs.mkdirSync(attachmentDir, {
            recursive: true
        });

        let allMessages = [];
        let lastId;
        while (true) {
            const options = {
                limit: 100,
                before: lastId
            };
            const messages = await channel.messages.fetch(options);
            if (messages.size === 0) break;

            messages.forEach(msg => {
                allMessages.push(msg);
                fs.appendFileSync(historyPath, `${msg.author.tag}: ${msg.content}\n`);
                msg.attachments.forEach(async (attachment) => {
                    const url = attachment.url.split('?')[0];
                    const extension = path.extname(url).toLowerCase();
                    if (allowedExtensions.includes(extension)) {
                        const attachmentPath = path.join(attachmentDir, `${uuidv4()}${extension}`);
                        const response = await axios({
                            method: 'get',
                            url: attachment.url,
                            responseType: 'stream'
                        });
                        response.data.pipe(fs.createWriteStream(attachmentPath));
                    }
                });
            });
            lastId = messages.last().id;
        }
        return allMessages;
    }

    const skippableMessageTypes = [
        "GUILD_MEMBER_JOIN",
        "CHANNEL_PINNED_MESSAGE",
        "USER_PREMIUM_GUILD_SUBSCRIPTION_TIER_1",
        "USER_PREMIUM_GUILD_SUBSCRIPTION_TIER_2",
        "USER_PREMIUM_GUILD_SUBSCRIPTION_TIER_3",
        "USER_PREMIUM_GUILD_SUBSCRIPTION",
        "THREAD_CREATED",
        "THREAD_STARTER_MESSAGE",
        "RECIPIENT_ADD",
        "RECIPIENT_REMOVE",
        "CALL",
        "CHANNEL_NAME_CHANGE",
        "CHANNEL_ICON_CHANGE"
    ];

    async function deleteMessages(messages) {
        for (const msg of messages) {
            if (msg.author.id !== client.user.id || skippableMessageTypes.includes(msg.type)) {
                continue;
            }
            await delayRandom(minDelay, maxDelay);
            await msg.delete().catch(console.error);
        }
        console.log('All messages deleted.');
    }

    async function editMessages(messages, newText) {
        if (!newText) {
            console.error('No text provided for editing messages.');
            return;
        }
        for (const msg of messages) {
            if (msg.author.id !== client.user.id || skippableMessageTypes.includes(msg.type)) {
                continue;
            }
            await delayRandom(minDelay, maxDelay);
            await msg.edit(newText).catch(console.error);
        }
        console.log('All messages edited.');
    }

    async function delayRandom(min = 500, max = 2000) {
        const delayTime = Math.floor(Math.random() * (max - min + 1) + min);
        return new Promise(resolve => setTimeout(resolve, delayTime));
    }

    client.login(process.env.DISCORD_TOKEN);
})();