import { Channel, GuildTextBasedChannel, Message, NewsChannel, TextChannel, ThreadChannel } from "discord.js";
import humanizeDuration from "humanize-duration";
import { GuildPluginData } from "knub";
import moment from "moment-timezone";
import { channelToTemplateSafeChannel, userToTemplateSafeUser } from "../../../utils/templateSafeObjects";
import { LogType } from "../../../data/LogType";
import { sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { DBDateFormat, errorMessage, MINUTES, StrictMessageContent } from "../../../utils";
import { TimeAndDatePlugin } from "../../TimeAndDate/TimeAndDatePlugin";
import { PostPluginType } from "../types";
import { parseScheduleTime } from "./parseScheduleTime";
import { postMessage } from "./postMessage";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { registerUpcomingScheduledPost } from "../../../data/loops/upcomingScheduledPostsLoop";

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
  if (!targetChannel.isText()) {
    msg.channel.send(errorMessage("Specified channel is not a text-based channel"));
    return;
  }

  if (content == null && msg.attachments.size === 0) {
    msg.channel.send(errorMessage("Message content or attachment required"));
    return;
  }

  if (opts.repeat) {
    if (opts.repeat < MIN_REPEAT_TIME) {
      sendErrorMessage(
        pluginData,
        msg.channel as TextChannel,
        `Minimum time for -repeat is ${humanizeDuration(MIN_REPEAT_TIME)}`,
      );
      return;
    }
    if (opts.repeat > MAX_REPEAT_TIME) {
      sendErrorMessage(
        pluginData,
        msg.channel as TextChannel,
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
      sendErrorMessage(pluginData, msg.channel as TextChannel, "Invalid schedule time");
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
      sendErrorMessage(pluginData, msg.channel as TextChannel, "Invalid time specified for -repeat-until");
      return;
    }
    if (repeatUntil.isBefore(moment.utc())) {
      sendErrorMessage(pluginData, msg.channel as TextChannel, "You can't set -repeat-until in the past");
      return;
    }
    if (repeatUntil.isAfter(MAX_REPEAT_UNTIL)) {
      sendErrorMessage(
        pluginData,
        msg.channel as TextChannel,
        "Unfortunately, -repeat-until can only be at most 100 years into the future. Maybe 99 years would be enough?",
      );
      return;
    }
  } else if (opts["repeat-times"]) {
    repeatTimes = opts["repeat-times"];
    if (repeatTimes <= 0) {
      sendErrorMessage(pluginData, msg.channel as TextChannel, "-repeat-times must be 1 or more");
      return;
    }
  }

  if (repeatUntil && repeatTimes) {
    sendErrorMessage(
      pluginData,
      msg.channel as TextChannel,
      "You can only use one of -repeat-until or -repeat-times at once",
    );
    return;
  }

  if (opts.repeat && !repeatUntil && !repeatTimes) {
    sendErrorMessage(
      pluginData,
      msg.channel as TextChannel,
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
      sendErrorMessage(pluginData, msg.channel as TextChannel, "Post can't be scheduled to be posted in the past");
      return;
    }

    const post = await pluginData.state.scheduledPosts.create({
      author_id: msg.author.id,
      author_name: msg.author.tag,
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
    sendSuccessMessage(pluginData, msg.channel as TextChannel, successMessage);
  }
}
