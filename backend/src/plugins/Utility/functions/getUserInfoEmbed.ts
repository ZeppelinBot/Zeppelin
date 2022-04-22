import { MessageEmbedOptions, Role } from "discord.js";
import humanizeDuration from "humanize-duration";
import { GuildPluginData } from "knub";
import moment from "moment-timezone";
import { CaseTypes } from "../../../data/CaseTypes";
import {
  EmbedWith,
  messageLink,
  preEmbedPadding,
  resolveMember,
  resolveUser,
  sorter,
  trimLines,
  UnknownUser,
} from "../../../utils";
import { TimeAndDatePlugin } from "../../TimeAndDate/TimeAndDatePlugin";
import { UtilityPluginType } from "../types";

const MAX_ROLES_TO_DISPLAY = 15;

const trimRoles = (roles: string[]) =>
  roles.length > MAX_ROLES_TO_DISPLAY
    ? roles.slice(0, MAX_ROLES_TO_DISPLAY).join(", ") + `, and ${MAX_ROLES_TO_DISPLAY - roles.length} more roles`
    : roles.join(", ");

export async function getUserInfoEmbed(
  pluginData: GuildPluginData<UtilityPluginType>,
  userId: string,
  compact = false,
  requestMemberId?: string,
): Promise<MessageEmbedOptions | null> {
  const user = await resolveUser(pluginData.client, userId);
  if (!user || user instanceof UnknownUser) {
    return null;
  }

  const member = await resolveMember(pluginData.client, pluginData.guild, user.id);

  const embed: EmbedWith<"fields"> = {
    fields: [],
  };

  const timeAndDate = pluginData.getPlugin(TimeAndDatePlugin);

  embed.author = {
    name: `${user.bot ? "Bot" : "User"}:  ${user.tag}`,
  };

  const avatarURL = user.displayAvatarURL();
  embed.author.icon_url = avatarURL;

  const createdAt = moment.utc(user.createdAt, "x");
  const tzCreatedAt = requestMemberId
    ? await timeAndDate.inMemberTz(requestMemberId, createdAt)
    : timeAndDate.inGuildTz(createdAt);
  const prettyCreatedAt = tzCreatedAt.format(timeAndDate.getDateFormat("pretty_datetime"));
  const accountAge = humanizeDuration(moment.utc().valueOf() - user.createdTimestamp, {
    largest: 2,
    round: true,
  });

  if (compact) {
    embed.fields.push({
      name: preEmbedPadding + `${user.bot ? "Bot" : "User"} information`,
      value: trimLines(`
          Profile: <@!${user.id}>
          Created: **${accountAge} ago** (\`${prettyCreatedAt}\`)
          `),
    });
    if (member) {
      const joinedAt = moment.utc(member.joinedTimestamp!, "x");
      const tzJoinedAt = requestMemberId
        ? await timeAndDate.inMemberTz(requestMemberId, joinedAt)
        : timeAndDate.inGuildTz(joinedAt);
      const prettyJoinedAt = tzJoinedAt.format(timeAndDate.getDateFormat("pretty_datetime"));
      const joinAge = humanizeDuration(moment.utc().valueOf() - member.joinedTimestamp!, {
        largest: 2,
        round: true,
      });

      embed.fields[0].value += `\n${user.bot ? "Added" : "Joined"}: **${joinAge} ago** (\`${prettyJoinedAt}\`)`;
    } else {
      embed.fields.push({
        name: preEmbedPadding + "!! NOTE !!",
        value: `${user.bot ? "Bot" : "User"} is not on the server`,
      });
    }

    return embed;
  }

  embed.fields.push({
    name: preEmbedPadding + `${user.bot ? "Bot" : "User"} information`,
    value: trimLines(`
        Name: **${user.tag}**
        ID: \`${user.id}\`
        Created: **${accountAge} ago** (\`${prettyCreatedAt}\`)
        Mention: <@!${user.id}>
        `),
  });

  if (member) {
    const joinedAt = moment.utc(member.joinedTimestamp!, "x");
    const tzJoinedAt = requestMemberId
      ? await timeAndDate.inMemberTz(requestMemberId, joinedAt)
      : timeAndDate.inGuildTz(joinedAt);
    const prettyJoinedAt = tzJoinedAt.format(timeAndDate.getDateFormat("pretty_datetime"));
    const joinAge = humanizeDuration(moment.utc().valueOf() - member.joinedTimestamp!, {
      largest: 2,
      round: true,
    });
    const roles = Array.from(member.roles.cache.values()).filter((r) => r.id !== pluginData.guild.id);
    roles.sort(sorter("position", "DESC"));

    embed.fields.push({
      name: preEmbedPadding + "Member information",
      value: trimLines(`
          ${user.bot ? "Added" : "Joined"}: **${joinAge} ago** (\`${prettyJoinedAt}\`)
          ${roles.length > 0 ? "Roles: " + trimRoles(roles.map((r) => `<@&${r.id}>`)) : ""}
        `),
    });

    const voiceChannel = member.voice.channelId ? pluginData.guild.channels.cache.get(member.voice.channelId) : null;
    if (voiceChannel || member.voice.mute || member.voice.deaf) {
      embed.fields.push({
        name: preEmbedPadding + "Voice information",
        value: trimLines(`
          ${voiceChannel ? `Current voice channel: **${voiceChannel.name ?? "None"}**` : ""}
          ${member.voice.mute ? "Server voice muted: **Yes**" : ""}
          ${member.voice.deaf ? "Server voice deafened: **Yes**" : ""}
        `),
      });
    }
  } else {
    embed.fields.push({
      name: preEmbedPadding + "Member information",
      value: `⚠ ${user.bot ? "Bot" : "User"} is not on the server`,
    });
  }
  const cases = (await pluginData.state.cases.getByUserId(user.id)).filter((c) => !c.is_hidden);

  if (cases.length > 0) {
    cases.sort((a, b) => {
      return a.created_at < b.created_at ? 1 : -1;
    });

    const caseSummary = cases.slice(0, 3).map((c) => {
      const summaryText = `${CaseTypes[c.type]} (#${c.case_number})`;

      if (c.log_message_id) {
        const [channelId, messageId] = c.log_message_id.split("-");
        return `[${summaryText}](${messageLink(pluginData.guild.id, channelId, messageId)})`;
      }

      return summaryText;
    });

    const summaryLabel = cases.length > 3 ? "Last 3 cases" : "Summary";

    embed.fields.push({
      name: preEmbedPadding + "Cases",
      value: trimLines(`
          Total cases: **${cases.length}**
          ${summaryLabel}: ${caseSummary.join(", ")}
        `),
    });
  }

  return embed;
}
