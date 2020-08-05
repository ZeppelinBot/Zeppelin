import { PluginData } from "knub";
import { UtilityPluginType } from "../types";
import { BaseInvite, Constants, EmbedOptions, RESTChannelInvite, RESTPrivateInvite } from "eris";
import { snowflakeToTimestamp } from "../../../utils/snowflakeToTimestamp";
import moment from "moment-timezone";
import humanizeDuration from "humanize-duration";
import { emptyEmbedValue, formatNumber, isRESTGroupDMInvite, isRESTGuildInvite, resolveInvite } from "../../../utils";

export async function getInviteInfoEmbed(
  pluginData: PluginData<UtilityPluginType>,
  inviteCode: string,
): Promise<EmbedOptions | null> {
  const invite = await resolveInvite(pluginData.client, inviteCode, true);
  if (!invite) {
    return null;
  }

  if (isRESTGuildInvite(invite)) {
    const embed: EmbedOptions = {
      fields: [],
    };

    if (invite.guild.icon) {
      embed.thumbnail = {
        url: `https://cdn.discordapp.com/icons/${invite.guild.id}/${invite.guild.icon}.png?size=256`,
      };
    }

    embed.title = `Server Invite - ${invite.guild.name}`;
    embed.url = `https://discord.gg/${invite.code}`;

    embed.fields.push({
      name: "Server ID",
      value: `\`${invite.guild.id}\``,
      inline: true,
    });

    embed.fields.push({
      name: "Channel",
      value:
        invite.channel.type === Constants.ChannelTypes.GUILD_VOICE
          ? `🔉 ${invite.channel.name}\n\`${invite.channel.id}\``
          : `#${invite.channel.name}\n\`${invite.channel.id}\``,
    });

    const createdAtTimestamp = snowflakeToTimestamp(invite.guild.id);
    const createdAt = moment(createdAtTimestamp, "x");
    const serverAge = humanizeDuration(Date.now() - createdAtTimestamp, {
      largest: 2,
      round: true,
    });

    embed.fields.push({
      name: "Server age",
      value: serverAge,
    });

    embed.fields.push({
      name: "Members",
      value: `**${formatNumber(invite.memberCount)}** (${formatNumber(invite.presenceCount)} online)`,
      inline: true,
    });

    return embed;
  }

  if (isRESTGroupDMInvite(invite)) {
    const embed: EmbedOptions = {
      fields: [],
    };

    if (invite.channel.icon) {
      embed.thumbnail = {
        url: `https://cdn.discordapp.com/channel-icons/${invite.channel.id}/${invite.channel.icon}.png?size=256`,
      };
    }

    embed.title = invite.channel.name ? `Group DM Invite - ${invite.channel.name}` : `Group DM Invite`;

    embed.fields.push({
      name: "Channel ID",
      value: `\`${invite.channel.id}\``,
    });

    embed.fields.push({
      name: "Members",
      value: formatNumber((invite as any).memberCount),
    });

    return embed;
  }

  return null;
}
