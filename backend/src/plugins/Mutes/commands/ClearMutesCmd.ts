import { commandTypeHelpers as ct } from "../../../commandTypes";
import { CommonPlugin } from "../../Common/CommonPlugin";
import { mutesCmd } from "../types";

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
      pluginData
        .getPlugin(CommonPlugin)
        .sendSuccessMessage(msg, `**${args.userIds.length - failed.length} active mute(s) cleared**`);
    }

    if (failed.length) {
      pluginData
        .getPlugin(CommonPlugin)
        .sendErrorMessage(
          msg,
          `**${failed.length}/${args.userIds.length} IDs failed**, they are not muted: ${failed.join(" ")}`,
        );
    }
  },
});
