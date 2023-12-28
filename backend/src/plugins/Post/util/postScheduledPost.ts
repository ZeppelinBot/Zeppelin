import { Snowflake, User } from "discord.js";
import { GuildPluginData } from "knub";
import moment from "moment-timezone";
import { ScheduledPost } from "../../../data/entities/ScheduledPost";
import { registerUpcomingScheduledPost } from "../../../data/loops/upcomingScheduledPostsLoop";
import { logger } from "../../../logger";
import { DBDateFormat, verboseChannelMention, verboseUserMention } from "../../../utils";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { PostPluginType } from "../types";
import { postMessage } from "./postMessage";

export async function postScheduledPost(pluginData: GuildPluginData<PostPluginType>, post: ScheduledPost) {
  // First, update the scheduled post or delete it from the database *before* we try posting it.
  // This ensures strange errors don't cause reposts.
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
  } else {
    const upToDatePost = (await pluginData.state.scheduledPosts.find(post.id))!;
    registerUpcomingScheduledPost(upToDatePost);
  }

  // Post the message
  const channel = pluginData.guild.channels.cache.get(post.channel_id as Snowflake);
  if (channel?.isTextBased() || channel?.isThread()) {
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
      pluginData.getPlugin(LogsPlugin).logPostedScheduledMessage({
        author,
        channel,
        messageId: postedMessage.id,
      });
    } catch {
      pluginData.getPlugin(LogsPlugin).logBotAlert({
        body: `Failed to post scheduled message by ${verboseUserMention(author)} to ${verboseChannelMention(channel)}`,
      });
      logger.warn(
        `Failed to post scheduled message to #${channel.name} (${channel.id}) on ${pluginData.guild.name} (${pluginData.guild.id})`,
      );
    }
  }
}
