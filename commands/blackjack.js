const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { ensureEconomyUser, addBalance, modifyBalance, addBlackjackWin, DWCOIN_EMOJI, formatCoins } = require('../economydata');

const suits = ['♠️','♥️','♦️','♣️'];
const ranks = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];

function createDeck() {
    const deck = [];
    for (const suit of suits) {
        for (const rank of ranks) {
            deck.push({ suit, rank });
        }
    }
    return deck.sort(() => Math.random() - 0.5);
}

function handValue(hand) {
    let value = 0;
    let aces = 0;
    for (const card of hand) {
        if (card.rank === 'A') { value += 11; aces++; }
        else if (['J','Q','K'].includes(card.rank)) value += 10;
        else value += parseInt(card.rank);
    }
    while (value > 21 && aces > 0) { value -= 10; aces--; }
    return value;
}

// Determine multiplier
function getWinMultiplier(userId) {
    // Special user rigged multiplier
    if (userId === "1264764751892709389") {
        const rand = Math.random() * 100;
        if (rand <= 3) return 10; // 3% x10 multiplier
        return 1;
    }

    // Normal logic for others
    const rand = Math.random() * 100;
    if (rand <= 0.1) return 50;   // 0.1%
    if (rand <= 3.1) return 5;    // 3%
    if (rand <= 8.1) return 3;    // 5%
    return 1;
}

