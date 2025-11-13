import { APIEmbed, ChannelType } from "discord.js";
import { GuildPluginData } from "vety";
import {
  EmbedWith,
  formatNumber,
  inviteHasCounts,
  isGroupDMInvite,
  isGuildInvite,
  preEmbedPadding,
  renderUsername,
  resolveInvite,
  trimLines,
} from "../../../utils.js";
import { snowflakeToTimestamp } from "../../../utils/snowflakeToTimestamp.js";
import { UtilityPluginType } from "../types.js";

export async function getInviteInfoEmbed(
  pluginData: GuildPluginData<UtilityPluginType>,
  inviteCode: string,
): Promise<APIEmbed | null> {
  const invite = await resolveInvite(pluginData.client, inviteCode, true);
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

    const memberCount = inviteHasCounts(invite) ? invite.memberCount : 0;

    const presenceCount = inviteHasCounts(invite) ? invite.presenceCount : 0;

    embed.fields.push({
      name: preEmbedPadding + "Server information",
      value: trimLines(`
        Name: **${invite.guild.name}**
        ID: \`${invite.guild.id}\`
        Created: **<t:${Math.round(serverCreatedAtTimestamp / 1000)}:R>**
        Members: **${formatNumber(memberCount)}** (${formatNumber(presenceCount)} online)
      `),
      inline: true,
    });
    if (invite.channel) {
      const channelName =
        invite.channel.type === ChannelType.GuildVoice ? `🔉 ${invite.channel.name}` : `#${invite.channel.name}`;

      const channelCreatedAtTimestamp = snowflakeToTimestamp(invite.channel.id);

      let channelInfo = trimLines(`
        Name: **${channelName}**
        ID: \`${invite.channel.id}\`
        Created: **<t:${Math.round(channelCreatedAtTimestamp / 1000)}:R>**
    `);

      if (invite.channel.type !== ChannelType.GuildVoice) {
        channelInfo += `\nMention: <#${invite.channel.id}>`;
      }

      embed.fields.push({
        name: preEmbedPadding + "Channel information",
        value: channelInfo,
        inline: true,
      });
    }

    if (invite.inviter) {
      embed.fields.push({
        name: preEmbedPadding + "Invite creator",
        value: trimLines(`
          Name: **${renderUsername(invite.inviter)}**
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

    embed.author = {
      name: invite.channel.name ? `Group DM invite:  ${invite.channel.name}` : `Group DM invite`,
      url: `https://discord.gg/${invite.code}`,
    }; // FIXME pending invite re-think

    /*if (invite.channel.icon) {
      embed.author.icon_url = `https://cdn.discordapp.com/channel-icons/${invite.channel.id}/${invite.channel.icon}.png?size=256`;
    }*/

    const channelCreatedAtTimestamp = snowflakeToTimestamp(invite.channel!.id);

    embed.fields.push({
      name: preEmbedPadding + "Group DM information",
      value: trimLines(`
        Name: ${invite.channel!.name ? `**${invite.channel!.name}**` : `_Unknown_`}
        ID: \`${invite.channel!.id}\`
        Created: **<t:${Math.round(channelCreatedAtTimestamp / 1000)}:R>**
        Members: **${formatNumber((invite as any).memberCount)}**
      `),
      inline: true,
    });

    if (invite.inviter) {
      embed.fields.push({
        name: preEmbedPadding + "Invite creator",
        value: trimLines(`
          Name: **${renderUsername(invite.inviter.username, invite.inviter.discriminator)}**
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
