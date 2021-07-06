import { CategoryChannel, MessageEmbedOptions, Snowflake, TextChannel, VoiceChannel } from "discord.js";
import humanizeDuration from "humanize-duration";
import { GuildPluginData } from "knub";
import moment from "moment-timezone";
import {
  EmbedWith,
  formatNumber,
  inviteHasCounts,
  memoize,
  MINUTES,
  preEmbedPadding,
  resolveInvite,
  resolveUser,
  trimLines,
} from "../../../utils";
import { TimeAndDatePlugin } from "../../TimeAndDate/TimeAndDatePlugin";
import { UtilityPluginType } from "../types";
import { getGuildPreview } from "./getGuildPreview";

export async function getServerInfoEmbed(
  pluginData: GuildPluginData<UtilityPluginType>,
  serverId: string,
  requestMemberId?: string,
): Promise<MessageEmbedOptions | null> {
  const thisServer = serverId === pluginData.guild.id ? pluginData.guild : null;
  const [restGuild, guildPreview] = await Promise.all([
    thisServer
      ? memoize(() => pluginData.client.guilds.fetch(serverId as Snowflake), `getRESTGuild_${serverId}`, 10 * MINUTES)
      : null,
    getGuildPreview(pluginData.client, serverId),
  ]);

  if (!restGuild && !guildPreview) {
    return null;
  }

  const features = (restGuild || guildPreview)!.features;
  if (!thisServer && !features.includes("DISCOVERABLE")) {
    return null;
  }

  const embed: EmbedWith<"fields"> = {
    fields: [],
  };

  embed.author = {
    name: `Server:  ${(guildPreview || restGuild)!.name}`,
    iconURL: (guildPreview || restGuild)!.iconURL() ?? undefined,
  };

  // BASIC INFORMATION
  const timeAndDate = pluginData.getPlugin(TimeAndDatePlugin);
  const createdAt = moment.utc((guildPreview || restGuild)!.id, "x"); // FIXME ID -> Timestamp
  const tzCreatedAt = requestMemberId
    ? await timeAndDate.inMemberTz(requestMemberId, createdAt)
    : timeAndDate.inGuildTz(createdAt);
  const prettyCreatedAt = tzCreatedAt.format(timeAndDate.getDateFormat("pretty_datetime"));
  const serverAge = humanizeDuration(moment.utc().valueOf() - createdAt.valueOf(), {
    largest: 2,
    round: true,
  });

  const basicInformation: string[] = [];
  basicInformation.push(`Created: **${serverAge} ago** (\`${prettyCreatedAt}\`)`);

  if (thisServer) {
    const owner = await resolveUser(pluginData.client, thisServer.ownerId);
    const ownerName = `${owner.username}#${owner.discriminator}`;

    basicInformation.push(`Owner: **${ownerName}** (\`${thisServer.ownerId}\`)`);
    // basicInformation.push(`Voice region: **${thisServer.region}**`); Outdated, as automatic voice regions are fully live
  }

  if (features.length > 0) {
    basicInformation.push(`Features: ${features.join(", ")}`);
  }

  embed.fields.push({
    name: preEmbedPadding + "Basic information",
    value: basicInformation.join("\n"),
  });

  // IMAGE LINKS
  const iconUrl = `[Link](${(restGuild || guildPreview)!.iconURL()})`;
  const bannerUrl = restGuild?.bannerURL() ? `[Link](${restGuild.bannerURL()})` : "None";
  const splashUrl =
    (restGuild || guildPreview)!.splashURL() != null
      ? `[Link](${(restGuild || guildPreview)!.splashURL()?.replace("size=128", "size=2048")})`
      : "None";

  embed.fields.push(
    {
      name: "Server icon",
      value: iconUrl,
      inline: true,
    },
    {
      name: "Invite splash",
      value: splashUrl,
      inline: true,
    },
    {
      name: "Server banner",
      value: bannerUrl,
      inline: true,
    },
  );

  // MEMBER COUNTS
  const totalMembers =
    guildPreview?.approximateMemberCount ||
    restGuild?.approximateMemberCount ||
    restGuild?.memberCount ||
    thisServer?.memberCount ||
    thisServer?.members.cache.size ||
    0;

  let onlineMemberCount = (guildPreview?.approximatePresenceCount || restGuild?.approximatePresenceCount)!;

  if (onlineMemberCount == null && restGuild?.vanityURLCode) {
    // For servers with a vanity URL, we can also use the numbers from the invite for online count
    const invite = await resolveInvite(pluginData.client, restGuild.vanityURLCode!, true);
    if (invite && inviteHasCounts(invite)) {
      onlineMemberCount = invite.presenceCount;
    }
  }

  if (!onlineMemberCount && thisServer) {
    onlineMemberCount = thisServer.members.cache.filter(m => m.presence?.status !== "offline").size; // Extremely inaccurate fallback
  }

  const offlineMemberCount = totalMembers - onlineMemberCount;

  let memberCountTotalLines = `Total: **${formatNumber(totalMembers)}**`;
  if (restGuild?.maximumMembers) {
    memberCountTotalLines += `\nMax: **${formatNumber(restGuild.maximumMembers)}**`;
  }

  let memberCountOnlineLines = `Online: **${formatNumber(onlineMemberCount)}**`;
  if (restGuild?.maximumPresences) {
    memberCountOnlineLines += `\nMax online: **${formatNumber(restGuild.maximumPresences)}**`;
  }

  embed.fields.push({
    name: preEmbedPadding + "Members",
    inline: true,
    value: trimLines(`
          ${memberCountTotalLines}
          ${memberCountOnlineLines}
          Offline: **${formatNumber(offlineMemberCount)}**
        `),
  });

  // CHANNEL COUNTS
  if (thisServer) {
    const totalChannels = thisServer.channels.cache.size;
    const categories = thisServer.channels.cache.filter(channel => channel instanceof CategoryChannel);
    const textChannels = thisServer.channels.cache.filter(channel => channel instanceof TextChannel);
    const voiceChannels = thisServer.channels.cache.filter(channel => channel instanceof VoiceChannel);

    embed.fields.push({
      name: preEmbedPadding + "Channels",
      inline: true,
      value: trimLines(`
          Total: **${totalChannels}** / 500
          Categories: **${categories.size}**
          Text: **${textChannels.size}**
          Voice: **${voiceChannels.size}**
        `),
    });
  }

  // OTHER STATS
  const otherStats: string[] = [];

  if (thisServer) {
    otherStats.push(`Roles: **${thisServer.roles.cache.size}** / 250`);
  }

  if (restGuild) {
    const maxEmojis =
      {
        0: 50,
        1: 100,
        2: 150,
        3: 250,
      }[restGuild.premiumTier] || 50;
    const maxStickers =
      {
        0: 0,
        1: 15,
        2: 30,
        3: 60,
      }[restGuild.premiumTier] || 0;

    otherStats.push(`Emojis: **${restGuild.emojis.cache.size}** / ${maxEmojis * 2}`);
    otherStats.push(`Stickers: ? / ${maxStickers}`); // Wait on DJS: **${restGuild.stickers.cache.size}**
  } else {
    otherStats.push(`Emojis: **${guildPreview!.emojis.size}**`);
    // otherStats.push(`Stickers: **${guildPreview!.stickers.size}**`); Wait on DJS
  }

  if (thisServer) {
    otherStats.push(`Boosts: **${thisServer.premiumSubscriptionCount ?? 0}** (level ${thisServer.premiumTier})`);
  }

  embed.fields.push({
    name: preEmbedPadding + "Other stats",
    inline: true,
    value: otherStats.join("\n"),
  });

  if (!thisServer) {
    embed.footer = {
      text: "⚠️ Only showing publicly available information for this server",
    };
  }

  return embed;
}
