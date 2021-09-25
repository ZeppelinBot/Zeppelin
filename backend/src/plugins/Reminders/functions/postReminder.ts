import { GuildPluginData } from "knub";
import { RemindersPluginType } from "../types";
import { Reminder } from "../../../data/entities/Reminder";
import { Snowflake, TextChannel } from "discord.js";
import moment from "moment-timezone";
import { disableLinkPreviews } from "knub/dist/helpers";
import { DBDateFormat, SECONDS } from "../../../utils";
import humanizeDuration from "humanize-duration";

export async function postReminder(pluginData: GuildPluginData<RemindersPluginType>, reminder: Reminder) {
  const channel = pluginData.guild.channels.cache.get(reminder.channel_id as Snowflake);
  if (channel && (channel.isText() || channel.isThread())) {
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
      // If we were unable to post the reminder, we'll try again later
      console.warn(`Error when posting reminder for ${reminder.user_id} in guild ${reminder.guild_id}: ${String(err)}`);
      return;
    }
  }

  await pluginData.state.reminders.delete(reminder.id);
}
