const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "attendees",
  description: "List all users who clicked 'Interested' on a scheduled event.",
  usage: "d.attendees <eventId>",

  async execute(message, args) {
    const allowedRoleId = "1528808769818071291";

    // Permission check
    if (!message.member.roles.cache.has(allowedRoleId)) {
      const noPerms = new EmbedBuilder()
        .setColor("#ED4245")
        .setTitle("🚫 Permission Denied")
        .setDescription("You do not have permission to use this command.")
        .setTimestamp();
      return message.reply({ embeds: [noPerms] });
    }

    const eventId = args[0];
    if (!eventId) {
      return message.reply("❌ Please provide the **event ID**.\nExample: `d.attendees 123456789012345678`");
    }

    try {
      // Fetch the event
      const guildEvent = await message.guild.scheduledEvents.fetch(eventId);
      if (!guildEvent) {
        return message.reply("⚠️ Could not find an event with that ID in this server.");
      }

      // Fetch all users who clicked 'Interested'
      const attendees = await guildEvent.fetchSubscribers({ withMember: false });
      if (!attendees || attendees.size === 0) {
        return message.reply("📭 Nobody has clicked **Interested** for that event yet.");
      }

      // Build attendee list
      const attendeeList = attendees
        .map(subscriber => {
          const user = subscriber.user;
          return `• **${user.username}** (\`${user.id}\`)`;
        })
        .join("\n")
        .slice(0, 4000); // stay within Discord embed limit

      const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle(`📋 Interested Attendees — ${guildEvent.name}`)
        .setDescription(attendeeList)
        .setFooter({ text: `Total attendees: ${attendees.size}` })
        .setTimestamp();

      await message.reply({ embeds: [embed] });

    } catch (error) {
      console.error(error);
      message.reply("❌ Error fetching event attendees. Make sure the event ID is valid and the bot has permission to view it.");
    }
  },
};