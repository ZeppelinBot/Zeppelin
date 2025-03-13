import moment from "moment-timezone";
import { sendErrorMessage } from "../../../pluginUtils.js";
import {
	createChunkedMessage,
	sorter,
	toNativeTimestamp,
	toRelativeNativeTimestamp,
} from "../../../utils.js";
import { remindersCmd } from "../types.js";

export const RemindersCmd = remindersCmd({
	trigger: "reminders",
	permission: "can_use",

	async run({ message: msg, pluginData }) {
		const reminders = await pluginData.state.reminders.getRemindersByUserId(
			msg.author.id,
		);
		if (reminders.length === 0) {
			sendErrorMessage(pluginData, msg.channel, "No reminders");
			return;
		}

		reminders.sort(sorter("remind_at"));
		const longestNum = (reminders.length + 1).toString().length;
		const lines = Array.from(reminders.entries()).map(([i, reminder]) => {
			const num = i + 1;
			const paddedNum = num.toString().padStart(longestNum, " ");
			const target = moment.utc(reminder.remind_at);
			const relative = toRelativeNativeTimestamp(target, 0);
			const prettyRemindAt = toNativeTimestamp(target);
			return `\`${paddedNum}.\` ${prettyRemindAt} (${relative}) ${reminder.body}`;
		});

		createChunkedMessage(msg.channel, lines.join("\n"));
	},
});
