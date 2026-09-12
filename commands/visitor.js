const config = require('../config.json');

module.exports = {
  name: 'visitor',
  description: 'Remove all ranks and assign Visitor role to a user',
  staffOnly: true,
  async execute(message, args) {
    // Check permissions — allowed if the member has any rankManager role OR this specific role ID
    const hasPermission =
      message.member.roles.cache.some(r => config.roles.rankManager.includes(r.id)) ||
      message.member.roles.cache.has('1528839137170296985');

    if (!hasPermission) {
      return message.reply('❌ You do not have permission to use this command.');
    }
    if (args.length === 0) return message.reply('Please mention a user to assign Visitor role.');
    const member = message.mentions.members.first();
    if (!member) return message.reply('Please mention a valid server member.');
    const ranksToRemove = config.ranks.map(rankName => {
      const role = message.guild.roles.cache.find(r => r.name === rankName);
      return role ? role.id : null;
    }).filter(Boolean);
    try {
      // Remove all ranks from the user
      await member.roles.remove(ranksToRemove);
      // Add Visitor role
      const visitorRole = message.guild.roles.cache.get(config.roles.visitor);
      if (!visitorRole) return message.reply('Visitor role not found on this server.');
      await member.roles.add(visitorRole);
      message.channel.send(`✅ <@${member.id}> has been set to Visitor.`);
    } catch (error) {
      console.error(error);
      message.reply('⚠ There was an error updating roles.');
    }
  }
};