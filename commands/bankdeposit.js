const fs = require('fs');
const path = require('path');
const economy = require('../economyData.js');

const bankFile = path.join(__dirname, '..', 'data', 'bank.json');

function loadBank() {
    if (!fs.existsSync(bankFile)) fs.writeFileSync(bankFile, JSON.stringify({}, null, 2));
    return JSON.parse(fs.readFileSync(bankFile, 'utf-8'));
}

function saveBank(bank) {
    fs.writeFileSync(bankFile, JSON.stringify(bank, null, 2));
}

function ensureBankUser(userId) {
    const bank = loadBank();
    if (!bank[userId]) {
        bank[userId] = { balance: 0 };
        saveBank(bank);
    }
    return bank;
}

module.exports = {
    name: 'deposit',
    description: 'Deposit coins into your bank.',
    usage: 'd.deposit <amount>',
    async execute(message, args) {
        const userId = message.author.id;
        const userEco = economy.ensureEconomyUser(userId);
        const bank = ensureBankUser(userId);

        const amount = args[0]?.toLowerCase() === 'all' ? userEco.balance : parseInt(args[0]);
        if (!amount || amount <= 0) return message.reply('❌ Please specify a valid amount.');

        if (amount > userEco.balance) return message.reply('❌ You do not have enough coins in your wallet.');

        economy.modifyBalance(userId, -amount);
        bank[userId].balance += amount;
        saveBank(bank);

        return message.reply(`✅ Deposited ${economy.DWCOIN_EMOJI}${economy.formatCoins(amount)} into your bank.`);
    }
};
