import { timeAndDateCmd } from "../types";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendSuccessMessage } from "../../../pluginUtils";
import { getMemberTz } from "../functions/getMemberTz";
import { getGuildTz } from "../functions/getGuildTz";

export const ViewTimezoneCmd = timeAndDateCmd({
  trigger: "timezone",
  permission: "can_set_timezone",

  signature: {},

  async run({ pluginData, message, args }) {
    const memberTimezone = await pluginData.state.memberTimezones.get(message.author.id);
    if (memberTimezone) {
      message.channel.createMessage(`Your timezone is currently set to **${memberTimezone.timezone}**`);
      return;
    }

    const serverTimezone = getGuildTz(pluginData);
    message.channel.createMessage(`Your timezone is currently set to **${serverTimezone}** (server default)`);
  },
});
