const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');

module.exports = {
    name: 'events',
    description: 'List scheduled Masked Bandits Discord server events',
    async execute(message) {
        const guild = message.guild;
        if (!guild) return message.reply('This command can only be used in a server.');

        try {
            const events = await guild.scheduledEvents.fetch();

            if (!events.size) {
                return message.reply('No scheduled events found on this server.');
            }

            const embed = new EmbedBuilder()
                .setColor(config.color)
                .setTitle('📅 Scheduled Masked Bandits Events')
                .setFooter({ text: 'Masked Bandits', iconURL: config.logo });

            const sortedEvents = events.sort((a, b) => a.scheduledStartTimestamp - b.scheduledStartTimestamp).first(10);

            const eventList = sortedEvents.map((event, i) => {
                const unixSeconds = Math.floor(event.scheduledStartTimestamp / 1000);
                return `**${i + 1}.** [${event.name}](${event.url ?? '#'})\n• When: <t:${unixSeconds}:F>\n• Description: ${event.description ?? 'No description'}\n`;
            }).join('\n');

            embed.setDescription(eventList);

            message.channel.send({ embeds: [embed] });

        } catch (error) {
            console.error('Error fetching scheduled events:', error);
            message.reply('❌ Failed to fetch scheduled events. Make sure I have the right permissions.');
        }
    }
};