import { remindersCommand } from "../types";
import { sendErrorMessage } from "src/pluginUtils";
import { createChunkedMessage, sorter } from "src/utils";
import moment from "moment-timezone";
import humanizeDuration from "humanize-duration";
import { inGuildTz } from "../../../utils/timezones";
import { DBDateFormat, getDateFormat } from "../../../utils/dateFormats";

export const RemindersCmd = remindersCommand({
  trigger: "reminders",
  permission: "can_use",

  async run({ message: msg, args, pluginData }) {
    const reminders = await pluginData.state.reminders.getRemindersByUserId(msg.author.id);
    if (reminders.length === 0) {
      sendErrorMessage(pluginData, msg.channel, "No reminders");
      return;
    }

    reminders.sort(sorter("remind_at"));
    const longestNum = (reminders.length + 1).toString().length;
    const lines = Array.from(reminders.entries()).map(([i, reminder]) => {
      const num = i + 1;
      const paddedNum = num.toString().padStart(longestNum, " ");
      const target = moment.utc(reminder.remind_at, "YYYY-MM-DD HH:mm:ss");
      const diff = target.diff(moment.utc());
      const result = humanizeDuration(diff, { largest: 2, round: true });
      const prettyRemindAt = inGuildTz(pluginData, moment.utc(reminder.remind_at, DBDateFormat)).format(
        getDateFormat(pluginData, "pretty_datetime"),
      );
      return `\`${paddedNum}.\` \`${prettyRemindAt} (${result})\` ${reminder.body}`;
    });

    createChunkedMessage(msg.channel, lines.join("\n"));
  },
});
