import { GuildPluginData } from "knub";
import { PostPluginType } from "../types";
import { logger } from "../../../logger";
import { stripObjectToScalars, SECONDS, DBDateFormat } from "../../../utils";
import { LogType } from "../../../data/LogType";
import moment from "moment-timezone";
import { TextChannel, User } from "eris";
import { postMessage } from "./postMessage";

const SCHEDULED_POST_CHECK_INTERVAL = 5 * SECONDS;

export async function scheduledPostLoop(pluginData: GuildPluginData<PostPluginType>) {
  const duePosts = await pluginData.state.scheduledPosts.getDueScheduledPosts();
  for (const post of duePosts) {
    const channel = pluginData.guild.channels.get(post.channel_id);
    if (channel instanceof TextChannel) {
      const [username, discriminator] = post.author_name.split("#");
      const author: Partial<User> = pluginData.client.users.get(post.author_id) || {
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
