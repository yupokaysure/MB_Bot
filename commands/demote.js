const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');

module.exports = {
  name: 'demote',
  description: 'Demote a user to the previous rank (Rank Manager only)',
  staffOnly: true,
  async execute(message, args) {
    // Permission check for rankManager roles
    const hasRankManagerRole = config.roles.rankManager.some(roleId =>
      message.member.roles.cache.has(roleId)
    );
    if (!hasRankManagerRole) {
      return message.reply("❌ You don't have permission to use this command.");
    }

    const targetMember = message.mentions.members.first();
    if (!targetMember) return message.reply("Please mention a user to demote.");

    const ranks = config.ranks;
    // Find current rank role of the member (one of ranks)
    const currentRole = targetMember.roles.cache.find(r => ranks.includes(r.name));
    if (!currentRole) return message.reply("This user does not have a rank role.");

    const currentIndex = ranks.indexOf(currentRole.name);
    if (currentIndex <= 0) {
      return message.reply("This user is already at the lowest rank.");
    }

    const prevRankName = ranks[currentIndex - 1];
    const prevRole = message.guild.roles.cache.find(r => r.name === prevRankName);
    if (!prevRole) return message.reply(`The previous rank role (${prevRankName}) does not exist on this server.`);

    try {
      await targetMember.roles.remove(currentRole);
      await targetMember.roles.add(prevRole);

      message.channel.send(`✅ Demoted ${targetMember} from **${currentRole.name}** to **${prevRole.name}**.`);

      // Logging the demotion
      const logChannel = message.guild.channels.cache.get(config.channels.rankLogs);
      if (logChannel) {
        const embed = new EmbedBuilder()
          .setTitle('Member Demoted')
          .setColor('#FF0000')
          .addFields(
            { name: 'Member', value: `${targetMember} (${targetMember.user.tag})`, inline: true },
            { name: 'Demoted By', value: `${message.author} (${message.author.tag})`, inline: true },
            { name: 'From', value: currentRole.name, inline: true },
            { name: 'To', value: prevRole.name, inline: true },
            { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
          );

        logChannel.send({ embeds: [embed] }).catch(console.error);
      }
    } catch (error) {
      console.error(error);
      message.reply("There was an error demoting this user.");
    }
  }
};