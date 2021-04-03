import { messageSaverCmd } from "../types";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { saveMessagesToDB } from "../saveMessagesToDB";
import { sendSuccessMessage } from "../../../pluginUtils";

export const SavePinsToDBCmd = messageSaverCmd({
  trigger: "save_pins_to_db",
  permission: "can_manage",
  source: "guild",

  signature: {
    channel: ct.textChannel(),
  },

  async run({ message: msg, args, pluginData }) {
    await msg.channel.createMessage(`Saving pins from <#${args.channel.id}>...`);

    const pins = await args.channel.getPins();
    const { savedCount, failed } = await saveMessagesToDB(
      pluginData,
      args.channel,
      pins.map((m) => m.id),
    );

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
