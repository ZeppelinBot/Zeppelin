import { ChannelType, escapeInlineCode } from "discord.js";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { asSingleLine } from "../../../utils";
import { getMissingChannelPermissions } from "../../../utils/getMissingChannelPermissions";
import { missingPermissionError } from "../../../utils/missingPermissionError";
import { BOT_SLOWMODE_CLEAR_PERMISSIONS } from "../requiredPermissions";
import { slowmodeCmd } from "../types";
import { clearBotSlowmodeFromUserId } from "../util/clearBotSlowmodeFromUserId";

export const SlowmodeClearCmd = slowmodeCmd({
  trigger: ["slowmode clear", "slowmode c"],
  permission: "can_manage",

  signature: {
    channel: ct.textChannel(),
    user: ct.resolvedUserLoose(),

    force: ct.bool({ option: true, isSwitch: true }),
  },

  async run({ message: msg, args, pluginData }) {
    const channelSlowmode = await pluginData.state.slowmodes.getChannelSlowmode(args.channel.id);
    if (!channelSlowmode) {
      sendErrorMessage(pluginData, msg.channel, "Channel doesn't have slowmode!");
      return;
    }

    const me = pluginData.guild.members.cache.get(pluginData.client.user!.id)!;
    const missingPermissions = getMissingChannelPermissions(me, args.channel, BOT_SLOWMODE_CLEAR_PERMISSIONS);
    if (missingPermissions) {
      sendErrorMessage(
        pluginData,
        msg.channel,
        `Unable to clear slowmode. ${missingPermissionError(missingPermissions)}`,
      );
      return;
    }

    try {
      if (args.channel.type === ChannelType.GuildText) {
        await clearBotSlowmodeFromUserId(pluginData, args.channel, args.user.id, args.force);
      } else {
        sendErrorMessage(
          pluginData,
          msg.channel,
          asSingleLine(`
            Failed to clear slowmode from **${args.user.tag}** in <#${args.channel.id}>:
            Threads cannot have Bot Slowmode
          `),
        );
        return;
      }
    } catch (e) {
      sendErrorMessage(
        pluginData,
        msg.channel,
        asSingleLine(`
          Failed to clear slowmode from **${args.user.tag}** in <#${args.channel.id}>:
          \`${escapeInlineCode(e.message)}\`
        `),
      );
      return;
    }

    sendSuccessMessage(pluginData, msg.channel, `Slowmode cleared from **${args.user.tag}** in <#${args.channel.id}>`);
  },
});
