import { Snowflake } from "discord.js";
import { getChannelId, getRoleId } from "knub/dist/utils";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage } from "../../../pluginUtils";
import {
  customEmojiRegex,
  isValidSnowflake,
  noop,
  parseInviteCodeInput,
  resolveInvite,
  resolveUser,
} from "../../../utils";
import { canReadChannel } from "../../../utils/canReadChannel";
import { resolveMessageTarget } from "../../../utils/resolveMessageTarget";
import { getChannelInfoEmbed } from "../functions/getChannelInfoEmbed";
import { getEmojiInfoEmbed } from "../functions/getEmojiInfoEmbed";
import { getGuildPreview } from "../functions/getGuildPreview";
import { getInviteInfoEmbed } from "../functions/getInviteInfoEmbed";
import { getMessageInfoEmbed } from "../functions/getMessageInfoEmbed";
import { getRoleInfoEmbed } from "../functions/getRoleInfoEmbed";
import { getServerInfoEmbed } from "../functions/getServerInfoEmbed";
import { getSnowflakeInfoEmbed } from "../functions/getSnowflakeInfoEmbed";
import { getUserInfoEmbed } from "../functions/getUserInfoEmbed";
import { utilityCmd } from "../types";

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
        const embed = await getChannelInfoEmbed(pluginData, channelId!, message.author.id);
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
        const embed = await getServerInfoEmbed(pluginData, value, message.author.id);
        if (embed) {
          message.channel.send({ embeds: [embed] });
          return;
        }
      }
    }

    // 3. User
    if (userCfg.can_userinfo) {
      const user = await resolveUser(pluginData.client, value);
      if (user && userCfg.can_userinfo) {
        const embed = await getUserInfoEmbed(pluginData, user.id, Boolean(args.compact), message.author.id);
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
        if (canReadChannel(messageTarget.channel, message.member)) {
          const embed = await getMessageInfoEmbed(
            pluginData,
            messageTarget.channel.id,
            messageTarget.messageId,
            message.author.id,
          );
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
        const embed = await getServerInfoEmbed(pluginData, value, message.author.id);
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
        const embed = await getRoleInfoEmbed(pluginData, role, message.author.id);
        message.channel.send({ embeds: [embed] });
        return;
      }
    }

    // 8. Emoji
    if (userCfg.can_emojiinfo) {
      const emojiIdMatch = value.match(customEmojiRegex);
      if (emojiIdMatch?.[2]) {
        const embed = await getEmojiInfoEmbed(pluginData, emojiIdMatch[2]);
        if (embed) {
          message.channel.send({ embeds: [embed] });
          return;
        }
      }
    }

    // 9. Arbitrary ID
    if (isValidSnowflake(value) && userCfg.can_snowflake) {
      const embed = await getSnowflakeInfoEmbed(pluginData, value, true, message.author.id);
      message.channel.send({ embeds: [embed] });
      return;
    }

    // 10. No can do
    sendErrorMessage(
      pluginData,
      message.channel,
      "Could not find anything with that value or you are lacking permission for the snowflake type",
    );
  },
});
