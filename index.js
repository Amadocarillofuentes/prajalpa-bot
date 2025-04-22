const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Replace 'YOUR_TOKEN_HERE' with process.env.DISCORD_TOKEN
client.login(process.env.DISCORD_TOKEN).catch(console.error);
require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

client.once('ready', () => {
  console.log('Bot is online!');
});

client.on('messageCreate', message => {
  if (message.content.startsWith('!ping')) {
    message.reply('Pong!');
  }
});

client.login(process.env.DISCORD_TOKEN);
