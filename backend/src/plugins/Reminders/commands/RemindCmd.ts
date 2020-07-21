import { commandTypeHelpers as ct } from "../../../commandTypes";
import moment from "moment-timezone";
import { convertDelayStringToMS } from "src/utils";
import humanizeDuration from "humanize-duration";
import { sendErrorMessage, sendSuccessMessage } from "src/pluginUtils";
import { remindersCommand } from "../types";

export const RemindCmd = remindersCommand({
  trigger: ["remind", "remindme"],
  usage: "!remind 3h Remind me of this in 3 hours please",
  permission: "can_use",

  signature: {
    time: ct.string(),
    reminder: ct.string({ required: false, catchAll: true }),
  },

  async run({ message: msg, args, pluginData }) {
    const now = moment();

    let reminderTime;
    if (args.time.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
      // Date in YYYY-MM-DD format, remind at current time on that date
      reminderTime = moment(args.time, "YYYY-M-D").set({
        hour: now.hour(),
        minute: now.minute(),
        second: now.second(),
      });
    } else if (args.time.match(/^\d{4}-\d{1,2}-\d{1,2}T\d{2}:\d{2}$/)) {
      // Date and time in YYYY-MM-DD[T]HH:mm format
      reminderTime = moment(args.time, "YYYY-M-D[T]HH:mm").second(0);
    } else {
      // "Delay string" i.e. e.g. "2h30m"
      const ms = convertDelayStringToMS(args.time);
      if (ms === null) {
        sendErrorMessage(pluginData, msg.channel, "Invalid reminder time");
        return;
      }

      reminderTime = moment().add(ms, "millisecond");
    }

    if (!reminderTime.isValid() || reminderTime.isBefore(now)) {
      sendErrorMessage(pluginData, msg.channel, "Invalid reminder time");
      return;
    }

    const reminderBody = args.reminder || `https://discord.com/channels/${this.guildId}/${msg.channel.id}/${msg.id}`;
    await pluginData.state.reminders.add(
      msg.author.id,
      msg.channel.id,
      reminderTime.format("YYYY-MM-DD HH:mm:ss"),
      reminderBody,
      moment().format("YYYY-MM-DD HH:mm:ss"),
    );

    const msUntilReminder = reminderTime.diff(now);
    const timeUntilReminder = humanizeDuration(msUntilReminder, { largest: 2, round: true });
    sendSuccessMessage(
      pluginData,
      msg.channel,
      `I will remind you in **${timeUntilReminder}** at **${reminderTime.format("YYYY-MM-DD, HH:mm")}**`,
    );
  },
});
