import { CategoryChannel, EmbedOptions, RESTChannelInvite, TextChannel, VoiceChannel } from "eris";
import moment from "moment-timezone";
import { embedPadding, formatNumber, memoize, MINUTES, trimLines } from "../../../utils";
import { utilityCmd } from "../types";
import humanizeDuration from "humanize-duration";

export const ServerCmd = utilityCmd({
  trigger: "server",
  description: "Show information about the server",
  usage: "!server",
  permission: "can_server",

  async run({ message, pluginData }) {
    const { guild } = pluginData;

    const embed: EmbedOptions = {
      fields: [],
      color: parseInt("6b80cf", 16),
    };

    embed.thumbnail = { url: guild.iconURL };

    const createdAt = moment(guild.createdAt);
    const serverAge = humanizeDuration(moment().valueOf() - guild.createdAt, {
      largest: 2,
      round: true,
    });

    const owner = pluginData.client.users.get(guild.ownerID);
    const ownerName = owner ? `${owner.username}#${owner.discriminator}` : "Unknown#0000";

    embed.fields.push({
      name: `Server information - ${guild.name}`,
      value:
        trimLines(`
          Created: **${serverAge} ago** (${createdAt.format("YYYY-MM-DD[T]HH:mm:ss")})
          Owner: **${ownerName}** (${guild.ownerID})
          Voice region: **${guild.region}**
          ${guild.features.length > 0 ? "Features: " + guild.features.join(", ") : ""}
        `) + embedPadding,
    });

    const restGuild = await memoize(
      () => pluginData.client.getRESTGuild(guild.id),
      `getRESTGuild_${guild.id}`,
      10 * MINUTES,
    );

    const totalMembers = restGuild.memberCount ?? restGuild.approximateMemberCount;
    let onlineMemberCount = restGuild.approximatePresenceCount;

    if (totalMembers == null || onlineMemberCount == null) {
      // For servers with a vanity URL, we can also use the numbers from the invite for online count
      const invite = guild.vanityURL
        ? ((await memoize(
            () => pluginData.client.getInvite(guild.vanityURL, true),
            `getInvite_${guild.vanityURL}`,
            10 * MINUTES,
          )) as RESTChannelInvite)
        : null;

      onlineMemberCount = invite ? invite.presenceCount : guild.members.filter(m => m.status !== "offline").length;
    }

    const offlineMemberCount = totalMembers - onlineMemberCount;

    let memberCountTotalLines = `Total: **${formatNumber(totalMembers)}**`;
    if (restGuild.maxMembers) {
      memberCountTotalLines += `\nMax: **${formatNumber(restGuild.maxMembers)}**`;
    }

    let memberCountOnlineLines = `Online: **${formatNumber(onlineMemberCount)}**`;
    if (restGuild.maxPresences) {
      memberCountOnlineLines += `\nMax online: **${formatNumber(restGuild.maxPresences)}**`;
    }

    embed.fields.push({
      name: "Members",
      inline: true,
      value: trimLines(`
          ${memberCountTotalLines}
          ${memberCountOnlineLines}
          Offline: **${formatNumber(offlineMemberCount)}**
        `),
    });

    const totalChannels = guild.channels.size;
    const categories = guild.channels.filter(channel => channel instanceof CategoryChannel);
    const textChannels = guild.channels.filter(channel => channel instanceof TextChannel);
    const voiceChannels = guild.channels.filter(channel => channel instanceof VoiceChannel);

    embed.fields.push({
      name: "Channels",
      inline: true,
      value:
        trimLines(`
          Total: **${totalChannels}** / 500
          Categories: **${categories.length}**
          Text: **${textChannels.length}**
          Voice: **${voiceChannels.length}**
        `) + embedPadding,
    });

    const maxEmojis =
      {
        0: 50,
        1: 100,
        2: 150,
        3: 250,
      }[guild.premiumTier] || 50;

    embed.fields.push({
      name: "Other stats",
      inline: true,
      value:
        trimLines(`
          Roles: **${guild.roles.size}** / 250
          Emojis: **${guild.emojis.length}** / ${maxEmojis}
          Boosts: **${guild.premiumSubscriptionCount ?? 0}** (level ${guild.premiumTier})
        `) + embedPadding,
    });

    message.channel.createMessage({ embed });
  },
});
