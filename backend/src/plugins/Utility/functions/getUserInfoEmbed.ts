import { Message, GuildTextableChannel, EmbedOptions } from "eris";
import { PluginData } from "knub";
import { UtilityPluginType } from "../types";
import { UnknownUser, trimLines, embedPadding, resolveMember, resolveUser, preEmbedPadding } from "src/utils";
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

  embed.author = {
    name: `User:  ${user.username}#${user.discriminator}`,
  };

  const avatarURL = user.avatarURL || user.defaultAvatarURL;
  embed.author.icon_url = avatarURL;

  const createdAt = moment(user.createdAt);
  const accountAge = humanizeDuration(moment().valueOf() - user.createdAt, {
    largest: 2,
    round: true,
  });

  if (compact) {
    embed.fields.push({
      name: preEmbedPadding + "User information",
      value: trimLines(`
          Profile: <@!${user.id}>
          Created: **${accountAge} ago** (\`${createdAt.format("MMM D, YYYY")}\`)
          `),
    });
    if (member) {
      const joinedAt = moment(member.joinedAt);
      const joinAge = humanizeDuration(moment().valueOf() - member.joinedAt, {
        largest: 2,
        round: true,
      });
      embed.fields[0].value += `\nJoined: **${joinAge} ago** (\`${joinedAt.format("MMM D, YYYY")}\`)`;
    } else {
      embed.fields.push({
        name: preEmbedPadding + "!! NOTE !!",
        value: "User is not on the server",
      });
    }

    return embed;
  }

  embed.fields.push({
    name: preEmbedPadding + "User information",
    value: trimLines(`
        Name: **${user.username}#${user.discriminator}**
        ID: \`${user.id}\`
        Created: **${accountAge} ago** (\`${createdAt.format("MMM D, YYYY [at] H:mm [UTC]")}\`)
        Mention: <@!${user.id}>
        `),
  });

  if (member) {
    const joinedAt = moment(member.joinedAt);
    const joinAge = humanizeDuration(moment().valueOf() - member.joinedAt, {
      largest: 2,
      round: true,
    });
    const roles = member.roles.map(id => pluginData.guild.roles.get(id)).filter(r => !!r);

    embed.fields.push({
      name: preEmbedPadding + "Member information",
      value: trimLines(`
          Joined: **${joinAge} ago** (\`${joinedAt.format("MMM D, YYYY [at] H:mm [UTC]")}\`)
          ${roles.length > 0 ? "Roles: `" + roles.map(r => r.name).join("`, `") + "`" : ""}
        `),
    });

    const voiceChannel = member.voiceState.channelID
      ? pluginData.guild.channels.get(member.voiceState.channelID)
      : null;
    if (voiceChannel || member.voiceState.mute || member.voiceState.deaf) {
      embed.fields.push({
        name: preEmbedPadding + "Voice information",
        value: trimLines(`
          ${voiceChannel ? `Current voice channel: **${voiceChannel ? voiceChannel.name : "None"}**` : ""}
          ${member.voiceState.mute ? "Server voice muted: **Yes**" : ""}
          ${member.voiceState.deaf ? "Server voice deafened: **Yes**" : ""}
        `),
      });
    }
  } else {
    embed.fields.push({
      name: preEmbedPadding + "!! NOTE !!",
      value: "User is not on the server",
    });
  }
  const cases = (await pluginData.state.cases.getByUserId(user.id)).filter(c => !c.is_hidden);

  if (cases.length > 0) {
    cases.sort((a, b) => {
      return a.created_at < b.created_at ? 1 : -1;
    });

    const caseSummary = cases.slice(0, 3).map(c => {
      return `${CaseTypes[c.type]} (\`#${c.case_number}\`)`;
    });

    const summaryText = cases.length > 3 ? "Last 3 cases" : "Summary";

    embed.fields.push({
      name: preEmbedPadding + "Cases",
      value: trimLines(`
          Total cases: **${cases.length}**
          ${summaryText}: ${caseSummary.join(", ")}
        `),
    });
  }

  return embed;
}
