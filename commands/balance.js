const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
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
    name: 'balance',
    description: 'Check your bank and wallet balance.',
    usage: 'd.balance',
    async execute(message) {
        const userId = message.author.id;
        const userEco = economy.ensureEconomyUser(userId);
        const bank = ensureBankUser(userId);

        const embed = new EmbedBuilder()
            .setTitle("🏦 Your Bank Account")
            .setColor("#FFD700")
            .setDescription(
                `**Wallet:** ${economy.DWCOIN_EMOJI}${economy.formatCoins(userEco.balance)}\n` +
                `**Bank:** ${economy.DWCOIN_EMOJI}${economy.formatCoins(bank[userId].balance)}`
            )
            .setFooter({ text: `${message.author.username}'s Balance` })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};
