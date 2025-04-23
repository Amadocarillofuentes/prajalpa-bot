require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const fs = require("fs");
const cron = require('node-cron');

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
        last_hour_score: 0,
        last_notified: new Date(0).toISOString(),
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
const krishnaWords = [
  "krishna", "radha", "govinda", "gauranga", "nityananda", "radhanath", "prabhupada",
  "acharya", "bhakti", "bhajan", "japa", "kirtan", "sankirtan", "vaishnava", "sadhu",
  "seva", "guru", "parampara", "bhagavatam", "gita", "harinam", "tulasi", "vani",
  "shiksha", "shastra", "mangala", "arati", "krishna-katha", "satvik", "shravanam",
  "smaranam", "dhyana", "mantra", "darshan", "prasadam", "satsang", "mahaprabhu",
  "gaura", "namabhasa", "prema", "rasa", "moksha", "vaikuntha", "vrindavan", "goloka",
  "bhakta", "brahmachari", "nishkama", "shuddha", "saranagati", "anukul", "kripa",
  "dharma", "yatra", "ekadashi", "janmashtami", "kartik", "damodar", "purusha",
  "radhastami", "govardhan", "hare krishna", "jai sri radhe", "radha krishna ki jai",
  "🙏", "📿", "🪔", "🌸", "🌺", "🕉️", "🛕", "💫", "✨", "🕊️", "💖", "🎶", "📖",
  "🧘‍♂️", "🧘‍♀️", "🌅", "🪷", "🍃", "🧡", "💜", "☀️", "🐚", "🔔", "💐", "🧂"
];

const prajalpaWords = [
  "gossip", "roast", "cringe", "flex", "bro", "bruh", "dude", "dawg", "lol", "lmao",
  "rofl", "chill", "vibe", "fake", "sus", "simp", "crush", "swag", "yolo", "dead",
  "boring", "bored", "bore", "drama", "beef", "no cap", "fr", "ong", "random",
  "trash", "garbage", "stalk", "bae", "flirt", "dating", "otp", "netflix", "youtube",
  "insta", "ig", "tiktok", "snap", "party", "rave", "club", "yaar", "brocode",
  "sheesh", "glitch", "npc", "sigma", "alpha", "toxic", "ratio", "prank", "flop",
  "lowkey", "highkey", "cancel", "canceled", "dragging", "expose", "😂", "🤣", "😭",
  "😏", "🙄", "😒", "😎", "👀", "💀", "💅", "😩", "🫢", "🫣", "🧍‍♂️", "🧍‍♀️", "🤡",
  "💔", "🔥", "🤳", "📸", "😹", "👻", "🫥", "🤷‍♂️", "🤷‍♀️", "🙈", "😜", "😬", "😈",
  "😶‍🌫️", "🎉", "🤫", "🧠"
];

