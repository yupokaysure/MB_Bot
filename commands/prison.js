const fs = require('fs');
const path = require('path');
const { EmbedBuilder, PermissionsBitField } = require('discord.js');

const prisonFile = path.join(__dirname, '..', 'data', 'prisonedRoles.json');
const prisonRoleId = '1532458466264744026';
const logChannelId = '1528896023928373468';
const staffRoleId = '1528808769818071291';

// Ensure prisonedRoles.json exists
function readPrisonData() {
    if (!fs.existsSync(prisonFile)) fs.writeFileSync(prisonFile, JSON.stringify({}, null, 2));
    return JSON.parse(fs.readFileSync(prisonFile, 'utf-8'));
}
function writePrisonData(data) {
    fs.writeFileSync(prisonFile, JSON.stringify(data, null, 2));
}

module.exports = {
    name: 'prison',
    description: 'Remove all roles from one or more users and give them the prison role.',
	  staffOnly: true,
    async execute(message) {
        const author = message.member;

        // Permission check
        if (!author.roles.cache.has(staffRoleId)) {
            return message.reply('❌ You do not have permission to use this command.');
        }

        const targets = [...message.mentions.members.values()];
        if (targets.length === 0) return message.reply('❌ Please mention at least one user to imprison.');

        const prisonData = readPrisonData();

        const imprisoned = [];
        const skipped = [];
        const failed = [];

        for (const target of targets) {
            if (target.id === message.author.id) {
                skipped.push(`${target.user.tag} (cannot imprison yourself)`);
                continue;
            }

            // Store user's current roles
            const roleIds = target.roles.cache.filter(r => r.id !== message.guild.id).map(r => r.id);
            prisonData[target.id] = roleIds;

            try {
                // Remove all roles
                await target.roles.set([prisonRoleId]);
                imprisoned.push(target.user.tag);
            } catch (err) {
                console.error(err);
                failed.push(target.user.tag);
                delete prisonData[target.id]; // don't persist roles for a failed imprisonment
            }
        }

        writePrisonData(prisonData);

        if (imprisoned.length === 0) {
            return message.reply('❌ Failed to imprison the mentioned user(s).');
        }

        const descriptionLines = [
            `**Imprisoned by:** ${message.author.tag}`,
            `**Users:** ${imprisoned.map(tag => `**${tag}**`).join(', ')}`,
        ];
        if (skipped.length) descriptionLines.push(`**Skipped:** ${skipped.join(', ')}`);
        if (failed.length) descriptionLines.push(`**Failed:** ${failed.join(', ')}`);

        const embed = new EmbedBuilder()
            .setTitle(imprisoned.length > 1 ? '🔒 Members Imprisoned' : '🔒 Member Imprisoned')
            .setColor('#ff0000')
            .setDescription(descriptionLines.join('\n'))
            .setTimestamp();

        message.channel.send({ embeds: [embed] });

        const logChannel = message.guild.channels.cache.get(logChannelId);
        if (logChannel) logChannel.send({ embeds: [embed] });
    }
};