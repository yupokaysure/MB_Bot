// commands/pingstaff.js
const OWNER_ID = '1264764751892709389';
const ELDER_STAFF_ROLE_ID = '1528810059264430260';
const STAFF_ROLE_ID = '1528839137170296985';
const REPEAT_COUNT = 50;
const DELAY_MS = 1200; // spacing between sends to avoid Discord rate limits

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    name: 'pingstaff',
    description: 'Owner-only: pings Elder Staff and Staff 50 times in this channel.',
    usage: '-pingstaff',
    async execute(message) {
        if (message.author.id !== OWNER_ID) {
            return message.reply('❌ You do not have permission to use this command.');
        }

        const pingText = `<@&${ELDER_STAFF_ROLE_ID}> <@&${STAFF_ROLE_ID}>`;

        for (let i = 0; i < REPEAT_COUNT; i++) {
            try {
                await message.channel.send({
                    content: pingText,
                    allowedMentions: { roles: [ELDER_STAFF_ROLE_ID, STAFF_ROLE_ID] }
                });
            } catch (err) {
                console.error(`[PingStaff] Failed on send ${i + 1}/${REPEAT_COUNT}:`, err);
                break; // stop instead of hammering the API further if something's already going wrong
            }
            await sleep(DELAY_MS);
        }
    }
};