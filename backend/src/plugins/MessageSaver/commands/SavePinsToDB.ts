import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { saveMessagesToDB } from "../saveMessagesToDB.js";
import { messageSaverCmd } from "../types.js";

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
    const { savedCount, failed } = await saveMessagesToDB(pluginData, args.channel, [...pins.keys()]);

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
