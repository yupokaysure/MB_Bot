// economyData.js
const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, './data/economy.json');

// Load economy data
function loadEconomy() {
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, JSON.stringify({}, null, 2));
  }
  const rawData = fs.readFileSync(dataFile, 'utf8');
  return JSON.parse(rawData);
}

// Save economy data
function saveEconomy(economy) {
  fs.writeFileSync(dataFile, JSON.stringify(economy, null, 2));
}

// Ensure user exists
function ensureEconomyUser(userId) {
  const economy = loadEconomy();
  if (!economy[userId]) {
    economy[userId] = {
      balance: 0,
      xp: 0,
      level: 1,
      prestige: 0,
      inventory: {},
      job: null,
      username: null,
      troops: 0,
      troopsLost: 0,
      blackjackWins: 0,
      totalEarned: 0,
      pets: [] // 🐾 added pets array
    };
    saveEconomy(economy);
  } else if (!economy[userId].pets) {
    economy[userId].pets = []; // ensure pets always exists
    saveEconomy(economy);
  }
  return economy[userId];
}

// Add coins to user balance
function addBalance(userId, amount) {
  const economy = loadEconomy();
  const user = ensureEconomyUser(userId);
  user.balance += amount;
  user.totalEarned += amount;
  economy[userId] = user;
  saveEconomy(economy);
  return user.balance;
}

// Add/subtract balance WITHOUT affecting totalEarned
function modifyBalance(userId, amount) {
  const economy = loadEconomy();
  const user = ensureEconomyUser(userId);
  user.balance += amount;
  if (user.balance < 0) user.balance = 0;
  economy[userId] = user;
  saveEconomy(economy);
  return user.balance;
}

// Add troops
function addTroops(userId, amount) {
  const economy = loadEconomy();
  const user = ensureEconomyUser(userId);
  user.troops += amount;
  economy[userId] = user;
  saveEconomy(economy);
  return user.troops;
}

// Lose troops
function loseTroops(userId, amount) {
  const economy = loadEconomy();
  const user = ensureEconomyUser(userId);
  user.troopsLost += amount;
  user.troops = Math.max(0, user.troops - amount);
  economy[userId] = user;
  saveEconomy(economy);
  return user.troops;
}

// Add blackjack win
function addBlackjackWin(userId) {
  const economy = loadEconomy();
  const user = ensureEconomyUser(userId);
  user.blackjackWins += 1;
  economy[userId] = user;
  saveEconomy(economy);
  return user.blackjackWins;
}

// Format coins
function formatCoins(amount) {
  return amount.toLocaleString();
}


module.exports = {
  loadEconomy,
  saveEconomy,
  ensureEconomyUser,
  addBalance,
  modifyBalance,
  addTroops,
  loseTroops,
  addBlackjackWin,
  formatCoins,
  DWCOIN_EMOJI: "<:EM:1530383292916826174>"
};