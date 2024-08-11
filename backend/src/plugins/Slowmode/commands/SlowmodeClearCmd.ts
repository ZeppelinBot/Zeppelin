import { ChannelType, escapeInlineCode } from "discord.js";
import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { asSingleLine, renderUsername } from "../../../utils.js";
import { getMissingChannelPermissions } from "../../../utils/getMissingChannelPermissions.js";
import { missingPermissionError } from "../../../utils/missingPermissionError.js";
import { BOT_SLOWMODE_CLEAR_PERMISSIONS } from "../requiredPermissions.js";
import { slowmodeCmd } from "../types.js";
import { clearBotSlowmodeFromUserId } from "../util/clearBotSlowmodeFromUserId.js";

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
      void pluginData.state.common.sendErrorMessage(msg, "Channel doesn't have slowmode!");
      return;
    }

    const me = pluginData.guild.members.cache.get(pluginData.client.user!.id)!;
    const missingPermissions = getMissingChannelPermissions(me, args.channel, BOT_SLOWMODE_CLEAR_PERMISSIONS);
    if (missingPermissions) {
      void pluginData.state.common.sendErrorMessage(
        msg,
        `Unable to clear slowmode. ${missingPermissionError(missingPermissions)}`,
      );
      return;
    }

    try {
      if (args.channel.type === ChannelType.GuildText) {
        await clearBotSlowmodeFromUserId(pluginData, args.channel, args.user.id, args.force);
      } else {
        void pluginData.state.common.sendErrorMessage(
          msg,
          asSingleLine(`
            Failed to clear slowmode from **${renderUsername(args.user)}** in <#${args.channel.id}>:
            Threads cannot have Bot Slowmode
          `),
        );
        return;
      }
    } catch (e) {
      void pluginData.state.common.sendErrorMessage(
        msg,
        asSingleLine(`
          Failed to clear slowmode from **${renderUsername(args.user)}** in <#${args.channel.id}>:
          \`${escapeInlineCode(e.message)}\`
        `),
      );
      return;
    }

    void pluginData.state.common.sendSuccessMessage(
      msg,
      `Slowmode cleared from **${renderUsername(args.user)}** in <#${args.channel.id}>`,
    );
  },
});
