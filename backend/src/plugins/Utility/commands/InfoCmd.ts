import { Snowflake } from "discord.js";
import { getChannelId, getRoleId } from "vety/helpers";
import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { resolveMessageMember } from "../../../pluginUtils.js";
import { isValidSnowflake, noop, parseInviteCodeInput, resolveInvite, resolveUser } from "../../../utils.js";
import { canReadChannel } from "../../../utils/canReadChannel.js";
import { resolveMessageTarget } from "../../../utils/resolveMessageTarget.js";
import { getChannelInfoEmbed } from "../functions/getChannelInfoEmbed.js";
import { getCustomEmojiId } from "../functions/getCustomEmojiId.js";
import { getEmojiInfoEmbed } from "../functions/getEmojiInfoEmbed.js";
import { getGuildPreview } from "../functions/getGuildPreview.js";
import { getInviteInfoEmbed } from "../functions/getInviteInfoEmbed.js";
import { getMessageInfoEmbed } from "../functions/getMessageInfoEmbed.js";
import { getRoleInfoEmbed } from "../functions/getRoleInfoEmbed.js";
import { getServerInfoEmbed } from "../functions/getServerInfoEmbed.js";
import { getSnowflakeInfoEmbed } from "../functions/getSnowflakeInfoEmbed.js";
import { getUserInfoEmbed } from "../functions/getUserInfoEmbed.js";
import { utilityCmd } from "../types.js";

export const InfoCmd = utilityCmd({
  trigger: "info",
  description: "Show information about the specified thing",
  usage: "!info",
  permission: "can_info",

  signature: {
    value: ct.string({ required: false }),

    compact: ct.switchOption({ def: false, shortcut: "c" }),
  },

  async run({ message, args, pluginData }) {
    const value = args.value || message.author.id;
    const userCfg = await pluginData.config.getMatchingConfig({
      member: message.member,
      channelId: message.channel.id,
      message,
    });

    // 1. Channel
    if (userCfg.can_channelinfo) {
      const channelId = getChannelId(value);
      const channel = channelId && pluginData.guild.channels.cache.get(channelId as Snowflake);
      if (channel) {
        const embed = await getChannelInfoEmbed(pluginData, channelId!);
        if (embed) {
          message.channel.send({ embeds: [embed] });
          return;
        }
      }
    }

    // 2. Server
    if (userCfg.can_server) {
      const guild = await pluginData.client.guilds.fetch(value as Snowflake).catch(noop);
      if (guild) {
        const embed = await getServerInfoEmbed(pluginData, value);
        if (embed) {
          message.channel.send({ embeds: [embed] });
          return;
        }
      }
    }

    // 3. User
    if (userCfg.can_userinfo) {
      const user = await resolveUser(pluginData.client, value, "Utility:InfoCmd");
      if (user && userCfg.can_userinfo) {
        const embed = await getUserInfoEmbed(pluginData, user.id, Boolean(args.compact));
        if (embed) {
          message.channel.send({ embeds: [embed] });
          return;
        }
      }
    }

    // 4. Message
    if (userCfg.can_messageinfo) {
      const messageTarget = await resolveMessageTarget(pluginData, value);
      if (messageTarget) {
        const authorMember = await resolveMessageMember(message);
        if (canReadChannel(messageTarget.channel, authorMember)) {
          const embed = await getMessageInfoEmbed(pluginData, messageTarget.channel.id, messageTarget.messageId);
          if (embed) {
            message.channel.send({ embeds: [embed] });
            return;
          }
        }
      }
    }

    // 5. Invite
    if (userCfg.can_inviteinfo) {
      const inviteCode = parseInviteCodeInput(value) ?? value;
      if (inviteCode) {
        const invite = await resolveInvite(pluginData.client, inviteCode, true);
        if (invite) {
          const embed = await getInviteInfoEmbed(pluginData, inviteCode);
          if (embed) {
            message.channel.send({ embeds: [embed] });
            return;
          }
        }
      }
    }

    // 6. Server again (fallback for discovery servers)
    if (userCfg.can_server) {
      const serverPreview = await getGuildPreview(pluginData.client, value).catch(() => null);
      if (serverPreview) {
        const embed = await getServerInfoEmbed(pluginData, value);
        if (embed) {
          message.channel.send({ embeds: [embed] });
          return;
        }
      }
    }

    // 7. Role
    if (userCfg.can_roleinfo) {
      const roleId = getRoleId(value);
      const role = roleId && pluginData.guild.roles.cache.get(roleId as Snowflake);
      if (role) {
        const embed = await getRoleInfoEmbed(pluginData, role);
        message.channel.send({ embeds: [embed] });
        return;
      }
    }

    // 8. Emoji
    if (userCfg.can_emojiinfo) {
      const emojiId = getCustomEmojiId(value);
      if (emojiId) {
        const embed = await getEmojiInfoEmbed(pluginData, emojiId);
        if (embed) {
          message.channel.send({ embeds: [embed] });
          return;
        }
      }
    }

    // 9. Arbitrary ID
    if (isValidSnowflake(value) && userCfg.can_snowflake) {
      const embed = await getSnowflakeInfoEmbed(value, true);
      message.channel.send({ embeds: [embed] });
      return;
    }

    // 10. No can do
    void pluginData.state.common.sendErrorMessage(
      message,
      "Could not find anything with that value or you are lacking permission for the snowflake type",
    );
  },
});
