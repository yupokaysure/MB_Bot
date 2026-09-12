const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection, Partials, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const config = require('./config.json');

// Any file dropped in here becomes a command matching its filename — e.g.
// images/aform.png means typing "-aform" shows that image. No restart
// needed to add new images, since the folder is read fresh each time.
const imagesDir = path.join(__dirname, 'images');
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildScheduledEvents,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildVoiceStates, // to track VC joins/leaves
    GatewayIntentBits.GuildMembers // needed for accurate role member counts (e.g. serverinfo)
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.name, command);
}
console.log(`[Commands] Loaded ${client.commands.size} commands: ${[...client.commands.keys()].join(', ')}`);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const MS_PER_MINUTE = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const ATTENDANCE_TIME = 15 * MS_PER_MINUTE; // 15 minutes
const ATTENDANCE_REWARD = 50000; // 500 coins for 15+ min
const ATTENDANCE_BONUS_REWARD = 100000; // 1000 coins for 30+ min

const eventVoiceChannelId = '1528832733839622266';
const emojiLogChannelId = config.channels?.emojiLog;
const emojiMap = config.emojiMap || {};

// Any DM sent to the bot by this user gets relayed to the announcements
// channel below, formatted as an announcement and pinging @everyone.
const ANNOUNCEMENT_DM_USER_ID = '1264764751892709389';
const ANNOUNCEMENT_CHANNEL_ID = '1528939454624956458';

// ==== Error logging ====
function logErrorToFile(err) {
  const logLine = `[${new Date().toISOString()}] ${err.stack || err}\n`;
  fs.appendFile('error.log', logLine, e => {
    if (e) console.error('Failed to write to error.log:', e);
  });
}

// ==== Economy system ====
// economyData.js is the single source of truth for balances/troops — it's
// what contract.js, duel.js, callup.js, cleanboots.js, troops.js etc. all
// use directly. index.js must NOT keep its own separate copy of economy
// data (that caused a real bug before: attendance rewards were silently
// overwriting balance changes made by other commands). Everything here
// goes through economyData.js instead.
const economy = require('./economyData.js');

// ==== Event reminders and attendance tracking ====

const vcJoinTimes = new Map(); // userId -> timestamp
const rewardedUsers = new Set(); // to avoid double reward: `${eventId}-${userId}`
const remindedOneHour = new Set();
const remindedStart = new Set();

// Periodically forget events that have clearly already happened, so these
// sets don't grow forever over weeks/months of uptime.
setInterval(() => {
  if (rewardedUsers.size > 5000) {
    for (const key of rewardedUsers) {
      rewardedUsers.delete(key);
    }
  }
}, 6 * MS_PER_HOUR);

