import { timeAndDateCmd } from "../types";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendSuccessMessage } from "../../../pluginUtils";

export const SetTimezoneCmd = timeAndDateCmd({
  trigger: "timezone",
  permission: "can_set_timezone",

  signature: {
    timezone: ct.timezone(),
  },

  async run({ pluginData, message, args }) {
    await pluginData.state.memberTimezones.set(message.author.id, args.timezone);
    sendSuccessMessage(pluginData, message.channel, `Your timezone is now set to **${args.timezone}**`);
  },
});
