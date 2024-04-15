import { CommonPlugin } from "../../Common/CommonPlugin";
import { getGuildTz } from "../functions/getGuildTz";
import { timeAndDateCmd } from "../types";

export const ResetTimezoneCmd = timeAndDateCmd({
  trigger: "timezone reset",
  permission: "can_set_timezone",

  signature: {},

  async run({ pluginData, message }) {
    await pluginData.state.memberTimezones.reset(message.author.id);
    const serverTimezone = getGuildTz(pluginData);
    void pluginData.state.common.sendSuccessMessage(message, `Your timezone has been reset to server default, **${serverTimezone}**`);
  },
});
