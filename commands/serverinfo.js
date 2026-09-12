// commands/serverinfo.js
const { EmbedBuilder } = require('discord.js');

// Troop rank roles, Greenhorn -> Deadeye
const TROOP_RANKS = [
    { name: 'Greenhorn', id: '1528847301999857916' },
    { name: 'Drifter', id: '1528847180763234583' },
    { name: 'Rustler', id: '1528847109757997226' },
    { name: 'Outlaw', id: '1528846932187811890' },
    { name: 'Renegade', id: '1528846827309236446' },
    { name: 'Deadeye', id: '1528846826546004190' },
    { name: 'Advisors', id: '1528934386668535928' },
    { name: 'Staff', id: '1528839137170296985' },
    { name: 'HCOM', id: '1528810059264430260' },
	
];

// Format numbers with commas safely
function formatNumber(num) {
    if (typeof num !== 'number' || isNaN(num)) return '0';
    return num.toLocaleString();
}

module.exports = {
    name: 'serverinfo',
    description: 'View server stats and a breakdown of members by troop rank.',
    usage: '-serverinfo',
    async execute(message, args, client) {
        const guild = message.guild;
        if (!guild) {
            return message.reply('⚠ This command can only be used in a server.');
        }

        // Member cache is warmed once at startup (see index.js clientReady
        // handler), so we just read from it here instead of re-fetching
        // everyone on every single command call.
        if (guild.members.cache.size < guild.memberCount) {
            console.warn(`[ServerInfo] Member cache (${guild.members.cache.size}) is smaller than memberCount (${guild.memberCount}) — counts below may be incomplete.`);
        }

        const rankFields = TROOP_RANKS.map(rank => {
            const role = guild.roles.cache.get(rank.id);
            const count = role ? role.members.size : 0;
            return { name: rank.name, value: formatNumber(count), inline: true };
        });

        const embed = new EmbedBuilder()
            .setColor('#2f3136')
            .setTitle(`🏰 ${guild.name} — Server Info`)
            .setThumbnail(guild.iconURL({ dynamic: true }))
            .addFields(
                { name: '👥 Total Members', value: formatNumber(guild.memberCount), inline: false },
                ...rankFields
            )
            .setFooter({ text: 'Masked Bandits' })
            .setTimestamp();

        return message.channel.send({ embeds: [embed] });
    }
};