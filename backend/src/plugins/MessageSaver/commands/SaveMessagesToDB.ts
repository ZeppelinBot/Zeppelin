import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { saveMessagesToDB } from "../saveMessagesToDB.js";
import { messageSaverCmd } from "../types.js";

export const SaveMessagesToDBCmd = messageSaverCmd({
  trigger: "save_messages_to_db",
  permission: "can_manage",
  source: "guild",

  signature: {
    channel: ct.textChannel(),
    ids: ct.string({ catchAll: true }),
  },

  async run({ message: msg, args, pluginData }) {
    await msg.channel.send("Saving specified messages...");
    const { savedCount, failed } = await saveMessagesToDB(pluginData, args.channel, args.ids.trim().split(" "));

    if (failed.length) {
      void pluginData.state.common.sendSuccessMessage(
        msg,
        `Saved ${savedCount} messages. The following messages could not be saved: ${failed.join(", ")}`,
      );
    } else {
      void pluginData.state.common.sendSuccessMessage(msg, `Saved ${savedCount} messages!`);
    }
  },
});
