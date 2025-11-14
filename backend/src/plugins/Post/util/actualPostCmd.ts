import { GuildTextBasedChannel, Message } from "discord.js";
import { GuildPluginData } from "vety";
import moment from "moment-timezone";
import { registerUpcomingScheduledPost } from "../../../data/loops/upcomingScheduledPostsLoop.js";
import { humanizeDuration } from "../../../humanizeDuration.js";
import { DBDateFormat, MINUTES, StrictMessageContent, errorMessage, renderUsername } from "../../../utils.js";
import { LogsPlugin } from "../../Logs/LogsPlugin.js";
import { TimeAndDatePlugin } from "../../TimeAndDate/TimeAndDatePlugin.js";
import { PostPluginType } from "../types.js";
import { parseScheduleTime } from "./parseScheduleTime.js";
import { postMessage } from "./postMessage.js";

const MIN_REPEAT_TIME = 5 * MINUTES;
const MAX_REPEAT_TIME = Math.pow(2, 32);
const MAX_REPEAT_UNTIL = moment.utc().add(100, "years");

export async function actualPostCmd(
  pluginData: GuildPluginData<PostPluginType>,
  msg: Message,
  targetChannel: GuildTextBasedChannel,
  content: StrictMessageContent,
  opts: {
    "enable-mentions"?: boolean;
    schedule?: string;
    repeat?: number;
    "repeat-until"?: string;
    "repeat-times"?: number;
  } = {},
) {
  if (!targetChannel.isSendable()) {
    msg.reply(errorMessage("Specified channel is not a sendable channel"));
    return;
  }

  if (content == null && msg.attachments.size === 0) {
    msg.reply(errorMessage("Message content or attachment required"));
    return;
  }

  if (opts.repeat) {
    if (opts.repeat < MIN_REPEAT_TIME) {
      void pluginData.state.common.sendErrorMessage(
        msg,
        `Minimum time for -repeat is ${humanizeDuration(MIN_REPEAT_TIME)}`,
      );
      return;
    }
    if (opts.repeat > MAX_REPEAT_TIME) {
      void pluginData.state.common.sendErrorMessage(
        msg,
        `Max time for -repeat is ${humanizeDuration(MAX_REPEAT_TIME)}`,
      );
      return;
    }
  }

  // If this is a scheduled or repeated post, figure out the next post date
  let postAt;
  if (opts.schedule) {
    // Schedule the post to be posted later
    postAt = await parseScheduleTime(pluginData, msg.author.id, opts.schedule);
    if (!postAt) {
      void pluginData.state.common.sendErrorMessage(msg, "Invalid schedule time");
      return;
    }
  } else if (opts.repeat) {
    postAt = moment.utc().add(opts.repeat, "ms");
  }

  // For repeated posts, make sure repeat-until or repeat-times is specified
  let repeatUntil: moment.Moment | null = null;
  let repeatTimes: number | null = null;
  let repeatDetailsStr: string | null = null;

  if (opts["repeat-until"]) {
    repeatUntil = await parseScheduleTime(pluginData, msg.author.id, opts["repeat-until"]);

    // Invalid time
    if (!repeatUntil) {
      void pluginData.state.common.sendErrorMessage(msg, "Invalid time specified for -repeat-until");
      return;
    }
    if (repeatUntil.isBefore(moment.utc())) {
      void pluginData.state.common.sendErrorMessage(msg, "You can't set -repeat-until in the past");
      return;
    }
    if (repeatUntil.isAfter(MAX_REPEAT_UNTIL)) {
      void pluginData.state.common.sendErrorMessage(
        msg,
        "Unfortunately, -repeat-until can only be at most 100 years into the future. Maybe 99 years would be enough?",
      );
      return;
    }
  } else if (opts["repeat-times"]) {
    repeatTimes = opts["repeat-times"];
    if (repeatTimes <= 0) {
      void pluginData.state.common.sendErrorMessage(msg, "-repeat-times must be 1 or more");
      return;
    }
  }

  if (repeatUntil && repeatTimes) {
    void pluginData.state.common.sendErrorMessage(
      msg,
      "You can only use one of -repeat-until or -repeat-times at once",
    );
    return;
  }

  if (opts.repeat && !repeatUntil && !repeatTimes) {
    void pluginData.state.common.sendErrorMessage(
      msg,
      "You must specify -repeat-until or -repeat-times for repeated messages",
    );
    return;
  }

  if (opts.repeat) {
    repeatDetailsStr = repeatUntil
      ? `every ${humanizeDuration(opts.repeat)} until ${repeatUntil.format(DBDateFormat)}`
      : `every ${humanizeDuration(opts.repeat)}, ${repeatTimes} times in total`;
  }

  const timeAndDate = pluginData.getPlugin(TimeAndDatePlugin);

  // Save schedule/repeat information in DB
  if (postAt) {
    if (postAt < moment.utc()) {
      void pluginData.state.common.sendErrorMessage(msg, "Post can't be scheduled to be posted in the past");
      return;
    }

    const post = await pluginData.state.scheduledPosts.create({
      author_id: msg.author.id,
      author_name: renderUsername(msg.author),
      channel_id: targetChannel.id,
      content,
      attachments: [...msg.attachments.values()],
      post_at: postAt.clone().tz("Etc/UTC").format(DBDateFormat),
      enable_mentions: opts["enable-mentions"],
      repeat_interval: opts.repeat,
      repeat_until: repeatUntil ? repeatUntil.clone().tz("Etc/UTC").format(DBDateFormat) : null,
      repeat_times: repeatTimes ?? null,
    });
    registerUpcomingScheduledPost(post);

    if (opts.repeat) {
      pluginData.getPlugin(LogsPlugin).logScheduledRepeatedMessage({
        author: msg.author,
        channel: targetChannel,
        datetime: postAt.format(timeAndDate.getDateFormat("pretty_datetime")),
        date: postAt.format(timeAndDate.getDateFormat("date")),
        time: postAt.format(timeAndDate.getDateFormat("time")),
        repeatInterval: humanizeDuration(opts.repeat),
        repeatDetails: repeatDetailsStr!,
      });
    } else {
      pluginData.getPlugin(LogsPlugin).logScheduledMessage({
        author: msg.author,
        channel: targetChannel,
        datetime: postAt.format(timeAndDate.getDateFormat("pretty_datetime")),
        date: postAt.format(timeAndDate.getDateFormat("date")),
        time: postAt.format(timeAndDate.getDateFormat("time")),
      });
    }
  }

  // When the message isn't scheduled for later, post it immediately
  if (!opts.schedule) {
    await postMessage(pluginData, targetChannel, content, [...msg.attachments.values()], opts["enable-mentions"]);
  }

  if (opts.repeat) {
    pluginData.getPlugin(LogsPlugin).logRepeatedMessage({
      author: msg.author,
      channel: targetChannel,
      datetime: postAt.format(timeAndDate.getDateFormat("pretty_datetime")),
      date: postAt.format(timeAndDate.getDateFormat("date")),
      time: postAt.format(timeAndDate.getDateFormat("time")),
      repeatInterval: humanizeDuration(opts.repeat),
      repeatDetails: repeatDetailsStr ?? "",
    });
  }

  // Bot reply schenanigans
  let successMessage = opts.schedule
    ? `Message scheduled to be posted in <#${targetChannel.id}> on ${postAt.format(
        timeAndDate.getDateFormat("pretty_datetime"),
      )}`
    : `Message posted in <#${targetChannel.id}>`;

  if (opts.repeat) {
    successMessage += `. Message will be automatically reposted every ${humanizeDuration(opts.repeat)}`;

    if (repeatUntil) {
      successMessage += ` until ${repeatUntil.format(timeAndDate.getDateFormat("pretty_datetime"))}`;
    } else if (repeatTimes) {
      successMessage += `, ${repeatTimes} times in total`;
    }

    successMessage += ".";
  }

  if (targetChannel.id !== msg.channel.id || opts.schedule || opts.repeat) {
    void pluginData.state.common.sendSuccessMessage(msg, successMessage);
  }
}
