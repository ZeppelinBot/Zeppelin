import { sendSuccessMessage } from "../../../pluginUtils.js";
import { getGuildTz } from "../functions/getGuildTz.js";
import { timeAndDateCmd } from "../types.js";

export const ResetTimezoneCmd = timeAndDateCmd({
  trigger: "timezone reset",
  permission: "can_set_timezone",

  signature: {},

  async run({ pluginData, message }) {
    await pluginData.state.memberTimezones.reset(message.author.id);
    const serverTimezone = getGuildTz(pluginData);
    sendSuccessMessage(
      pluginData,
      message.channel,
      `Your timezone has been reset to server default, **${serverTimezone}**`,
    );
  },
});
