
require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

// Initialize client with required intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

// In-memory storage for prajalpa scores
const prajalpaScores = new Map();

// Words that affect prajalpa score
const prajalpaWords = ['gossip', 'idle talk', 'useless talk', 'blah blah', 'drama'];
const krishnaWords = ['krishna', 'hare krishna', 'radha krishna', 'govinda', 'hari'];

// Scoring logic module
const PrajalpaScoring = {
  getScore(userId) {
    return prajalpaScores.get(userId) || 0;
  },

  incrementScore(userId) {
    const currentScore = this.getScore(userId);
    prajalpaScores.set(userId, currentScore + 1);
    return currentScore + 1;
  },

  decrementScore(userId) {
    const currentScore = this.getScore(userId);
    prajalpaScores.set(userId, currentScore - 1);
    return currentScore - 1;
  },

  containsPrajalpa(message) {
    return prajalpaWords.some(word => message.toLowerCase().includes(word));
  },

  containsKrishna(message) {
    return krishnaWords.some(word => message.toLowerCase().includes(word));
  }
};

// Message responses
const Responses = {
  prajalpaDetected: [
    "Uh oh! More prajalpa detected! 🫢",
    "Watch out for idle talk! 👀",
    "Careful with the gossip! 🤭",
    "Less drama, more Krishna! 🙏"
  ],
  krishnaDetected: [
    "Jaya Shri Krishna! 🌸 Your prajalpa reduced 🙏",
    "Haribol! 🙏",
    "All glories to Lord Krishna! 🌺",
    "Thank you for remembering Krishna! 💫"
  ],
  getRandomResponse(type) {
    const responses = type === 'prajalpa' ? this.prajalpaDetected : this.krishnaDetected;
    return responses[Math.floor(Math.random() * responses.length)];
  }
};

client.once('ready', () => {
  console.log('Bot is online!');
});

client.on('messageCreate', message => {
  // Ignore bot messages
  if (message.author.bot) return;

  // Handle !ping command
  if (message.content.startsWith('!ping')) {
    message.reply('Pong!');
    return;
  }

  // Handle !prajalpa command
  if (message.content.startsWith('!prajalpa')) {
    const score = PrajalpaScoring.getScore(message.author.id);
    message.reply(`🌀 Your current Prajalpa Score: ${score}`);
    return;
  }

  // Process message content for prajalpa tracking
  const messageContent = message.content.toLowerCase();
  
  if (PrajalpaScoring.containsPrajalpa(messageContent)) {
    PrajalpaScoring.incrementScore(message.author.id);
    message.reply(Responses.getRandomResponse('prajalpa'));
  }
  
  if (PrajalpaScoring.containsKrishna(messageContent)) {
    PrajalpaScoring.decrementScore(message.author.id);
    message.reply(Responses.getRandomResponse('krishna'));
  }
});

client.login(process.env.DISCORD_TOKEN);
