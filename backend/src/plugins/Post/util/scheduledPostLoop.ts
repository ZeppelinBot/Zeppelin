import { Snowflake, TextChannel, User } from "discord.js";
import { GuildPluginData } from "knub";
import moment from "moment-timezone";
import { LogType } from "../../../data/LogType";
import { logger } from "../../../logger";
import { DBDateFormat, SECONDS, stripObjectToScalars } from "../../../utils";
import { PostPluginType } from "../types";
import { postMessage } from "./postMessage";

const SCHEDULED_POST_CHECK_INTERVAL = 5 * SECONDS;

export async function scheduledPostLoop(pluginData: GuildPluginData<PostPluginType>) {
  const duePosts = await pluginData.state.scheduledPosts.getDueScheduledPosts();
  for (const post of duePosts) {
    const channel = pluginData.guild.channels.cache.get(post.channel_id as Snowflake);
    if (channel instanceof TextChannel) {
      const [username, discriminator] = post.author_name.split("#");
      const author: User = (await pluginData.client.users.fetch(post.author_id as Snowflake)) || {
        id: post.author_id,
        username,
        discriminator,
      };

      try {
        const postedMessage = await postMessage(
          pluginData,
          channel,
          post.content,
          post.attachments,
          post.enable_mentions,
        );
        pluginData.state.logs.log(LogType.POSTED_SCHEDULED_MESSAGE, {
          author: stripObjectToScalars(author),
          channel: stripObjectToScalars(channel),
          messageId: postedMessage.id,
        });
      } catch {
        pluginData.state.logs.log(LogType.BOT_ALERT, {
          body: `Failed to post scheduled message by {userMention(author)} to {channelMention(channel)}`,
          channel: stripObjectToScalars(channel),
          author: stripObjectToScalars(author),
        });
        logger.warn(
          `Failed to post scheduled message to #${channel.name} (${channel.id}) on ${pluginData.guild.name} (${pluginData.guild.id})`,
        );
      }
    }

    let shouldClear = true;

    if (post.repeat_interval) {
      const nextPostAt = moment.utc().add(post.repeat_interval, "ms");

      if (post.repeat_until) {
        const repeatUntil = moment.utc(post.repeat_until, DBDateFormat);
        if (nextPostAt.isSameOrBefore(repeatUntil)) {
          await pluginData.state.scheduledPosts.update(post.id, {
            post_at: nextPostAt.format(DBDateFormat),
          });
          shouldClear = false;
        }
      } else if (post.repeat_times) {
        if (post.repeat_times > 1) {
          await pluginData.state.scheduledPosts.update(post.id, {
            post_at: nextPostAt.format(DBDateFormat),
            repeat_times: post.repeat_times - 1,
          });
          shouldClear = false;
        }
      }
    }

    if (shouldClear) {
      await pluginData.state.scheduledPosts.delete(post.id);
    }
  }

  pluginData.state.scheduledPostLoopTimeout = setTimeout(
    () => scheduledPostLoop(pluginData),
    SCHEDULED_POST_CHECK_INTERVAL,
  );
}
