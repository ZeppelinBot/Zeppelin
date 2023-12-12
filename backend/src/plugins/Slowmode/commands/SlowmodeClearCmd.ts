import { ChannelType, escapeInlineCode } from "discord.js";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { asSingleLine, renderUserUsername } from "../../../utils";
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

    try {
      if (args.channel.type === ChannelType.GuildText) {
        await clearBotSlowmodeFromUserId(pluginData, args.channel, args.user.id, args.force);
      } else {
        sendErrorMessage(
          pluginData,
          msg.channel,
          asSingleLine(`
            Failed to clear slowmode from **${renderUserUsername(args.user)}** in <#${args.channel.id}>:
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
          Failed to clear slowmode from **${renderUserUsername(args.user)}** in <#${args.channel.id}>:
          \`${escapeInlineCode(e.message)}\`
        `),
      );
      return;
    }

    sendSuccessMessage(
      pluginData,
      msg.channel,
      `Slowmode cleared from **${renderUserUsername(args.user)}** in <#${args.channel.id}>`,
    );
  },
});
