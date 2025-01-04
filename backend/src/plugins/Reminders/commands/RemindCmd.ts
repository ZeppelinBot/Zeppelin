import moment from "moment-timezone";
import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { registerUpcomingReminder } from "../../../data/loops/upcomingRemindersLoop.js";
import { humanizeDuration } from "../../../humanizeDuration.js";
import { convertDelayStringToMS, messageLink } from "../../../utils.js";
import { TimeAndDatePlugin } from "../../TimeAndDate/TimeAndDatePlugin.js";
import { remindersCmd } from "../types.js";

export const RemindCmd = remindersCmd({
  trigger: ["remind", "remindme", "reminder"],
  usage: "!remind 3h Remind me of this in 3 hours please",
  permission: "can_use",

  signature: {
    time: ct.string(),
    reminder: ct.string({ required: false, catchAll: true }),
  },

  async run({ message: msg, args, pluginData }) {
    const timeAndDate = pluginData.getPlugin(TimeAndDatePlugin);

    const now = moment.utc();
    const tz = await timeAndDate.getMemberTz(msg.author.id);

    let reminderTime: moment.Moment;
    if (args.time.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
      // Date in YYYY-MM-DD format, remind at current time on that date
      reminderTime = moment.tz(args.time, "YYYY-M-D", tz).set({
        hour: now.hour(),
        minute: now.minute(),
        second: now.second(),
      });
    } else if (args.time.match(/^\d{4}-\d{1,2}-\d{1,2}T\d{2}:\d{2}$/)) {
      // Date and time in YYYY-MM-DD[T]HH:mm format
      reminderTime = moment.tz(args.time, "YYYY-M-D[T]HH:mm", tz).second(0);
    } else {
      // "Delay string" i.e. e.g. "2h30m"
      const ms = convertDelayStringToMS(args.time);
      if (ms === null) {
        void pluginData.state.common.sendErrorMessage(msg, "Invalid reminder time");
        return;
      }

      reminderTime = moment.utc().add(ms, "millisecond");
    }

    if (!reminderTime.isValid() || reminderTime.isBefore(now)) {
      void pluginData.state.common.sendErrorMessage(msg, "Invalid reminder time");
      return;
    }

    const reminderBody = args.reminder || messageLink(pluginData.guild.id, msg.channel.id, msg.id);
    const reminder = await pluginData.state.reminders.add(
      msg.author.id,
      msg.channel.id,
      reminderTime.clone().tz("Etc/UTC").format("YYYY-MM-DD HH:mm:ss"),
      reminderBody,
      moment.utc().format("YYYY-MM-DD HH:mm:ss"),
    );

    registerUpcomingReminder(reminder);

    const msUntilReminder = reminderTime.diff(now);
    const timeUntilReminder = humanizeDuration(msUntilReminder, { largest: 2, round: true });
    const prettyReminderTime = (await timeAndDate.inMemberTz(msg.author.id, reminderTime)).format(
      pluginData.getPlugin(TimeAndDatePlugin).getDateFormat("pretty_datetime"),
    );

    void pluginData.state.common.sendSuccessMessage(
      msg,
      `I will remind you in **${timeUntilReminder}** at **${prettyReminderTime}**`,
    );
  },
});
