const path = require('path');
const fs = require('fs');
const economy = require('../economyData.js');

const cooldownsFile = path.join(__dirname, '../data/cooldowns.json');
let cooldownsData = {};

// Load cooldowns
function loadCooldowns() {
  if (fs.existsSync(cooldownsFile)) {
    try {
      cooldownsData = JSON.parse(fs.readFileSync(cooldownsFile));
    } catch {
      cooldownsData = {};
    }
  }
}

// Save cooldowns
function saveCooldowns() {
  fs.writeFileSync(cooldownsFile, JSON.stringify(cooldownsData, null, 2));
}

loadCooldowns();

const COOLDOWN = 60 * 60 * 1000; // 1 hour

module.exports = {
  name: 'work',
  description: 'Work to earn some coins.',

  async execute(message) {
    const userId = message.author.id;
    const now = Date.now();

    // Ensure user
    economy.ensureEconomyUser(userId);

    // Check cooldown
    if (cooldownsData[userId] && now < cooldownsData[userId] + COOLDOWN) {
      const timeLeft = cooldownsData[userId] + COOLDOWN - now;
      const minutes = Math.floor(timeLeft / 60000);
      const seconds = Math.floor((timeLeft % 60000) / 1000);
      return message.reply(`⏳ You must wait ${minutes}m ${seconds}s before working again.`);
    }

    // Reward: 450–900 coins
    const earnings = Math.floor(Math.random() * (3000 - 1000 + 1)) + 1000;
    economy.addBalance(userId, earnings);

    // Set cooldown
    cooldownsData[userId] = now;
    saveCooldowns();

    message.channel.send(`💼 You worked hard and earned **${economy.formatCoins(earnings)}** ${economy.DWCOIN_EMOJI}!`);
  }
};