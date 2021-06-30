import { Snowflake, TextChannel } from "discord.js";
import humanizeDuration from "humanize-duration";
import { GuildPluginData } from "knub";
import { disableLinkPreviews } from "knub/dist/helpers";
import moment from "moment-timezone";
import { SECONDS } from "../../../utils";
import { RemindersPluginType } from "../types";

const REMINDER_LOOP_TIME = 10 * SECONDS;
const MAX_TRIES = 3;

export async function postDueRemindersLoop(pluginData: GuildPluginData<RemindersPluginType>) {
  const pendingReminders = await pluginData.state.reminders.getDueReminders();
  for (const reminder of pendingReminders) {
    const channel = pluginData.guild.channels.cache.get(reminder.channel_id as Snowflake);
    if (channel && channel instanceof TextChannel) {
      try {
        // Only show created at date if one exists
        if (moment.utc(reminder.created_at).isValid()) {
          const target = moment.utc();
          const diff = target.diff(moment.utc(reminder.created_at, "YYYY-MM-DD HH:mm:ss"));
          const result = humanizeDuration(diff, { largest: 2, round: true });
          await channel.send({
            content: disableLinkPreviews(
              `Reminder for <@!${reminder.user_id}>: ${reminder.body} \n\`Set at ${reminder.created_at} (${result} ago)\``,
            ),
            allowedMentions: {
              users: [reminder.user_id as Snowflake],
            },
          });
        } else {
          await channel.send({
            content: disableLinkPreviews(`Reminder for <@!${reminder.user_id}>: ${reminder.body}`),
            allowedMentions: {
              users: [reminder.user_id as Snowflake],
            },
          });
        }
      } catch {
        // Probably random Discord internal server error or missing permissions or somesuch
        // Try again next round unless we've already tried to post this a bunch of times
        const tries = pluginData.state.tries.get(reminder.id) || 0;
        if (tries < MAX_TRIES) {
          pluginData.state.tries.set(reminder.id, tries + 1);
          continue;
        }
      }
    }

    await pluginData.state.reminders.delete(reminder.id);
  }

  if (!pluginData.state.unloaded) {
    pluginData.state.postRemindersTimeout = setTimeout(() => postDueRemindersLoop(pluginData), REMINDER_LOOP_TIME);
  }
}
