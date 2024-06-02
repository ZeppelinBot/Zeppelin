import { escapeInlineCode } from "discord.js";
import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils.js";
import { trimLines } from "../../../utils.js";
import { parseFuzzyTimezone } from "../../../utils/parseFuzzyTimezone.js";
import { timeAndDateCmd } from "../types.js";

export const SetTimezoneCmd = timeAndDateCmd({
  trigger: "timezone",
  permission: "can_set_timezone",

  signature: {
    timezone: ct.string(),
  },

  async run({ pluginData, message, args }) {
    const parsedTz = parseFuzzyTimezone(args.timezone);
    if (!parsedTz) {
      sendErrorMessage(
        pluginData,
        message.channel,
        trimLines(`
        Invalid timezone: \`${escapeInlineCode(args.timezone)}\`
        Zeppelin uses timezone locations rather than specific timezone names.
        See the **TZ database name** column at <https://en.wikipedia.org/wiki/List_of_tz_database_time_zones> for a list of valid options.
      `),
      );
      return;
    }

    await pluginData.state.memberTimezones.set(message.author.id, parsedTz);
    sendSuccessMessage(pluginData, message.channel, `Your timezone is now set to **${parsedTz}**`);
  },
});
