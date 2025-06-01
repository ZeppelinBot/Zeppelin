import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { mutesCmd } from "../types.js";

export const ClearMutesCmd = mutesCmd({
  trigger: "clear_mutes",
  permission: "can_cleanup",
  description: "Clear dangling mute records from the bot. Be careful not to clear valid mutes.",

  signature: {
    userIds: ct.string({ rest: true }),
  },

  async run({ pluginData, message: msg, args }) {
    const failed: string[] = [];
    for (const id of args.userIds) {
      const mute = await pluginData.state.mutes.findExistingMuteForUserId(id);
      if (!mute) {
        failed.push(id);
        continue;
      }
      await pluginData.state.mutes.clear(id);
    }

    if (failed.length !== args.userIds.length) {
      void pluginData.state.common.sendSuccessMessage(
        msg,
        `**${args.userIds.length - failed.length} active mute(s) cleared**`,
      );
    }

    if (failed.length) {
      void pluginData.state.common.sendErrorMessage(
        msg,
        `**${failed.length}/${args.userIds.length} IDs failed**, they are not muted: ${failed.join(" ")}`,
      );
    }
  },
});
