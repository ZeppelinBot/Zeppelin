import { getGuildTz } from "../functions/getGuildTz";
import { timeAndDateCmd } from "../types";

export const ViewTimezoneCmd = timeAndDateCmd({
  trigger: "timezone",
  permission: "can_set_timezone",

  signature: {},

  async run({ pluginData, message, args }) {
    const memberTimezone = await pluginData.state.memberTimezones.get(message.author.id);
    if (memberTimezone) {
      message.channel.send(`Your timezone is currently set to **${memberTimezone.timezone}**`);
      return;
    }

    const serverTimezone = getGuildTz(pluginData);
    message.channel.send(`Your timezone is currently set to **${serverTimezone}** (server default)`);
  },
});
