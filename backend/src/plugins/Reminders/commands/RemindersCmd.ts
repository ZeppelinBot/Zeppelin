import moment from "moment-timezone";
import { humanizeDuration } from "../../../humanizeDuration.js";
import { createChunkedMessage, DBDateFormat, sorter } from "../../../utils.js";
import { TimeAndDatePlugin } from "../../TimeAndDate/TimeAndDatePlugin.js";
import { remindersCmd } from "../types.js";

export const RemindersCmd = remindersCmd({
  trigger: "reminders",
  permission: "can_use",

  async run({ message: msg, pluginData }) {
    const reminders = await pluginData.state.reminders.getRemindersByUserId(msg.author.id);
    if (reminders.length === 0) {
      void pluginData.state.common.sendErrorMessage(msg, "No reminders");
      return;
    }

    const timeAndDate = pluginData.getPlugin(TimeAndDatePlugin);

    reminders.sort(sorter("remind_at"));
    const longestNum = (reminders.length + 1).toString().length;
    const lines = Array.from(reminders.entries()).map(([i, reminder]) => {
      const num = i + 1;
      const paddedNum = num.toString().padStart(longestNum, " ");
      const target = moment.utc(reminder.remind_at, "YYYY-MM-DD HH:mm:ss");
      const diff = target.diff(moment.utc());
      const result = humanizeDuration(diff, { largest: 2, round: true });
      const prettyRemindAt = timeAndDate
        .inGuildTz(moment.utc(reminder.remind_at, DBDateFormat))
        .format(timeAndDate.getDateFormat("pretty_datetime"));
      return `\`${paddedNum}.\` \`${prettyRemindAt} (${result})\` ${reminder.body}`;
    });

    createChunkedMessage(msg.channel, lines.join("\n"));
  },
});
