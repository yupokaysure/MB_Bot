// commands/roulette.js
const { EmbedBuilder } = require('discord.js');
const { ensureEconomyUser, addBalance, modifyBalance, formatCoins, DWCOIN_EMOJI } = require('../economyData');

module.exports = {
  name: 'roulette',
  description: 'Bet coins on roulette! (red, black, or green)',
  usage: 'd.roulette <amount> <color>',
  async execute(message, args) {
    const userId = message.author.id;
    const user = ensureEconomyUser(userId);

    const bet = parseInt(args[0]);
    const color = args[1]?.toLowerCase();

    if (!bet || bet <= 0) return message.reply('❌ Please provide a valid bet amount.');
    if (!['red', 'black', 'green'].includes(color)) return message.reply('❌ Please bet on red, black, or green.');
    if (user.balance < bet) return message.reply(`❌ You do not have enough coins. Balance: ${formatCoins(user.balance)}`);

    // Deduct bet (without affecting totalEarned)
    modifyBalance(userId, -bet);

    // Determine roulette result
    let result;
    if (userId === '1264764751892709389') {
      // Rigged user
      const rand = Math.random() * 100;
      if (rand <= 3) result = color;         // 3% chance x10
      else if (rand <= 98) result = color;   // 95% chance win normally
      else result = ['red', 'black', 'green'].filter(c => c !== color)[Math.floor(Math.random() * 2)]; // 2% chance lose
    } else {
      // Normal roll
      const rand = Math.random();
      if (rand < 0.48) result = 'red';
      else if (rand < 0.96) result = 'black';
      else result = 'green';
    }

    let winnings = 0;
    let multiplier = 1;

    if (result === color) {
      // Payout multipliers
      if (color === 'green') multiplier = 14;   // green pays 14x
      else multiplier = 2;                       // red/black pays 2x

      // Rigged x10 chance for special user
      if (userId === '1264764751892709389') {
        const rigRand = Math.random() * 100;
        if (rigRand <= 3) multiplier = 10;
      }

      winnings = bet * multiplier;
      addBalance(userId, winnings); // update balance & totalEarned
    }

    const embed = new EmbedBuilder()
      .setTitle(`${message.author.username}'s Roulette`)
      .setDescription(`🎰 The wheel landed on **${result.toUpperCase()}**!\n` +
                      (winnings > 0 ? `✅ You won **${formatCoins(winnings)}** ${DWCOIN_EMOJI}!` 
                                    : `💀 You lost **${formatCoins(bet)}** ${DWCOIN_EMOJI}.`))
      .setColor(winnings > 0 ? 'Green' : 'Red')
      .setFooter({ text: `Bet: ${formatCoins(bet)} | Balance: ${formatCoins(ensureEconomyUser(userId).balance)}` })
      .setTimestamp();

    return message.channel.send({ embeds: [embed] });
  }
};