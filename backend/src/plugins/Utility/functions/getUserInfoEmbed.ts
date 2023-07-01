import { APIEmbed } from "discord.js";
import { GuildPluginData } from "knub";
import { CaseTypes } from "../../../data/CaseTypes";
import {
  EmbedWith,
  messageLink,
  preEmbedPadding,
  renderUsername,
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
    ? roles.slice(0, MAX_ROLES_TO_DISPLAY).join(", ") + `, and ${roles.length - MAX_ROLES_TO_DISPLAY} more roles`
    : roles.join(", ");

export async function getUserInfoEmbed(
  pluginData: GuildPluginData<UtilityPluginType>,
  userId: string,
  compact = false,
  requestMemberId?: string,
): Promise<APIEmbed | null> {
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
    name: `${user.bot ? "Bot" : "User"}:  ${renderUsername(user.username, user.discriminator)}`,
  };

  const avatarURL = user.displayAvatarURL();
  embed.author.icon_url = avatarURL;

  if (compact) {
    embed.fields.push({
      name: preEmbedPadding + `${user.bot ? "Bot" : "User"} information`,
      value: trimLines(`
          Profile: <@!${user.id}>
          Created: **<t:${Math.round(user.createdTimestamp / 1000)}:R>**
          `),
    });
    if (member) {
      embed.fields[0].value += `\n${user.bot ? "Added" : "Joined"}: **<t:${Math.round(
        member.joinedTimestamp! / 1000,
      )}:R>**`;
    } else {
      embed.fields.push({
        name: preEmbedPadding + "!! NOTE !!",
        value: `${user.bot ? "Bot" : "User"} is not on the server`,
      });
    }

    return embed;
  }

  const userInfoLines = [`ID: \`${user.id}\``, `Username: **${user.username}**`];
  if (user.discriminator !== "0") {
    userInfoLines.push(`Discriminator: **${user.discriminator}**`);
  }
  userInfoLines.push(`Created: **<t:${Math.round(user.createdTimestamp / 1000)}:R>**`);
  userInfoLines.push(`Mention: <@!${user.id}>`);

  embed.fields.push({
    name: preEmbedPadding + `${user.bot ? "Bot" : "User"} information`,
    value: userInfoLines.join("\n"),
  });

  if (member) {
    const roles = Array.from(member.roles.cache.values()).filter((r) => r.id !== pluginData.guild.id);
    roles.sort(sorter("position", "DESC"));

    embed.fields.push({
      name: preEmbedPadding + "Member information",
      value: trimLines(`
          ${user.bot ? "Added" : "Joined"}: **<t:${Math.round(member.joinedTimestamp! / 1000)}:R>**
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
