import { Message, GuildTextableChannel, EmbedOptions } from "eris";
import { PluginData } from "knub";
import { UtilityPluginType } from "../types";
import { UnknownUser, trimLines, embedPadding, resolveMember, resolveUser } from "src/utils";
import moment from "moment-timezone";
import { CaseTypes } from "src/data/CaseTypes";
import humanizeDuration from "humanize-duration";

export async function getUserInfoEmbed(
  pluginData: PluginData<UtilityPluginType>,
  userId: string,
  compact = false,
): Promise<EmbedOptions | null> {
  const user = await resolveUser(pluginData.client, userId);
  if (!user || user instanceof UnknownUser) {
    return null;
  }

  const member = await resolveMember(pluginData.client, pluginData.guild, user.id);

  const embed: EmbedOptions = {
    fields: [],
  };

  const createdAt = moment(user.createdAt);
  const accountAge = humanizeDuration(moment().valueOf() - user.createdAt, {
    largest: 2,
    round: true,
  });

  embed.title = `${user.username}#${user.discriminator}`;
  embed.thumbnail = { url: user.avatarURL };

  if (compact) {
    embed.fields.push({
      name: "User information",
      value: trimLines(`
          Profile: <@!${user.id}>
          Created: **${accountAge} ago (${createdAt.format("YYYY-MM-DD[T]HH:mm:ss")})**
          `),
    });
    if (member) {
      const joinedAt = moment(member.joinedAt);
      const joinAge = humanizeDuration(moment().valueOf() - member.joinedAt, {
        largest: 2,
        round: true,
      });
      embed.fields[0].value += `\nJoined: **${joinAge} ago (${joinedAt.format("YYYY-MM-DD[T]HH:mm:ss")})**`;
    } else {
      embed.fields.push({
        name: "!!  USER IS NOT ON THE SERVER  !!",
        value: embedPadding,
      });
    }

    return embed;
  }

  embed.fields.push({
    name: "User information",
    value:
      trimLines(`
        ID: **${user.id}**
        Profile: <@!${user.id}>
        Created: **${accountAge} ago (${createdAt.format("YYYY-MM-DD[T]HH:mm:ss")})**
        `) + embedPadding,
  });

  if (member) {
    const joinedAt = moment(member.joinedAt);
    const joinAge = humanizeDuration(moment().valueOf() - member.joinedAt, {
      largest: 2,
      round: true,
    });
    const roles = member.roles.map(id => pluginData.guild.roles.get(id)).filter(r => !!r);

    embed.fields.push({
      name: "Member information",
      value:
        trimLines(`
          Joined: **${joinAge} ago (${joinedAt.format("YYYY-MM-DD[T]HH:mm:ss")})**
          ${roles.length > 0 ? "Roles: " + roles.map(r => r.name).join(", ") : ""}
        `) + embedPadding,
    });

    const voiceChannel = member.voiceState.channelID
      ? pluginData.guild.channels.get(member.voiceState.channelID)
      : null;
    if (voiceChannel || member.voiceState.mute || member.voiceState.deaf) {
      embed.fields.push({
        name: "Voice information",
        value:
          trimLines(`
          ${voiceChannel ? `Current voice channel: **${voiceChannel ? voiceChannel.name : "None"}**` : ""}
          ${member.voiceState.mute ? "Server voice muted: **Yes**" : ""}
          ${member.voiceState.deaf ? "Server voice deafened: **Yes**" : ""}
        `) + embedPadding,
      });
    }
  } else {
    embed.fields.push({
      name: "!!  USER IS NOT ON THE SERVER  !!",
      value: embedPadding,
    });
  }
  const cases = (await pluginData.state.cases.getByUserId(user.id)).filter(c => !c.is_hidden);

  if (cases.length > 0) {
    cases.sort((a, b) => {
      return a.created_at < b.created_at ? 1 : -1;
    });

    const caseSummary = cases.slice(0, 3).map(c => {
      return `${CaseTypes[c.type]} (#${c.case_number})`;
    });

    const summaryText = cases.length > 3 ? "Last 3 cases" : "Summary";

    embed.fields.push({
      name: "Cases",
      value: trimLines(`
          Total cases: **${cases.length}**
          ${summaryText}: ${caseSummary.join(", ")}
        `),
    });
  }

  return embed;
}
