require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const fs = require("fs");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Constants
const PRAJALPA_THRESHOLD = 50; // New threshold for warnings
const DATA_FILE = "data.json";

// Data management
const DataManager = {
  loadData() {
    try {
      const data = fs.readFileSync(DATA_FILE, "utf8");
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
        last_updated: new Date().toISOString(),
      };
      this.saveData(data);
    }
    return data[userId];
  },

  addMessageToHistory(userId, message) {
    return this.updateUserData(userId, (userData) => ({
      ...userData,
      message_history: [
        ...userData.message_history,
        {
          content: message,
          timestamp: new Date().toISOString(),
        },
      ],
    }));
  },

  updateUserData(userId, updateFn) {
    const data = this.loadData();
    data[userId] = updateFn(
      data[userId] || {
        prajalpa_score: 0,
        message_history: [],
        last_updated: new Date().toISOString(),
      },
    );
    this.saveData(data);
    return data[userId];
  },
};

// Words that affect prajalpa score
const prajalpaWords = [
  "gossip",
  "idle talk",
  "useless talk",
  "blah blah",
  "drama",
];
const krishnaWords = [
  "krishna",
  "hare krishna",
  "radha krishna",
  "govinda",
  "hari",
];

// Scoring logic module
const PrajalpaScoring = {
  getScore(userId) {
    return DataManager.getUserData(userId).prajalpa_score;
  },

  incrementScore(userId, message) {
    const userData = DataManager.updateUserData(userId, (userData) => ({
      ...userData,
      prajalpa_score: (userData.prajalpa_score || 0) + 1,
      last_updated: new Date().toISOString(),
    }));
    DataManager.addMessageToHistory(userId, message);
    return userData;
  },

  decrementScore(userId, message) {
    const userData = DataManager.updateUserData(userId, (userData) => ({
      ...userData,
      prajalpa_score: (userData.prajalpa_score || 0) - 1,
      last_updated: new Date().toISOString(),
    }));
    DataManager.addMessageToHistory(userId, message);
    return userData;
  },

  containsPrajalpa(message) {
    return prajalpaWords.some((word) => message.toLowerCase().includes(word));
  },

  containsKrishna(message) {
    return krishnaWords.some((word) => message.toLowerCase().includes(word));
  },

  checkExcessivePrajalpa(userId) {
    const userData = DataManager.getUserData(userId);
    const recentMessages = userData.message_history.filter(
      (timestamp) =>
        Date.now() - new Date(timestamp).getTime() < PRAJALPA_WINDOW,
    );
    return recentMessages.length >= PRAJALPA_THRESHOLD;
  },
};

// Message responses
const Responses = {
  prajalpaDetected: [
    "🌸 You've been talking a lot! Take a break or chant Krishna's name for balance! 🌸",
    "Time to redirect this energy towards Krishna consciousness! 🙏",
    "Remember, every word could be used in Krishna's service instead! 💫",
    "Let's focus on spiritual topics instead! 🌺",
  ],
  getRandomResponse() {
    return this.prajalpaDetected[
      Math.floor(Math.random() * this.prajalpaDetected.length)
    ];
  },
};

client.once("ready", () => {
  console.log("Bot is online!");
});

client.on("messageCreate", (message) => {
  // Ignore bot messages
  if (message.author.bot) return;

  // Handle !ping command
  if (message.content.startsWith("!ping")) {
    message.reply("Pong!");
    return;
  }

  // Handle !prajalpa command
  if (message.content.startsWith("!prajalpa")) {
    const score = PrajalpaScoring.getScore(message.author.id);
    message.reply(`🌀 Your current Prajalpa Score: ${score}`);
    return;
  }

  // Process message content for prajalpa tracking
  const messageContent = message.content.toLowerCase();

  // Handle Krishna mentions (decrease score)
  if (PrajalpaScoring.containsKrishna(messageContent)) {
    const userData = PrajalpaScoring.decrementScore(
      message.author.id,
      messageContent,
    );
    return;
  }

  // Handle prajalpa
  if (PrajalpaScoring.containsPrajalpa(messageContent)) {
    const userData = PrajalpaScoring.incrementScore(
      message.author.id,
      messageContent,
    );

    // Only send warning if score exceeds threshold
    if (userData.prajalpa_score > PRAJALPA_THRESHOLD) {
      message.reply(
        `<@${message.author.id}>, your prajalpa score (${userData.prajalpa_score}) is getting too high! Please take a break.`,
      );
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
