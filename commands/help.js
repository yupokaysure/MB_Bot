const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config.json');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'help',
    description: 'List all available commands',
    async execute(message) {
        const commandFiles = fs.readdirSync(path.join(__dirname)).filter(file => file.endsWith('.js'));
        const commands = [];
        const staffCommands = [];

        // Separate normal and staff commands
        for (const file of commandFiles) {
            if (file === 'help.js') continue;
            const command = require(`./${file}`);
            if (command.staffOnly) {
                staffCommands.push(`**${config.prefix}${command.name}** - ${command.description}`);
            } else {
                commands.push(`**${config.prefix}${command.name}** - ${command.description}`);
            }
        }

        // Pagination setup
        const itemsPerPage = 10;
        const pages = [];

        // Normal commands pages
        for (let i = 0; i < commands.length; i += itemsPerPage) {
            const pageCommands = commands.slice(i, i + itemsPerPage).join('\n');
            pages.push({
                title: 'Public Commands',
                description: pageCommands || 'None available.'
            });
        }

        // Staff commands on last page (if user has staff role)
        if (staffCommands.length > 0 && message.member.roles.cache.has(config.roles.staff)) {
            for (let i = 0; i < staffCommands.length; i += itemsPerPage) {
                const pageStaff = staffCommands.slice(i, i + itemsPerPage).join('\n');
                pages.push({
                    title: 'Staff Commands',
                    description: '⚠️ **Staff Commands — Only usable by staff members**\n\n' + pageStaff
                });
            }
        }

        // If no commands exist, fallback
        if (pages.length === 0) {
            pages.push({ title: 'Commands', description: 'No commands available.' });
        }

        let currentPage = 0;
        const embed = new EmbedBuilder()
            .setColor(config.color)
            .setTitle(pages[currentPage].title)
            .setDescription(pages[currentPage].description)
            .setThumbnail(config.logo)
            .setFooter({ text: `Page ${currentPage + 1} of ${pages.length}` });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('prev')
                    .setLabel('◀️ Previous')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('next')
                    .setLabel('Next ▶️')
                    .setStyle(ButtonStyle.Primary)
            );

        const msg = await message.channel.send({ embeds: [embed], components: [row] });

        const collector = msg.createMessageComponentCollector({ time: 120000 });

        collector.on('collect', i => {
            if (i.user.id !== message.author.id) return i.reply({ content: 'This is not for you!', ephemeral: true });

            if (i.customId === 'next') {
                currentPage = (currentPage + 1) % pages.length;
            } else if (i.customId === 'prev') {
                currentPage = (currentPage - 1 + pages.length) % pages.length;
            }

            embed.setTitle(pages[currentPage].title)
                .setDescription(pages[currentPage].description)
                .setFooter({ text: `Page ${currentPage + 1} of ${pages.length}` });

            i.update({ embeds: [embed] });
        });

        collector.on('end', () => {
            msg.edit({ components: [] }).catch(() => {});
        });
    }
};