// Scoring logic module
const PrajalpaScoring = {
  getScore(userId) {
    return DataManager.getUserData(userId).prajalpa_score;
  },

  incrementScore(userId, message) {
    const now = new Date();
    const userData = DataManager.updateUserData(userId, (userData) => {
      const hourAgo = new Date(now - 60 * 60 * 1000);
      const lastNotified = new Date(userData.last_notified);
      const lastUpdated = new Date(userData.last_updated);
      
      // Reset hourly score if last update was more than an hour ago
      const hourly_score = lastUpdated < hourAgo ? 1 : (userData.last_hour_score || 0) + 1;
      
      return {
        ...userData,
        prajalpa_score: (userData.prajalpa_score || 0) + 1,
        last_hour_score: hourly_score,
        last_updated: now.toISOString(),
      };
    });
    DataManager.addMessageToHistory(userId, message);
    return userData;
  },

  checkPrajalpaSpikeAndNotify(userId, message) {
    const userData = DataManager.getUserData(userId);
    const now = new Date();
    const lastNotified = new Date(userData.last_notified);
    const hourAgo = new Date(now - 60 * 60 * 1000);

    if (userData.last_hour_score > 50 && lastNotified < hourAgo) {
      const spikePrajalpaMessages = [
        "🎤 Are you delivering a TED talk today? Ease the prajalpa 😄",
        "🌀 Has entered Ultra Prajalpa Mode!",
        "📢 Breaking news: Local devotee sets new prajalpa record!",
        "🎭 Is this a monologue competition?",
      ];
      const randomMessage = spikePrajalpaMessages[Math.floor(Math.random() * spikePrajalpaMessages.length)];
      
      DataManager.updateUserData(userId, (userData) => ({
        ...userData,
        last_notified: now.toISOString(),
      }));

      return `<@${userId}> ${randomMessage}`;
    }
    return null;
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

// Leaderboard System
class LeaderboardSystem {
  constructor() {
    this.LEADERBOARD_CHANNEL_ID = process.env.LEADERBOARD_CHANNEL_ID;
    this.YESTERDAY_SCORES_FILE = "yesterdayScores.json";
    this.leaderboardMessage = null;
  }

  async initialize(client) {
    const channel = await client.channels.fetch(this.LEADERBOARD_CHANNEL_ID);
    const messages = await channel.messages.fetch({ limit: 1 });
    this.leaderboardMessage = messages.first() || await channel.send("Initializing leaderboard...");
  }

  loadYesterdayScores() {
    try {
      return JSON.parse(fs.readFileSync(this.YESTERDAY_SCORES_FILE, 'utf8'));
    } catch {
      return {};
    }
  }

  saveYesterdayScores(scores) {
    fs.writeFileSync(this.YESTERDAY_SCORES_FILE, JSON.stringify(scores, null, 2));
  }

  getScoreEmoji(currentScore, yesterdayScore) {
    if (yesterdayScore === undefined) return "🆕";
    return currentScore > yesterdayScore ? "📈" : "📉";
  }

  async updateLeaderboard(client) {
    try {
      const channel = await client.channels.fetch(this.LEADERBOARD_CHANNEL_ID);
      if (!channel) {
        throw new Error('Leaderboard channel not found. Please check LEADERBOARD_CHANNEL_ID in .env');
      }

      const guild = client.guilds.cache.first();
      if (!guild) {
        throw new Error('No guild found');
      }

      const verifiedRole = guild.roles.cache.find(role => role.name === "verified");
      if (!verifiedRole) {
        throw new Error('Verified role not found. Please create a role named "verified"');
      }

      const yesterdayScores = this.loadYesterdayScores();
      const currentScores = {};
      const leaderboardEntries = [];

      // Get current scores for verified users
      for (const [userId, userData] of Object.entries(DataManager.loadData())) {
      const member = await guild.members.fetch(userId).catch(() => null);
      if (member && member.roles.cache.has(verifiedRole.id)) {
        currentScores[userId] = userData.prajalpa_score;
        leaderboardEntries.push({
          userId,
          username: member.user.username,
          score: userData.prajalpa_score,
          change: this.getScoreEmoji(userData.prajalpa_score, yesterdayScores[userId])
        });
      }
    }

    // Sort entries by score (descending)
    leaderboardEntries.sort((a, b) => b.score - a.score);

    // Generate leaderboard message
    const leaderboardContent = [
      "**📊 Daily Prajalpa Leaderboard**",
      "```",
      "Rank  User                Score  Change",
      "----------------------------------------"
    ];

    leaderboardEntries.forEach((entry, index) => {
      const rank = (index + 1).toString().padEnd(4);
      const username = entry.username.padEnd(20);
      const score = entry.score.toString().padEnd(6);
      leaderboardContent.push(`${rank} ${username} ${score} ${entry.change}`);
    });

    leaderboardContent.push("```");
    leaderboardContent.push(`Last updated: ${new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })}`);

    // Update the message
    await this.leaderboardMessage.edit(leaderboardContent.join('\n'));
    
      // Save current scores as yesterday's scores
      this.saveYesterdayScores(currentScores);
    } catch (error) {
      console.error('Error updating leaderboard:', error);
      throw error;
    }
  }
}

const leaderboardSystem = new LeaderboardSystem();

client.once("ready", async () => {
  console.log("Bot is online!");
  await leaderboardSystem.initialize(client);
  
  // Schedule daily update at 11:59 PM IST
  cron.schedule('59 23 * * *', () => leaderboardSystem.updateLeaderboard(client), {
    scheduled: true,
    timezone: "Asia/Kolkata"
  });
});

client.on("messageCreate", (message) => {
  // Ignore bot messages
  if (message.author.bot) return;

  // Handle !help command
  if (message.content.startsWith("!help")) {
    const helpEmbed = {
      color: 0x0099ff,
      title: '🌸 Prajalpa Bot Commands',
      description: 'Here are all the available commands:',
      fields: [
        { name: '!help', value: 'Shows this help message' },
        { name: '!ping', value: 'Check if the bot is responsive' },
        { name: '!prajalpa', value: 'Check your current prajalpa score' }
      ],
      footer: { text: 'Stay mindful of prajalpa! 🙏' }
    };
    message.reply({ embeds: [helpEmbed] });
    return;
  }

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

  // Handle !leaderboard command
  if (message.content.startsWith("!leaderboard")) {
    (async () => {
      try {
        await leaderboardSystem.updateLeaderboard(client);
        const channelLink = `<#${process.env.LEADERBOARD_CHANNEL_ID}>`;
        message.reply(`Leaderboard has been updated! Check ${channelLink}`);
      } catch (error) {
        message.reply(`Error updating leaderboard: ${error.message}`);
      }
    })();
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

    // Check for prajalpa spike
    const spikeMessage = PrajalpaScoring.checkPrajalpaSpikeAndNotify(message.author.id, message);
    if (spikeMessage) {
      message.channel.send(spikeMessage);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
require('./server');  // Keep the server alive

