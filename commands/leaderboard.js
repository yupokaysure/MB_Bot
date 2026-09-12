const fs = require("fs");
const path = require("path");
const { EmbedBuilder } = require("discord.js");
const economy = require("../economyData.js");

const defenseFile = path.join(__dirname, "../data/defenseintel.json");

function safeLoad(file, fallback = {}) {
    try {
        if (fs.existsSync(file)) {
            return JSON.parse(fs.readFileSync(file, "utf8"));
        }
    } catch (err) {
        console.error(`Error loading ${file}:`, err);
    }
    return fallback;
}

module.exports = {
    name: "leaderboard",
    description: "Show the top 10 players in coins, troops, and defense intel.",
    async execute(message) {
        // ✅ Load economy data via helper
        const economyData = economy.loadEconomy();

        // ✅ Load defense intel
        const defenseIntel = safeLoad(defenseFile, {});

        // ✅ Sort top 10
        const topCoins = Object.entries(economyData)
            .sort((a, b) => (b[1].balance || 0) - (a[1].balance || 0))
            .slice(0, 10);

        const topTroops = Object.entries(economyData)
            .sort((a, b) => (b[1].troops || 0) - (a[1].troops || 0))
            .slice(0, 10);

        const topDefense = Object.entries(defenseIntel)
            .sort((a, b) => (b[1] || 0) - (a[1] || 0))
            .slice(0, 10);

        // ✅ Helper: format leaderboard
        const formatLeaderboard = async (entries, type) => {
            const rows = await Promise.all(
                entries.map(async ([userId, data], index) => {
                    const user = await message.client.users.fetch(userId).catch(() => null);
                    const username = user ? user.username : `Unknown (${userId})`;

                    let value = 0;
                    if (type === "coins") value = data.balance || 0;
                    else if (type === "troops") value = data.troops || 0;
                    else if (type === "defense") value = data || 0; // defenseIntel is a number

                    return `**${index + 1}.** ${username} — ${type === "coins" ? economy.DWCOIN_EMOJI + " " : ""}${value.toLocaleString()}`;
                })
            );
            return rows.length > 0 ? rows.join("\n") : "No data";
        };

        // ✅ Create embed
        const embed = new EmbedBuilder()
            .setColor("#FFD700")
            .setTitle("🏆 Leaderboards")
            .addFields(
                {
                    name: "💰 Coins",
                    value: await formatLeaderboard(topCoins, "coins"),
                    inline: false
                },
                {
                    name: "⚔️ Troops",
                    value: await formatLeaderboard(topTroops, "troops"),
                    inline: false
                },
                {
                    name: "🛡 Defense Intel",
                    value: await formatLeaderboard(topDefense, "defense"),
                    inline: false
                }
            )
            .setFooter({ text: "Top 10 players in each category" })
            .setTimestamp();

        await message.channel.send({ embeds: [embed] });
    },
};