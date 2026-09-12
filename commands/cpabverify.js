const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'cpabverify',
  description: 'Adds the CPAB verified role to a user (only for members with a specific role)',
  async execute(message, args) {
    const allowedRoleId = '1528839137170296985';
    const verifiedRoleId = '1532449029076684820';

    // Check if author has the allowed role
    if (!message.member.roles.cache.has(allowedRoleId)) {
      const noPermsEmbed = new EmbedBuilder()
        .setColor('Red')
        .setTitle('⛔ Access Denied')
        .setDescription(`You must have the <@&${allowedRoleId}> role to use this command.`)
        .setTimestamp();
      return message.reply({ embeds: [noPermsEmbed] });
    }

    // Get the mentioned member
    const member = message.mentions.members.first();
    if (!member) {
      const noUserEmbed = new EmbedBuilder()
        .setColor('Yellow')
        .setTitle('⚠️ Missing User')
        .setDescription(`Please mention a user to verify.\nExample: \`!cpabverify @user\``)
        .setTimestamp();
      return message.reply({ embeds: [noUserEmbed] });
    }

    try {
      const verifiedRole = message.guild.roles.cache.get(verifiedRoleId);
      if (!verifiedRole) {
        const noRoleEmbed = new EmbedBuilder()
          .setColor('Red')
          .setTitle('⚠️ Role Not Found')
          .setDescription(`The verified role (ID: ${verifiedRoleId}) could not be found.`)
          .setTimestamp();
        return message.reply({ embeds: [noRoleEmbed] });
      }

      // Add the verified role
      await member.roles.add(verifiedRole);

      const successEmbed = new EmbedBuilder()
        .setColor('Green')
        .setTitle('✅ Verification Complete')
        .setDescription(`${member} has been verified and given the <@&${verifiedRoleId}> role.`)
        .setTimestamp();

      await message.reply({ embeds: [successEmbed] });
    } catch (error) {
      console.error(error);
      const errorEmbed = new EmbedBuilder()
        .setColor('Red')
        .setTitle('❌ Error')
        .setDescription(`An error occurred while verifying the user.`)
        .setTimestamp();
      message.reply({ embeds: [errorEmbed] });
    }
  },
};