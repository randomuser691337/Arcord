const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const readline = require('readline');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

function getToken() {
    if (fs.existsSync('token.txt')) {
        return fs.readFileSync('token.txt', 'utf8').trim();
    } else {
        return null;
    }
}

function askForToken() {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question('Please enter your Discord bot token: ', (token) => {
            rl.close();
            fs.writeFileSync('token.txt', token);
            resolve(token);
        });
    });
}

async function fetchAllMessages(channel) {
    let messages = [];
    let lastMessageId;

    while (true) {
        const options = { limit: 100 };
        if (lastMessageId) {
            options.before = lastMessageId;
        }

        const fetchedMessages = await channel.messages.fetch(options);
        messages.push(...fetchedMessages.values());
        if (fetchedMessages.size !== 100) break;

        lastMessageId = fetchedMessages.last().id;
    }

    return messages.reverse();
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function start() {
    let token = getToken();
    if (!token) {
        token = await askForToken();
    }

    rl.question('Please enter the server ID: ', async (serverId) => {
        rl.close();

        client.once('ready', async () => {
            console.log(`Logged in as ${client.user.tag}!`);

            const guild = client.guilds.cache.get(serverId);
            if (!guild) {
                console.error('Guild not found');
                process.exit(1);
            }

            const allMessages = [];

            for (const [channelId, channel] of guild.channels.cache) {
                if (channel.isTextBased()) {
                    console.log(`Fetching messages from ${channel.name}...`);
                    fs.writeFileSync(`${serverId}.json`, JSON.stringify(allMessages, null, 2));
                    const messages = await fetchAllMessages(channel);

                    for (const message of messages) {
                        allMessages.push({
                            name: message.author.username,
                            userid: message.author.id,
                            channel: channel.name,
                            contents: message.content,
                            pfp: message.author.displayAvatarURL(),
                            time: message.createdTimestamp
                        });
                    }
                } else {
                    console.log('Skipping: ' + channel.name + " because it's not archivable");
                }
            }

            fs.writeFileSync(`${serverId}.json`, JSON.stringify(allMessages, null, 2));
            console.log(`Done! Check ${serverId}.json for your archive.`);

            client.destroy();
        });

        client.login(token);
    });
}

start();