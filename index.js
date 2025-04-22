
require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

// Constants
const PRAJALPA_THRESHOLD = 5;
const PRAJALPA_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds
const DATA_FILE = 'data.json';

// Data management
const DataManager = {
  loadData() {
    try {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(data);
    } catch {
      return {};
    }
  },

  saveData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  },

  getUserData(userId) {
    const data = this.loadData();
    if (!data[userId]) {
      data[userId] = {
        prajalpa_score: 0,
        message_history: [],
        last_updated: new Date().toISOString()
      };
      this.saveData(data);
    }
    return data[userId];
  },

  updateUserData(userId, updateFn) {
    const data = this.loadData();
    data[userId] = updateFn(data[userId] || {
      prajalpa_score: 0,
      message_history: [],
      last_updated: new Date().toISOString()
    });
    this.saveData(data);
    return data[userId];
  }
};

// Words that affect prajalpa score
const prajalpaWords = ['gossip', 'idle talk', 'useless talk', 'blah blah', 'drama'];
const krishnaWords = ['krishna', 'hare krishna', 'radha krishna', 'govinda', 'hari'];

// Scoring logic module
const PrajalpaScoring = {
  getScore(userId) {
    return DataManager.getUserData(userId).prajalpa_score;
  },

  incrementScore(userId) {
    return DataManager.updateUserData(userId, (userData) => ({
      ...userData,
      prajalpa_score: (userData.prajalpa_score || 0) + 1,
      message_history: [
        ...userData.message_history,
        new Date().toISOString()
      ],
      last_updated: new Date().toISOString()
    }));
  },

  decrementScore(userId) {
    return DataManager.updateUserData(userId, (userData) => ({
      ...userData,
      prajalpa_score: Math.max(0, (userData.prajalpa_score || 0) - 1),
      last_updated: new Date().toISOString()
    }));
  },

  containsPrajalpa(message) {
    return prajalpaWords.some(word => message.toLowerCase().includes(word));
  },

  containsKrishna(message) {
    return krishnaWords.some(word => message.toLowerCase().includes(word));
  },

  checkExcessivePrajalpa(userId) {
    const userData = DataManager.getUserData(userId);
    const recentMessages = userData.message_history.filter(timestamp => 
      Date.now() - new Date(timestamp).getTime() < PRAJALPA_WINDOW
    );
    return recentMessages.length >= PRAJALPA_THRESHOLD;
  }
};

// Message responses
const Responses = {
  prajalpaDetected: [
    "🌸 You've been talking a lot! Take a break or chant Krishna's name for balance! 🌸",
    "Time to redirect this energy towards Krishna consciousness! 🙏",
    "Remember, every word could be used in Krishna's service instead! 💫",
    "Let's focus on spiritual topics instead! 🌺"
  ],
  getRandomResponse() {
    return this.prajalpaDetected[Math.floor(Math.random() * this.prajalpaDetected.length)];
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
  
  // Handle Krishna mentions (silently decrease score)
  if (PrajalpaScoring.containsKrishna(messageContent)) {
    PrajalpaScoring.decrementScore(message.author.id);
    return;
  }
  
  // Handle prajalpa (only respond if threshold exceeded)
  if (PrajalpaScoring.containsPrajalpa(messageContent)) {
    PrajalpaScoring.incrementScore(message.author.id);
    if (PrajalpaScoring.checkExcessivePrajalpa(message.author.id)) {
      message.reply(Responses.getRandomResponse());
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