client.once('clientReady', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  // Warm up the member cache once at startup so commands like `serverinfo`
  // can read role.members instantly instead of re-fetching (and possibly
  // timing out) on every single call.
  for (const guild of client.guilds.cache.values()) {
    try {
      await guild.members.fetch({ time: 300000 }); // allow up to 5 minutes
      console.log(`[Members] Cached ${guild.members.cache.size} members for ${guild.name}`);
    } catch (err) {
      console.error(`[Members] Failed to fully cache members for ${guild.name}:`, err.message);
      logErrorToFile(err);
    }
  }

  // ===== Rotating Status =====
  const statuses = [
    'Protecting The Bank!',
    'Use -help',
    'Monitoring activity',
    'Stealing Antmans Wallet'
  ];
  let index = 0;
  setInterval(() => {
    client.user.setPresence({
      activities: [{ name: statuses[index] }],
      status: 'online'
    });
    index = (index + 1) % statuses.length;
  }, 10000); // changes every 10 seconds

  setInterval(async () => {
    try {
      console.log(`[EventReminder] Checking scheduled events at ${new Date().toLocaleString()}`);

      const guild = await client.guilds.fetch('1528804468416843837').catch(err => {
        console.error('[EventReminder] Error fetching guild:', err);
        logErrorToFile(err);
        return null;
      });
      if (!guild) return;

      const events = await guild.scheduledEvents.fetch().catch(err => {
        console.error('[EventReminder] Error fetching scheduled events:', err);
        logErrorToFile(err);
        return null;
      });
      if (!events) return;

      for (const event of events.values()) {
        if (!event.scheduledStartAt) {
          console.log(`[EventReminder] Skipping "${event.name}" — no scheduledStartAt.`);
          continue;
        }

        const now = Date.now();
        const startTime = event.scheduledStartAt.getTime();
        const diff = startTime - now;

        console.log(`[EventReminder] "${event.name}" — starts in ${(diff / MS_PER_MINUTE).toFixed(1)} min.`);

        const subscribers = await event.fetchSubscribers().catch(err => {
          console.error(`[EventReminder] Error fetching subscribers for "${event.name}":`, err);
          logErrorToFile(err);
          return new Map();
        });

        console.log(`[EventReminder] "${event.name}" — ${subscribers.size} subscriber(s).`);
        if (!subscribers.size) {
          console.log(`[EventReminder] Skipping "${event.name}" — no subscribers to DM.`);
          continue;
        }

        // 1 hour reminder ± 2 min window
        const inOneHourWindow = diff <= MS_PER_HOUR + 2 * MS_PER_MINUTE && diff >= MS_PER_HOUR - 2 * MS_PER_MINUTE;
        console.log(`[EventReminder] "${event.name}" — in 1h window: ${inOneHourWindow}, already reminded: ${remindedOneHour.has(event.id)}`);
        if (inOneHourWindow) {
          if (!remindedOneHour.has(event.id)) {
            const dmMessage = `⏰ Reminder: The event **${event.name}** starts in 1 hour!\nJoin VC: <#${eventVoiceChannelId}>`;

            for (const subscriber of subscribers.values()) {
              const user = subscriber.user ?? subscriber;
              if (!user?.send) continue;

              try {
                await user.send(dmMessage);
                console.log(`[EventReminder] Sent 1h reminder to ${user.tag}`);
                await sleep(1000);
              } catch (err) {
                console.warn(`[EventReminder] Could not DM ${user.tag}`, err);
                logErrorToFile(err);
              }
            }
            remindedOneHour.add(event.id);
          }
        }

        // Event start reminder
        console.log(`[EventReminder] "${event.name}" — has started: ${diff <= 0}, already reminded: ${remindedStart.has(event.id)}`);
        if (diff <= 0 && !remindedStart.has(event.id)) {
          const dmMessage = `🎉 The event **${event.name}** is starting now!\nJoin VC: <#${eventVoiceChannelId}>`;

          for (const subscriber of subscribers.values()) {
            const user = subscriber.user ?? subscriber;
            if (!user?.send) continue;

            try {
              await user.send(dmMessage);
              console.log(`[EventReminder] Sent start reminder to ${user.tag}`);
              await sleep(1000);
            } catch (err) {
              console.warn(`[EventReminder] Could not DM ${user.tag}`, err);
              logErrorToFile(err);
            }
          }
          remindedStart.add(event.id);
        }
      }
    } catch (err) {
      console.error('[EventReminder] General error:', err);
      logErrorToFile(err);
    }
  }, MS_PER_MINUTE);
});

