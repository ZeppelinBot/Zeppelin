import { HTTPError, Snowflake } from "discord.js";
import { GuildPluginData } from "vety";
import { disableLinkPreviews } from "vety/helpers";
import moment from "moment-timezone";
import { Reminder } from "../../../data/entities/Reminder.js";
import { DBDateFormat } from "../../../utils.js";
import { RemindersPluginType } from "../types.js";

export async function postReminder(pluginData: GuildPluginData<RemindersPluginType>, reminder: Reminder) {
  const channel = pluginData.guild.channels.cache.get(reminder.channel_id as Snowflake);
  if (channel && (channel.isTextBased() || channel.isThread())) {
    try {
      // Only show created at date if one exists
      if (moment.utc(reminder.created_at).isValid()) {
        const createdAtTS = Math.floor(moment.utc(reminder.created_at, DBDateFormat).valueOf() / 1000);
        await channel.send({
          content: disableLinkPreviews(
            `Reminder for <@!${reminder.user_id}>: ${reminder.body} \nSet <t:${createdAtTS}:R>`,
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
    } catch (err) {
      // tslint:disable-next-line:no-console
      console.warn(`Error when posting reminder for ${reminder.user_id} in guild ${reminder.guild_id}: ${String(err)}`);

      if (err instanceof HTTPError && err.status >= 500) {
        // If we get a server error, try again later
        return;
      }
    }
  }

  await pluginData.state.reminders.delete(reminder.id);
}