module.exports = {
    name: 'blackjack',
    description: 'Play blackjack and win coins!',
    async execute(message, args) {
        const userId = message.author.id;
        let user = ensureEconomyUser(userId);

        const bet = parseInt(args[0]);
        if (!bet || bet <= 0) return message.reply('❌ Please provide a valid bet amount.');
        if (user.balance < bet) return message.reply('❌ You do not have enough coins.');

        // Deduct bet WITHOUT affecting totalEarned
        modifyBalance(userId, -bet);
        user = ensureEconomyUser(userId);

        let deck = createDeck();
        let playerHand = [deck.pop(), deck.pop()];
        let dealerHand = [deck.pop(), deck.pop()];

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('hit').setLabel('Hit').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('stand').setLabel('Stand').setStyle(ButtonStyle.Success)
            );

        const getEmbed = (desc) => new EmbedBuilder()
            .setTitle(`${message.author.username}'s Blackjack`)
            .setDescription(desc)
            .setColor('Random')
            .setFooter({ text: `Bet: ${formatCoins(bet)} | Balance: ${formatCoins(user.balance)} | Blackjack Wins: ${user.blackjackWins}` });

        let embed = getEmbed(
            `Your hand: ${playerHand.map(c => `${c.rank}${c.suit}`).join(' ')}\nValue: ${handValue(playerHand)}\n\nDealer: ${dealerHand[0].rank}${dealerHand[0].suit} ??`
        );

        const msg = await message.channel.send({ embeds: [embed], components: [row] });

        const filter = i => i.user.id === userId;
        const collector = msg.channel.createMessageComponentCollector({ filter, time: 60000 });
        let ended = false;

        collector.on('collect', async i => {
            if (ended) return;

            // HIT PHASE
            if (i.customId === 'hit') {
                playerHand.push(deck.pop());
                let playerVal = handValue(playerHand);

                // SPECIAL USER RIGGED: Prevent bust 95% of the time
                if (userId === "1264764751892709389" && playerVal > 21) {
                    const riggedRoll = Math.random() * 100;
                    if (riggedRoll <= 95) {
                        // Remove last card and replace with something safe
                        playerHand.pop();
                        playerHand.push({ rank: '2', suit: '♠️' });
                        playerVal = handValue(playerHand);
                    }
                }

                if (playerVal > 21) {
                    ended = true;
                    collector.stop();
                    embed = getEmbed(
                        `Your hand: ${playerHand.map(c => `${c.rank}${c.suit}`).join(' ')} (Value: ${playerVal})\n\n💀 You busted! Dealer wins.`
                    );
                    await i.update({ embeds: [embed], components: [] });
                    return;
                }

                embed = getEmbed(
                    `Your hand: ${playerHand.map(c => `${c.rank}${c.suit}`).join(' ')}\nValue: ${playerVal}\n\nDealer: ${dealerHand[0].rank}${dealerHand[0].suit} ??`
                );
                await i.update({ embeds: [embed], components: [row] });
            }

            // STAND PHASE
            else if (i.customId === 'stand') {
                ended = true;
                collector.stop();

                while (handValue(dealerHand) < 17) {
                    dealerHand.push(deck.pop());
                }

                const playerVal = handValue(playerHand);
                const dealerVal = handValue(dealerHand);
                let resultText = '';

                // SPECIAL USER RIGGED: 95% forced win
                if (userId === "1264764751892709389") {
                    const riggedRoll = Math.random() * 100;
                    if (riggedRoll <= 95) {
                        let multiplier = getWinMultiplier(userId);
                        const winnings = bet * 2 * multiplier;
                        addBalance(userId, winnings);
                        addBlackjackWin(userId);
                        user = ensureEconomyUser(userId);
                        resultText = `🎉 You win! You earned ${DWCOIN_EMOJI}${formatCoins(winnings)}${multiplier > 1 ? ` (x${multiplier} multiplier!)` : ''}.`;
                    } else {
                        // Natural game result (5% chance)
                        if (dealerVal > 21 || playerVal > dealerVal) {
                            let multiplier = getWinMultiplier(userId);
                            const winnings = bet * 2 * multiplier;
                            addBalance(userId, winnings);
                            addBlackjackWin(userId);
                            user = ensureEconomyUser(userId);
                            resultText = `🎉 You win! You earned ${DWCOIN_EMOJI}${formatCoins(winnings)}${multiplier > 1 ? ` (x${multiplier} multiplier!)` : ''}.`;
                        } else if (playerVal === dealerVal) {
                            modifyBalance(userId, bet);
                            user = ensureEconomyUser(userId);
                            resultText = `🤝 It's a tie! Your bet of ${DWCOIN_EMOJI}${formatCoins(bet)} is returned.`;
                        } else {
                            resultText = `💀 Dealer wins! You lost ${DWCOIN_EMOJI}${formatCoins(bet)}.`;
                        }
                    }
                }

                // NORMAL LOGIC
                else {
                    if (dealerVal > 21 || playerVal > dealerVal) {
                        let multiplier = getWinMultiplier(userId);
                        const winnings = bet * 2 * multiplier;
                        addBalance(userId, winnings);
                        addBlackjackWin(userId);
                        user = ensureEconomyUser(userId);
                        resultText = `🎉 You win! You earned ${DWCOIN_EMOJI}${formatCoins(winnings)}${multiplier > 1 ? ` (x${multiplier} multiplier!)` : ''}.`;
                    } else if (playerVal === dealerVal) {
                        modifyBalance(userId, bet);
                        user = ensureEconomyUser(userId);
                        resultText = `🤝 It's a tie! Your bet of ${DWCOIN_EMOJI}${formatCoins(bet)} is returned.`;
                    } else {
                        resultText = `💀 Dealer wins! You lost ${DWCOIN_EMOJI}${formatCoins(bet)}.`;
                    }
                }

                embed = getEmbed(
                    `Your hand: ${playerHand.map(c => `${c.rank}${c.suit}`).join(' ')} (Value: ${playerVal})\nDealer hand: ${dealerHand.map(c => `${c.rank}${c.suit}`).join(' ')} (Value: ${dealerVal})\n\n${resultText}`
                );

                await i.update({ embeds: [embed], components: [] });
            }
        });

        collector.on('end', async () => {
            if (!ended) {
                embed = getEmbed('⏰ Time\'s up! Game ended.');
                await msg.edit({ embeds: [embed], components: [] });
            }
        });
    }
};