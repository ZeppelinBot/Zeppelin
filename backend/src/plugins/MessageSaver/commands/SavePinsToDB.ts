import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendSuccessMessage } from "../../../pluginUtils";
import { saveMessagesToDB } from "../saveMessagesToDB";
import { messageSaverCmd } from "../types";

export const SavePinsToDBCmd = messageSaverCmd({
  trigger: "save_pins_to_db",
  permission: "can_manage",
  source: "guild",

  signature: {
    channel: ct.textChannel(),
  },

  async run({ message: msg, args, pluginData }) {
    await msg.channel.send(`Saving pins from <#${args.channel.id}>...`);

    const pins = await args.channel.messages.fetchPinned();
    const { savedCount, failed } = await saveMessagesToDB(pluginData, args.channel, pins.keyArray());

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
