import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { disableInlineCode, trimLines } from "../../../utils";
import { parseFuzzyTimezone } from "../../../utils/parseFuzzyTimezone";
import { timeAndDateCmd } from "../types";

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
        Invalid timezone: \`${disableInlineCode(args.timezone)}\`
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
