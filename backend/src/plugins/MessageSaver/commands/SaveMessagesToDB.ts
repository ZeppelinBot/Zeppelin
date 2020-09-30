import { messageSaverCmd } from "../types";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { saveMessagesToDB } from "../saveMessagesToDB";
import { sendSuccessMessage } from "../../../pluginUtils";

export const SaveMessagesToDBCmd = messageSaverCmd({
  trigger: "save_messages_to_db",
  permission: "can_manage",
  source: "guild",

  signature: {
    channel: ct.textChannel(),
    ids: ct.string({ catchAll: true }),
  },

  async run({ message: msg, args, pluginData }) {
    await msg.channel.createMessage("Saving specified messages...");
    const { savedCount, failed } = await saveMessagesToDB(pluginData, args.channel, args.ids.trim().split(" "));

    if (failed.length) {
      sendSuccessMessage(
        pluginData,
        msg.channel,
        `Saved ${savedCount} messages. The following messages could not be saved: ${failed.join(", ")}`,
      );
    } else {
      sendSuccessMessage(pluginData, msg.channel, `Saved ${savedCount} messages!`);
    }
  },
});
