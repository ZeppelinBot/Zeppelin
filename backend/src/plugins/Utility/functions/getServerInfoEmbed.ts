import { APIEmbed, ChannelType, GuildPremiumTier, Snowflake } from "discord.js";
import { GuildPluginData } from "vety";
import {
  EmbedWith,
  MINUTES,
  formatNumber,
  inviteHasCounts,
  memoize,
  preEmbedPadding,
  renderUsername,
  resolveInvite,
  resolveUser,
  trimLines,
} from "../../../utils.js";
import { idToTimestamp } from "../../../utils/idToTimestamp.js";
import { UtilityPluginType } from "../types.js";
import { getGuildPreview } from "./getGuildPreview.js";

const prettifyFeature = (feature: string): string =>
  `\`${feature
    .split("_")
    .map((e) => `${e.substring(0, 1).toUpperCase()}${e.substring(1).toLowerCase()}`)
    .join(" ")}\``;

export async function getServerInfoEmbed(
  pluginData: GuildPluginData<UtilityPluginType>,
  serverId: string,
): Promise<APIEmbed | null> {
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
    icon_url: (guildPreview || restGuild)!.iconURL() ?? undefined,
  };

  // BASIC INFORMATION
  const createdAtTs = Number(idToTimestamp((guildPreview || restGuild)!.id)!);

  const basicInformation: string[] = [];
  basicInformation.push(`Created: **<t:${Math.round(createdAtTs / 1000)}:R>**`);

  if (thisServer) {
    const owner = await resolveUser(pluginData.client, thisServer.ownerId, "Utility:getServerInfoEmbed");
    const ownerName = renderUsername(owner.username, owner.discriminator);

    basicInformation.push(`Owner: **${ownerName}** (\`${thisServer.ownerId}\`)`);
    // basicInformation.push(`Voice region: **${thisServer.region}**`); Outdated, as automatic voice regions are fully live
  }

  if (features.length > 0) {
    basicInformation.push(`Features: ${features.map(prettifyFeature).join(", ")}`);
  }

  embed.description = `${preEmbedPadding}**Basic Information**\n${basicInformation.join("\n")}`;

  // IMAGE LINKS
  const iconUrl = `[Link](${(restGuild || guildPreview)!.iconURL()})`;
  const bannerUrl = restGuild?.banner ? `[Link](${restGuild.bannerURL()})` : "None";
  const splashUrl = (restGuild || guildPreview)!.splash
    ? `[Link](${(restGuild || guildPreview)!.splashURL()})`
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
    onlineMemberCount = thisServer.members.cache.filter((m) => m.presence?.status !== "offline").size; // Extremely inaccurate fallback
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
    const categories = thisServer.channels.cache.filter((channel) => channel.type === ChannelType.GuildCategory);
    const textChannels = thisServer.channels.cache.filter((channel) => channel.type === ChannelType.GuildText);
    const voiceChannels = thisServer.channels.cache.filter((channel) => channel.type === ChannelType.GuildVoice);
    const forumChannels = thisServer.channels.cache.filter((channel) => channel.type === ChannelType.GuildForum);
    const mediaChannels = thisServer.channels.cache.filter((channel) => channel.type === ChannelType.GuildMedia);
    const threadChannelsText = thisServer.channels.cache.filter(
      (channel) => channel.isThread() && channel.parent?.type !== ChannelType.GuildForum,
    );
    const threadChannelsForums = thisServer.channels.cache.filter(
      (channel) => channel.isThread() && channel.parent?.type === ChannelType.GuildForum,
    );
    const threadChannelsMedia = thisServer.channels.cache.filter(
      (channel) => channel.isThread() && channel.parent?.type === ChannelType.GuildMedia,
    );
    const announcementChannels = thisServer.channels.cache.filter(
      (channel) => channel.type === ChannelType.GuildAnnouncement,
    );
    const stageChannels = thisServer.channels.cache.filter((channel) => channel.type === ChannelType.GuildStageVoice);
    const totalChannels = thisServer.channels.cache.filter((channel) => !channel.isThread()).size;

    embed.fields.push({
      name: preEmbedPadding + "Channels",
      inline: true,
      value: trimLines(`
          Total: **${totalChannels}** / 500
          Categories: **${categories.size}**
          Text: **${textChannels.size}** (**${threadChannelsText.size} threads**)
          Forums: **${forumChannels.size}** (**${threadChannelsForums.size} threads**)
          Media: **${mediaChannels.size}** (**${threadChannelsMedia.size} threads**)
          Announcement: **${announcementChannels.size}**
          Voice: **${voiceChannels.size}**
          Stage: **${stageChannels.size}**
        `),
    });
  }

  // OTHER STATS
  const otherStats: string[] = [];

  if (thisServer) {
    otherStats.push(`Roles: **${thisServer.roles.cache.size}** / 250`);
  }

  const roleLockedEmojis =
    (restGuild
      ? restGuild?.emojis?.cache.filter((e) => e.roles.cache.size)
      : guildPreview?.emojis.filter((e) => e.roles.length)
    )?.size ?? 0;

  if (restGuild) {
    const maxEmojis =
      {
        [GuildPremiumTier.None]: 50,
        [GuildPremiumTier.Tier1]: 100,
        [GuildPremiumTier.Tier2]: 150,
        [GuildPremiumTier.Tier3]: 250,
      }[restGuild.premiumTier] ?? 50;
    const maxStickers =
      {
        [GuildPremiumTier.None]: 0,
        [GuildPremiumTier.Tier1]: 15,
        [GuildPremiumTier.Tier2]: 30,
        [GuildPremiumTier.Tier3]: 60,
      }[restGuild.premiumTier] ?? 0;

    const availableEmojis = restGuild.emojis.cache.filter((e) => e.available);
    otherStats.push(
      `Emojis: **${availableEmojis.size}** / ${maxEmojis * 2}${
        roleLockedEmojis ? ` (__${roleLockedEmojis} role-locked__)` : ""
      }${
        availableEmojis.size < restGuild.emojis.cache.size
          ? ` (__+${restGuild.emojis.cache.size - availableEmojis.size} unavailable__)`
          : ""
      }`,
    );
    otherStats.push(`Stickers: **${restGuild.stickers.cache.size}** / ${maxStickers}`);
  } else {
    otherStats.push(
      `Emojis: **${guildPreview!.emojis.size}**${roleLockedEmojis ? ` (__${roleLockedEmojis} role-locked__)` : ""}`,
    );
    // otherStats.push(`Stickers: **${guildPreview!.stickers.size}**`); Wait on DJS
  }

  if (thisServer) {
    otherStats.push(
      `Boosts: **${thisServer.premiumSubscriptionCount ?? 0}**${
        thisServer.premiumTier ? ` (level ${thisServer.premiumTier})` : ""
      }`,
    );
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
