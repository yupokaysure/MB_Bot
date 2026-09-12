const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');

module.exports = {
    name: 'uniform',
    description: 'Show the Masked Bandits uniform',
    execute(message) {
        const embed = new EmbedBuilder()
            .setColor(config.color)
            .setTitle('Masked Bandits Uniform')
            .setDescription(config.uniform.items.map(i => `• ${i}`).join('\n'))
            .setImage(config.uniform.image)
            .setFooter({ text: 'Masked Bandits', iconURL: config.logo });

        message.channel.send({ embeds: [embed] });
    }
};
