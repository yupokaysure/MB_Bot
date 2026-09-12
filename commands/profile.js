// commands/profile.js
const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

// File paths
const economyFile = path.join(__dirname, '..', 'data', 'economy.json');
const defenseFile = path.join(__dirname, '..', 'data', 'defenselevels.json');

// Read JSON safely
function readJSON(file) {
    if (!fs.existsSync(file)) return {};
    try {
        return JSON.parse(fs.readFileSync(file, 'utf-8'));
    } catch {
        return {};
    }
}

// Format numbers with commas safely
function formatNumber(num) {
    if (typeof num !== 'number' || isNaN(num)) return '0';
    return num.toLocaleString();
}

module.exports = {
    name: 'profile',
    description: 'View your profile (economy, troops, defense).',
    usage: 'd.profile [@user]',

    async execute(message, args, client, economy) {
        const target = message.mentions.users.first() || message.author;

        // Load all data
        const economyData = readJSON(economyFile);
        const defenseData = readJSON(defenseFile);

        // Default values if user not found
        const userEconomy = economyData[target.id] || {
            balance: 0,
            troops: 0,
            troopsLost: 0,
            blackjackWins: 0,
            totalEarned: 0
        };

        const defenseLevel = defenseData[target.id] ?? 0;

        // Badges
        const isOwner = target.id === '1264764751892709389';
        const isBugHunter = target.id === '989185486876717136';
		const isMastermind = target.id === '905079803516968980';


        let badgesTitle = '';
        if (isOwner) badgesTitle += ' 👑';
        if (isBugHunter) badgesTitle += ' 🐞';
		if (isMastermind) badgesTitle += ' 🧠';


        // Build embed
        const embed = new EmbedBuilder()
            .setColor('#2f3136')
            .setTitle(`🏰 ${target.username}${badgesTitle}'s Profile`)
            .setThumbnail(target.displayAvatarURL({ dynamic: true }))
            .addFields(
                ...(isOwner ? [{ name: '🤩 Owner', value: 'This user is the bot owner!', inline: false }] : []),
                ...(isBugHunter ? [{ name: '🐞 Bug Hunter', value: 'This user helped improve the bot!', inline: false }] : []),
				...(isMastermind ? [{ name: '🧠 Mastermind', value: 'This user is a strategic genius with using the bot!!', inline: false }] : []),
                { name: '💰 Coins', value: `${formatNumber(userEconomy.balance)} ${economy.DWCOIN_EMOJI}`, inline: true },
                { name: '🪖 Troops', value: `${formatNumber(userEconomy.troops)}`, inline: true },
                { name: '💀 Troops Lost', value: `${formatNumber(userEconomy.troopsLost)}`, inline: true },
                { name: '🛡 Defense Level', value: `${formatNumber(defenseLevel)}`, inline: true },
                { name: '🃏 Blackjack Wins', value: `${formatNumber(userEconomy.blackjackWins)}`, inline: true },
                { name: '💵 Total Earned', value: `${formatNumber(userEconomy.totalEarned)}`, inline: true }
            )
            .setFooter({ text: 'Masked Bandits' })
            .setTimestamp();

        return message.channel.send({ embeds: [embed] });
    }
};