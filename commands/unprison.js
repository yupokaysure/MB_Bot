const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

const prisonFile = path.join(__dirname, '..', 'data', 'prisonedRoles.json');
const prisonRoleId = '1532458466264744026';
const logChannelId = '1528896023928373468';
const staffRoleId = '1528808769818071291';

function readPrisonData() {
    if (!fs.existsSync(prisonFile)) fs.writeFileSync(prisonFile, JSON.stringify({}, null, 2));
    return JSON.parse(fs.readFileSync(prisonFile, 'utf-8'));
}
function writePrisonData(data) {
    fs.writeFileSync(prisonFile, JSON.stringify(data, null, 2));
}

module.exports = {
    name: 'unprison',
    description: 'Release a user from prison and restore their previous roles.',
	  staffOnly: true,
    async execute(message) {
        const author = message.member;

        if (!author.roles.cache.has(staffRoleId)) {
            return message.reply('❌ You do not have permission to use this command.');
        }

        const target = message.mentions.members.first();
        if (!target) return message.reply('❌ Please mention a user to unprison.');

        const prisonData = readPrisonData();
        const previousRoles = prisonData[target.id];

        if (!previousRoles) {
            return message.reply('❌ No stored roles found for this user.');
        }

        try {
            // Remove prison role
            await target.roles.remove(prisonRoleId);

            // Restore roles
            for (const roleId of previousRoles) {
                const role = message.guild.roles.cache.get(roleId);
                if (role) await target.roles.add(role).catch(() => {});
            }

            // Remove from prison data
            delete prisonData[target.id];
            writePrisonData(prisonData);

            const embed = new EmbedBuilder()
                .setTitle('🔓 Member Released')
                .setColor('#00ff88')
                .setDescription(`**${target.user.tag}** has been released from prison by **${message.author.tag}**.`)
                .setTimestamp();

            message.channel.send({ embeds: [embed] });

            const logChannel = message.guild.channels.cache.get(logChannelId);
            if (logChannel) logChannel.send({ embeds: [embed] });

        } catch (err) {
            console.error(err);
            message.reply('❌ Failed to unprison that user.');
        }
    }
};
