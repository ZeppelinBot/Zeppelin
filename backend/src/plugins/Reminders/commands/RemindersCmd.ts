import humanizeDuration from "humanize-duration";
import moment from "moment-timezone";
import { sendErrorMessage } from "../../../pluginUtils";
import { createChunkedMessage, DBDateFormat, sorter } from "../../../utils";
import { TimeAndDatePlugin } from "../../TimeAndDate/TimeAndDatePlugin";
import { remindersCmd } from "../types";

export const RemindersCmd = remindersCmd({
  trigger: "reminders",
  permission: "can_use",

  async run({ message: msg, args, pluginData }) {
    const reminders = await pluginData.state.reminders.getRemindersByUserId(msg.author.id);
    if (reminders.length === 0) {
      sendErrorMessage(pluginData, msg.channel, "No reminders");
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
