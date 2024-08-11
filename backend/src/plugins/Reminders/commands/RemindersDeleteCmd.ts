import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { clearUpcomingReminder } from "../../../data/loops/upcomingRemindersLoop.js";
import { sorter } from "../../../utils.js";
import { remindersCmd } from "../types.js";

export const RemindersDeleteCmd = remindersCmd({
  trigger: ["reminders delete", "reminders d"],
  permission: "can_use",

  signature: {
    num: ct.number(),
  },

  async run({ message: msg, args, pluginData }) {
    const reminders = await pluginData.state.reminders.getRemindersByUserId(msg.author.id);
    reminders.sort(sorter("remind_at"));

    if (args.num > reminders.length || args.num <= 0) {
      void pluginData.state.common.sendErrorMessage(msg, "Unknown reminder");
      return;
    }

    const toDelete = reminders[args.num - 1];
    clearUpcomingReminder(toDelete);
    await pluginData.state.reminders.delete(toDelete.id);

    void pluginData.state.common.sendSuccessMessage(msg, "Reminder deleted");
  },
});
