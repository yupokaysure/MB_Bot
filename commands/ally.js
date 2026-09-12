const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'ally',
  description: 'Adds the Ally role to a user (only for members with a specific role)',
  async execute(message, args) {
    const allowedRoleId = '1528808769818071291'; // role allowed to use command
    const allyRoleId = '1531449725277179924'; // ally role

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
        .setDescription(`Please mention a user to give Ally.\nExample: \`-ally @user\``)
        .setTimestamp();
      return message.reply({ embeds: [noUserEmbed] });
    }

    try {
      const allyRole = message.guild.roles.cache.get(allyRoleId);
      if (!allyRole) {
        const noRoleEmbed = new EmbedBuilder()
          .setColor('Red')
          .setTitle('⚠️ Role Not Found')
          .setDescription(`The Ally role (ID: ${allyRoleId}) could not be found.`)
          .setTimestamp();
        return message.reply({ embeds: [noRoleEmbed] });
      }

      // Add the ally role
      await member.roles.add(allyRole);

      const successEmbed = new EmbedBuilder()
        .setColor('Green')
        .setTitle('✅ Ally Granted')
        .setDescription(`${member} has been given the <@&${allyRoleId}> role.`)
        .setTimestamp();

      await message.reply({ embeds: [successEmbed] });
    } catch (error) {
      console.error(error);
      const errorEmbed = new EmbedBuilder()
        .setColor('Red')
        .setTitle('❌ Error')
        .setDescription(`An error occurred while assigning the Ally role.`)
        .setTimestamp();
      message.reply({ embeds: [errorEmbed] });
    }
  },
};
