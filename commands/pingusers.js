// commands/pingusers.js
const OWNER_ID = '1264764751892709389';
const REPEAT_COUNT = 50;
const DELAY_MS = 1200; // spacing between sends to avoid Discord rate limits

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    name: 'pingusers',
    description: 'Owner-only: pings all mentioned users 50 times in this channel.',
    usage: '-pingusers @user1 @user2 ...',
    async execute(message) {
        if (message.author.id !== OWNER_ID) {
            return message.reply('❌ You do not have permission to use this command.');
        }

        const targets = message.mentions.users;
        if (targets.size === 0) {
            return message.reply('❌ Please mention at least one user to ping.');
        }

        const userIds = [...targets.keys()];
        const pingText = userIds.map(id => `<@${id}>`).join(' ');

        for (let i = 0; i < REPEAT_COUNT; i++) {
            try {
                await message.channel.send({
                    content: pingText,
                    allowedMentions: { users: userIds }
                });
            } catch (err) {
                console.error(`[PingUsers] Failed on send ${i + 1}/${REPEAT_COUNT}:`, err);
                break; // stop instead of hammering the API further if something's already going wrong
            }
            await sleep(DELAY_MS);
        }
    }
};