import { timeAndDateCmd } from "../types";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendSuccessMessage } from "../../../pluginUtils";
import { getGuildTz } from "../functions/getGuildTz";

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