// Track voice state updates for attendance
client.on('voiceStateUpdate', async (oldState, newState) => {
  const userId = newState.id;
  const guild = newState.guild;

  // Joined event VC
  if (newState.channelId === eventVoiceChannelId && oldState.channelId !== eventVoiceChannelId) {
    vcJoinTimes.set(userId, Date.now());
    console.log(`[Attendance] ${userId} joined event VC.`);
  }

  // Left event VC
  if (oldState.channelId === eventVoiceChannelId && newState.channelId !== eventVoiceChannelId) {
    const joinTime = vcJoinTimes.get(userId);
    vcJoinTimes.delete(userId);

    if (!joinTime) {
      console.log(`[Attendance] ${userId} left event VC but had no recorded join time — skipping.`);
      return;
    }

    const timeSpent = Date.now() - joinTime;
    console.log(`[Attendance] ${userId} left event VC after ${(timeSpent / MS_PER_MINUTE).toFixed(1)} min.`);

    if (timeSpent >= ATTENDANCE_TIME) {
      try {
        const events = await guild.scheduledEvents.fetch();
        const activeEvent = events.find(
          e => e.entityMetadata?.location === `<#${eventVoiceChannelId}>` || e.channelId === eventVoiceChannelId
        );
        console.log(`[Attendance] Active event match: ${activeEvent ? activeEvent.name : 'none'}`);

        const rewardKey = `${activeEvent?.id || 'noevent'}-${userId}`;
        if (rewardedUsers.has(rewardKey)) {
          console.log(`[Attendance] ${userId} already rewarded for this event — skipping.`);
          return;
        }

        let rewardAmount = ATTENDANCE_REWARD;
        if (timeSpent >= 30 * MS_PER_MINUTE) {
          rewardAmount = ATTENDANCE_BONUS_REWARD;
        }

        economy.addBalance(userId, rewardAmount);
        rewardedUsers.add(rewardKey);

        const user = await client.users.fetch(userId);
        await user.send(`You earned ${rewardAmount} ${economy.DWCOIN_EMOJI} for attending the event for ${(timeSpent / 60000).toFixed(1)} minutes!`);
        console.log(`[Attendance] Rewarded ${user.tag} with ${rewardAmount} coins for attending ${(timeSpent / 60000).toFixed(1)} min in VC.`);
      } catch (err) {
        console.error('[Attendance] Error rewarding user:', err);
        logErrorToFile(err);
      }
    } else {
      console.log(`[Attendance] ${userId} left too early (needs ${ATTENDANCE_TIME / MS_PER_MINUTE} min) — no reward.`);
    }
  }
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  // DM relay: anything this specific user DMs the bot (that isn't itself a
  // command) gets posted as a pinged announcement in the announcements
  // channel. Checked before command dispatch so a real command from them
  // still tries to run normally instead of getting swallowed as an
  // announcement.
  if (!message.guild && message.author.id === ANNOUNCEMENT_DM_USER_ID && !message.content.startsWith(config.prefix)) {
    if (!message.content.trim() && message.attachments.size === 0) return; // nothing to post

    try {
      const channel = await client.channels.fetch(ANNOUNCEMENT_CHANNEL_ID);
      const embed = new EmbedBuilder()
        .setColor(config.color || '#2f3136')
        .setTitle('📢 Announcement')
        .setDescription(message.content || null)
        .setFooter({ text: 'Masked Bandits' })
        .setTimestamp();

      const firstImage = message.attachments.find(a => a.contentType?.startsWith('image/'));
      if (firstImage) embed.setImage(firstImage.url);

      await channel.send({
        content: '@everyone',
        embeds: [embed],
        allowedMentions: { parse: ['everyone'] }
      });

      await message.react('✅').catch(() => {});
    } catch (err) {
      console.error('[AnnouncementRelay] Failed to post announcement:', err);
      logErrorToFile(err);
      await message.reply('⚠ Failed to post that as an announcement.').catch(() => {});
    }
    return;
  }

  // Commands
  if (message.content.startsWith(config.prefix)) {
    const args = message.content.slice(config.prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    const command = client.commands.get(commandName);
    if (!command) {
      // Not a registered command — check if it matches an image filename
      // in /images (e.g. "-aform" -> images/aform.png).
      if (fs.existsSync(imagesDir)) {
        const match = fs.readdirSync(imagesDir).find(f =>
          IMAGE_EXTENSIONS.includes(path.extname(f).toLowerCase()) &&
          path.parse(f).name.toLowerCase() === commandName
        );
        if (match) {
          const filePath = path.join(imagesDir, match);
          const attachment = new AttachmentBuilder(filePath, { name: match });
          const embed = new EmbedBuilder()
            .setColor('#2f3136')
            .setImage(`attachment://${match}`)
            .setFooter({ text: 'Masked Bandits' })
            .setTimestamp();
          await message.channel.send({ embeds: [embed], files: [attachment] }).catch(() => {});
          return;
        }
      }
      console.warn(`[Commands] "${commandName}" was used but no matching command or image is loaded.`);
      return;
    }

    try {
      await command.execute(message, args, client, {
        client,
        sleep,
        ...economy // loadEconomy, saveEconomy, ensureEconomyUser, addBalance, modifyBalance, addTroops, loseTroops, addBlackjackWin, formatCoins, DWCOIN_EMOJI
      });
    } catch (err) {
      console.error(err);
      logErrorToFile(err);
      message.reply('⚠ Error executing command.').catch(() => {});
    }
    return;
  }

  // Emoji logging
  if (emojiLogChannelId) {
    const words = message.content.split(/\s+/);
    const emojisToSend = [];

    for (const word of words) {
      const emojiName = emojiMap[word];
      if (emojiName) {
        const foundEmoji = client.emojis.cache.find(e => e.name === emojiName);
        emojisToSend.push(foundEmoji ? foundEmoji.toString() : emojiName);
      }
    }

    if (emojisToSend.length > 0) {
      const channel = await client.channels.fetch(emojiLogChannelId).catch(err => {
        console.error('[EmojiLog] Error fetching channel:', err);
        logErrorToFile(err);
        return null;
      });
      if (channel) channel.send(emojisToSend.join(' ')).catch(() => {});
    }
  }
});

process.on('unhandledRejection', err => {
  console.error('Unhandled promise rejection:', err);
  logErrorToFile(err);
});

process.on('uncaughtException', err => {
  console.error('Uncaught exception:', err);
  logErrorToFile(err);
});

client.login(process.env.DISCORD_TOKEN).catch(err => {
  console.error('❌ Failed to log in — check the DISCORD_TOKEN environment variable:', err);
  process.exit(1);
});