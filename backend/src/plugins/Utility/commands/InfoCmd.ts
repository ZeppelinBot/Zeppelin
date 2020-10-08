import { utilityCmd } from "../types";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage } from "../../../pluginUtils";
import { getInviteInfoEmbed } from "../functions/getInviteInfoEmbed";
import { isValidSnowflake, parseInviteCodeInput, resolveInvite, resolveUser } from "../../../utils";
import { getUserInfoEmbed } from "../functions/getUserInfoEmbed";
import { resolveMessageTarget } from "../../../utils/resolveMessageTarget";
import { canReadChannel } from "../../../utils/canReadChannel";
import { getMessageInfoEmbed } from "../functions/getMessageInfoEmbed";
import { getChannelInfoEmbed } from "../functions/getChannelInfoEmbed";
import { getServerInfoEmbed } from "../functions/getServerInfoEmbed";
import { getRoleInfoEmbed } from "../functions/getRoleInfoEmbed";
import { getChannelId } from "knub/dist/utils";
import { getGuildPreview } from "../functions/getGuildPreview";
import { getSnowflakeInfoEmbed } from "../functions/getSnowflakeInfoEmbed";
import { getRoleId } from "knub/dist/utils";

export const InfoCmd = utilityCmd({
  trigger: "info",
  description: "Show information about the specified thing",
  usage: "!info",
  permission: "can_info",

  signature: {
    value: ct.string({ required: false }),

    compact: ct.switchOption({ shortcut: "c" }),
  },

  async run({ message, args, pluginData }) {
    const value = args.value || message.author.id;

    // 1. Channel
    const channelId = getChannelId(value);
    const channel = channelId && pluginData.guild.channels.get(channelId);
    if (channel) {
      const embed = await getChannelInfoEmbed(pluginData, channelId, message.author.id);
      if (embed) {
        message.channel.createMessage({ embed });
        return;
      }
    }

    // 2. Server
    const guild = pluginData.client.guilds.get(value);
    if (guild) {
      const embed = await getServerInfoEmbed(pluginData, value, message.author.id);
      if (embed) {
        message.channel.createMessage({ embed });
        return;
      }
    }

    // 3. User
    const user = await resolveUser(pluginData.client, value);
    if (user) {
      const embed = await getUserInfoEmbed(pluginData, user.id, Boolean(args.compact), message.author.id);
      if (embed) {
        message.channel.createMessage({ embed });
        return;
      }
    }

    // 4. Message
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
          message.channel.createMessage({ embed });
          return;
        }
      }
    }

    // 5. Invite
    const inviteCode = await parseInviteCodeInput(value);
    if (inviteCode) {
      const invite = await resolveInvite(pluginData.client, inviteCode, true);
      if (invite) {
        const embed = await getInviteInfoEmbed(pluginData, inviteCode);
        if (embed) {
          message.channel.createMessage({ embed });
          return;
        }
      }
    }

    // 6. Server again (fallback for discovery servers)
    const serverPreview = getGuildPreview(pluginData.client, value).catch(() => null);
    if (serverPreview) {
      const embed = await getServerInfoEmbed(pluginData, value, message.author.id);
      if (embed) {
        message.channel.createMessage({ embed });
        return;
      }
    }

    // 7. Role ID
    const roleId = getRoleId(value);
    const role = roleId && pluginData.guild.roles.get(roleId);
    if (role) {
      const embed = await getRoleInfoEmbed(pluginData, roleId, message.author.id);
      if (embed) {
        message.channel.createMessage({ embed });
	return;
      }
    }

    // TODO 8. Emoji ID

    // 9. Arbitrary ID
    if (isValidSnowflake(value)) {
      const embed = await getSnowflakeInfoEmbed(pluginData, value, true, message.author.id);
      message.channel.createMessage({ embed });
      return;
    }

    // 10. No can do
    sendErrorMessage(pluginData, message.channel, "Could not find anything with that value");
  },
});
