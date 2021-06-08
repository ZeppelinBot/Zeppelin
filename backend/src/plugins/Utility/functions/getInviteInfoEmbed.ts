import { MessageEmbedOptions } from "discord.js";
import humanizeDuration from "humanize-duration";
import { GuildPluginData } from "knub";
import moment from "moment-timezone";
import { ChannelTypeStrings } from "src/types";
import {
  EmbedWith,
  formatNumber,
  GroupDMInvite,
  inviteHasCounts,
  isGroupDMInvite,
  isGuildInvite,
  preEmbedPadding,
  resolveInvite,
  trimLines,
} from "../../../utils";
import { snowflakeToTimestamp } from "../../../utils/snowflakeToTimestamp";
import { UtilityPluginType } from "../types";

export async function getInviteInfoEmbed(
  pluginData: GuildPluginData<UtilityPluginType>,
  inviteCode: string,
): Promise<MessageEmbedOptions | null> {
  let invite = await resolveInvite(pluginData.client, inviteCode, true);
  if (!invite) {
    return null;
  }

  if (isGuildInvite(invite)) {
    const embed: EmbedWith<"fields"> = {
      fields: [],
    };

    embed.author = {
      name: `Server invite:  ${invite.guild.name}`,
      url: `https://discord.gg/${invite.code}`,
    };

    if (invite.guild.icon) {
      embed.author.icon_url = `https://cdn.discordapp.com/icons/${invite.guild.id}/${invite.guild.icon}.png?size=256`;
    }

    if (invite.guild.description) {
      embed.description = invite.guild.description;
    }

    const serverCreatedAtTimestamp = snowflakeToTimestamp(invite.guild.id);
    const serverCreatedAt = moment.utc(serverCreatedAtTimestamp, "x");
    const serverAge = humanizeDuration(Date.now() - serverCreatedAtTimestamp, {
      largest: 2,
      round: true,
    });

    const memberCount = inviteHasCounts(invite) ? invite.memberCount : 0;

    const presenceCount = inviteHasCounts(invite) ? invite.presenceCount : 0;

    embed.fields.push({
      name: preEmbedPadding + "Server information",
      value: trimLines(`
        Name: **${invite.guild.name}**
        ID: \`${invite.guild.id}\`
        Created: **${serverAge} ago**
        Members: **${formatNumber(memberCount)}** (${formatNumber(presenceCount)} online)
      `),
      inline: true,
    });

    const channelName =
      invite.channel.type === ChannelTypeStrings.VOICE ? `🔉 ${invite.channel.name}` : `#${invite.channel.name}`;

    const channelCreatedAtTimestamp = snowflakeToTimestamp(invite.channel.id);
    const channelCreatedAt = moment.utc(channelCreatedAtTimestamp, "x");
    const channelAge = humanizeDuration(Date.now() - channelCreatedAtTimestamp, {
      largest: 2,
      round: true,
    });

    let channelInfo = trimLines(`
        Name: **${channelName}**
        ID: \`${invite.channel.id}\`
        Created: **${channelAge} ago**
    `);

    if (invite.channel.type !== ChannelTypeStrings.VOICE) {
      channelInfo += `\nMention: <#${invite.channel.id}>`;
    }

    embed.fields.push({
      name: preEmbedPadding + "Channel information",
      value: channelInfo,
      inline: true,
    });

    if (invite.inviter) {
      embed.fields.push({
        name: preEmbedPadding + "Invite creator",
        value: trimLines(`
          Name: **${invite.inviter.username}#${invite.inviter.discriminator}**
          ID: \`${invite.inviter.id}\`
          Mention: <@!${invite.inviter.id}>
        `),
      });
    }

    return embed;
  }

  if (isGroupDMInvite(invite)) {
    const embed: EmbedWith<"fields"> = {
      fields: [],
    };

    invite = invite as GroupDMInvite;
    embed.author = {
      name: invite.channel.name ? `Group DM invite:  ${invite.channel.name}` : `Group DM invite`,
      url: `https://discord.gg/${invite.code}`,
    }; // FIXME pending invite re-think

    /*if (invite.channel.icon) {
      embed.author.icon_url = `https://cdn.discordapp.com/channel-icons/${invite.channel.id}/${invite.channel.icon}.png?size=256`;
    }*/ const channelCreatedAtTimestamp = snowflakeToTimestamp(
      invite.channel.id,
    );
    const channelCreatedAt = moment.utc(channelCreatedAtTimestamp, "x");
    const channelAge = humanizeDuration(Date.now() - channelCreatedAtTimestamp, {
      largest: 2,
      round: true,
    });

    embed.fields.push({
      name: preEmbedPadding + "Group DM information",
      value: trimLines(`
        Name: ${invite.channel.name ? `**${invite.channel.name}**` : `_Unknown_`}
        ID: \`${invite.channel.id}\`
        Created: **${channelAge} ago**
        Members: **${formatNumber((invite as any).memberCount)}**
      `),
      inline: true,
    });

    if (invite.inviter) {
      embed.fields.push({
        name: preEmbedPadding + "Invite creator",
        value: trimLines(`
          Name: **${invite.inviter.username}#${invite.inviter.discriminator}**
          ID: \`${invite.inviter.id}\`
          Mention: <@!${invite.inviter.id}>
        `),
        inline: true,
      });
    }

    return embed;
  }

  return null;
}
