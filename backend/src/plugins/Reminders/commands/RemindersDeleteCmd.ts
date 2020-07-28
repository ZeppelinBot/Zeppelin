import { remindersCommand } from "../types";
import { sendErrorMessage, sendSuccessMessage } from "src/pluginUtils";
import { sorter } from "src/utils";
import { commandTypeHelpers as ct } from "../../../commandTypes";

export const RemindersDeleteCmd = remindersCommand({
  trigger: ["reminders delete", "reminders d"],
  permission: "can_use",

  signature: {
    num: ct.number(),
  },

  async run({ message: msg, args, pluginData }) {
    const reminders = await pluginData.state.reminders.getRemindersByUserId(msg.author.id);
    reminders.sort(sorter("remind_at"));
    const lastNum = reminders.length + 1;

    if (args.num > lastNum || args.num <= 0) {
      sendErrorMessage(pluginData, msg.channel, "Unknown reminder");
      return;
    }

    const toDelete = reminders[args.num - 1];
    await pluginData.state.reminders.delete(toDelete.id);

    sendSuccessMessage(pluginData, msg.channel, "Reminder deleted");
  },
});
