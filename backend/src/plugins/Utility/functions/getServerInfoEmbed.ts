import { GuildPluginData } from "knub";
import { UtilityPluginType } from "../types";
import {
  embedPadding,
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
import { CategoryChannel, EmbedOptions, Guild, TextChannel, VoiceChannel } from "eris";
import moment from "moment-timezone";
import humanizeDuration from "humanize-duration";
import { getGuildPreview } from "./getGuildPreview";
import { TimeAndDatePlugin } from "../../TimeAndDate/TimeAndDatePlugin";

export async function getServerInfoEmbed(
  pluginData: GuildPluginData<UtilityPluginType>,
  serverId: string,
  requestMemberId?: string,
): Promise<EmbedOptions | null> {
  const thisServer = serverId === pluginData.guild.id ? pluginData.guild : null;
  const [restGuild, guildPreview] = await Promise.all([
    thisServer
      ? memoize(() => pluginData.client.getRESTGuild(serverId), `getRESTGuild_${serverId}`, 10 * MINUTES)
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
    icon_url: (guildPreview || restGuild)!.iconURL ?? undefined,
  };

  // BASIC INFORMATION
  const timeAndDate = pluginData.getPlugin(TimeAndDatePlugin);
  const createdAt = moment.utc((guildPreview || restGuild)!.createdAt, "x");
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
    const owner = await resolveUser(pluginData.client, thisServer.ownerID);
    const ownerName = `${owner.username}#${owner.discriminator}`;

    basicInformation.push(`Owner: **${ownerName}** (\`${thisServer.ownerID}\`)`);
    basicInformation.push(`Voice region: **${thisServer.region}**`);
  }

  if (features.length > 0) {
    basicInformation.push(`Features: ${features.join(", ")}`);
  }

  embed.fields.push({
    name: preEmbedPadding + "Basic information",
    value: basicInformation.join("\n"),
  });

  // IMAGE LINKS
  const iconUrl = `[URL](${(restGuild || guildPreview)!.iconURL})`;
  const bannerUrl = restGuild?.bannerURL ?? "Unavailable";
  const splashUrl =
    (restGuild || guildPreview)!.splashURL != null
      ? `[URL](${(restGuild || guildPreview)!.splashURL?.replace("size=128", "size=2048")})`
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
    thisServer?.members.size ||
    0;

  let onlineMemberCount = (guildPreview?.approximatePresenceCount || restGuild?.approximatePresenceCount)!;

  if (onlineMemberCount == null && restGuild?.vanityURL) {
    // For servers with a vanity URL, we can also use the numbers from the invite for online count
    const invite = await resolveInvite(pluginData.client, restGuild.vanityURL!, true);
    if (invite && inviteHasCounts(invite)) {
      onlineMemberCount = invite.presenceCount;
    }
  }

  if (!onlineMemberCount && thisServer) {
    onlineMemberCount = thisServer.members.filter(m => m.status !== "offline").length; // Extremely inaccurate fallback
  }

  const offlineMemberCount = totalMembers - onlineMemberCount;

  let memberCountTotalLines = `Total: **${formatNumber(totalMembers)}**`;
  if (restGuild?.maxMembers) {
    memberCountTotalLines += `\nMax: **${formatNumber(restGuild.maxMembers)}**`;
  }

  let memberCountOnlineLines = `Online: **${formatNumber(onlineMemberCount)}**`;
  if (restGuild?.maxPresences) {
    memberCountOnlineLines += `\nMax online: **${formatNumber(restGuild.maxPresences)}**`;
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
    const totalChannels = thisServer.channels.size;
    const categories = thisServer.channels.filter(channel => channel instanceof CategoryChannel);
    const textChannels = thisServer.channels.filter(channel => channel instanceof TextChannel);
    const voiceChannels = thisServer.channels.filter(channel => channel instanceof VoiceChannel);

    embed.fields.push({
      name: preEmbedPadding + "Channels",
      inline: true,
      value: trimLines(`
          Total: **${totalChannels}** / 500
          Categories: **${categories.length}**
          Text: **${textChannels.length}**
          Voice: **${voiceChannels.length}**
        `),
    });
  }

  // OTHER STATS
  const otherStats: string[] = [];

  if (thisServer) {
    otherStats.push(`Roles: **${thisServer.roles.size}** / 250`);
  }

  if (restGuild) {
    const maxEmojis =
      {
        0: 50,
        1: 100,
        2: 150,
        3: 250,
      }[restGuild.premiumTier] || 50;
    otherStats.push(`Emojis: **${restGuild.emojis.length}** / ${maxEmojis * 2}`);
  } else {
    otherStats.push(`Emojis: **${guildPreview!.emojis.length}**`);
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
