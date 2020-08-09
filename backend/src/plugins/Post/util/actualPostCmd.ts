import { Message, Channel, TextChannel } from "eris";
import { StrictMessageContent, errorMessage, stripObjectToScalars, MINUTES } from "src/utils";
import moment from "moment-timezone";
import { LogType } from "src/data/LogType";
import humanizeDuration from "humanize-duration";
import { sendErrorMessage, sendSuccessMessage } from "src/pluginUtils";
import { PluginData } from "knub";
import { PostPluginType } from "../types";
import { parseScheduleTime } from "./parseScheduleTime";
import { postMessage } from "./postMessage";
import { DBDateFormat, getDateFormat } from "../../../utils/dateFormats";

const MIN_REPEAT_TIME = 5 * MINUTES;
const MAX_REPEAT_TIME = Math.pow(2, 32);
const MAX_REPEAT_UNTIL = moment.utc().add(100, "years");

export async function actualPostCmd(
  pluginData: PluginData<PostPluginType>,
  msg: Message,
  targetChannel: Channel,
  content: StrictMessageContent,
  opts?: {
    "enable-mentions"?: boolean;
    schedule?: string;
    repeat?: number;
    "repeat-until"?: string;
    "repeat-times"?: number;
  },
) {
  if (!(targetChannel instanceof TextChannel)) {
    msg.channel.createMessage(errorMessage("Channel is not a text channel"));
    return;
  }

  if (content == null && msg.attachments.length === 0) {
    msg.channel.createMessage(errorMessage("Message content or attachment required"));
    return;
  }

  if (opts.repeat) {
    if (opts.repeat < MIN_REPEAT_TIME) {
      return sendErrorMessage(
        pluginData,
        msg.channel,
        `Minimum time for -repeat is ${humanizeDuration(MIN_REPEAT_TIME)}`,
      );
    }
    if (opts.repeat > MAX_REPEAT_TIME) {
      return sendErrorMessage(pluginData, msg.channel, `Max time for -repeat is ${humanizeDuration(MAX_REPEAT_TIME)}`);
    }
  }

  // If this is a scheduled or repeated post, figure out the next post date
  let postAt;
  if (opts.schedule) {
    // Schedule the post to be posted later
    postAt = parseScheduleTime(pluginData, opts.schedule);
    if (!postAt) {
      return sendErrorMessage(pluginData, msg.channel, "Invalid schedule time");
    }
  } else if (opts.repeat) {
    postAt = moment.utc().add(opts.repeat, "ms");
  }

  // For repeated posts, make sure repeat-until or repeat-times is specified
  let repeatUntil: moment.Moment = null;
  let repeatTimes: number = null;
  let repeatDetailsStr: string = null;

  if (opts["repeat-until"]) {
    repeatUntil = parseScheduleTime(pluginData, opts["repeat-until"]);

    // Invalid time
    if (!repeatUntil) {
      return sendErrorMessage(pluginData, msg.channel, "Invalid time specified for -repeat-until");
    }
    if (repeatUntil.isBefore(moment.utc())) {
      return sendErrorMessage(pluginData, msg.channel, "You can't set -repeat-until in the past");
    }
    if (repeatUntil.isAfter(MAX_REPEAT_UNTIL)) {
      return sendErrorMessage(
        pluginData,
        msg.channel,
        "Unfortunately, -repeat-until can only be at most 100 years into the future. Maybe 99 years would be enough?",
      );
    }
  } else if (opts["repeat-times"]) {
    repeatTimes = opts["repeat-times"];
    if (repeatTimes <= 0) {
      return sendErrorMessage(pluginData, msg.channel, "-repeat-times must be 1 or more");
    }
  }

  if (repeatUntil && repeatTimes) {
    return sendErrorMessage(pluginData, msg.channel, "You can only use one of -repeat-until or -repeat-times at once");
  }

  if (opts.repeat && !repeatUntil && !repeatTimes) {
    return sendErrorMessage(
      pluginData,
      msg.channel,
      "You must specify -repeat-until or -repeat-times for repeated messages",
    );
  }

  if (opts.repeat) {
    repeatDetailsStr = repeatUntil
      ? `every ${humanizeDuration(opts.repeat)} until ${repeatUntil.format(DBDateFormat)}`
      : `every ${humanizeDuration(opts.repeat)}, ${repeatTimes} times in total`;
  }

  // Save schedule/repeat information in DB
  if (postAt) {
    if (postAt < moment.utc()) {
      return sendErrorMessage(pluginData, msg.channel, "Post can't be scheduled to be posted in the past");
    }

    await pluginData.state.scheduledPosts.create({
      author_id: msg.author.id,
      author_name: `${msg.author.username}#${msg.author.discriminator}`,
      channel_id: targetChannel.id,
      content,
      attachments: msg.attachments,
      post_at: postAt
        .clone()
        .tz("Etc/UTC")
        .format(DBDateFormat),
      enable_mentions: opts["enable-mentions"],
      repeat_interval: opts.repeat,
      repeat_until: repeatUntil
        ? repeatUntil
            .clone()
            .tz("Etc/UTC")
            .format(DBDateFormat)
        : null,
      repeat_times: repeatTimes ?? null,
    });

    if (opts.repeat) {
      pluginData.state.logs.log(LogType.SCHEDULED_REPEATED_MESSAGE, {
        author: stripObjectToScalars(msg.author),
        channel: stripObjectToScalars(targetChannel),
        datetime: postAt.format(getDateFormat(pluginData, "pretty_datetime")),
        date: postAt.format(getDateFormat(pluginData, "date")),
        time: postAt.format(getDateFormat(pluginData, "time")),
        repeatInterval: humanizeDuration(opts.repeat),
        repeatDetails: repeatDetailsStr,
      });
    } else {
      pluginData.state.logs.log(LogType.SCHEDULED_MESSAGE, {
        author: stripObjectToScalars(msg.author),
        channel: stripObjectToScalars(targetChannel),
        datetime: postAt.format(getDateFormat(pluginData, "pretty_datetime")),
        date: postAt.format(getDateFormat(pluginData, "date")),
        time: postAt.format(getDateFormat(pluginData, "time")),
      });
    }
  }

  // When the message isn't scheduled for later, post it immediately
  if (!opts.schedule) {
    await postMessage(pluginData, targetChannel, content, msg.attachments, opts["enable-mentions"]);
  }

  if (opts.repeat) {
    pluginData.state.logs.log(LogType.REPEATED_MESSAGE, {
      author: stripObjectToScalars(msg.author),
      channel: stripObjectToScalars(targetChannel),
      datetime: postAt.format(getDateFormat(pluginData, "pretty_datetime")),
      date: postAt.format(getDateFormat(pluginData, "date")),
      time: postAt.format(getDateFormat(pluginData, "time")),
      repeatInterval: humanizeDuration(opts.repeat),
      repeatDetails: repeatDetailsStr,
    });
  }

  // Bot reply schenanigans
  let successMessage = opts.schedule
    ? `Message scheduled to be posted in <#${targetChannel.id}> on ${postAt.format(
        getDateFormat(pluginData, "pretty_datetime"),
      )}`
    : `Message posted in <#${targetChannel.id}>`;

  if (opts.repeat) {
    successMessage += `. Message will be automatically reposted every ${humanizeDuration(opts.repeat)}`;

    if (repeatUntil) {
      successMessage += ` until ${repeatUntil.format(getDateFormat(pluginData, "pretty_datetime"))}`;
    } else if (repeatTimes) {
      successMessage += `, ${repeatTimes} times in total`;
    }

    successMessage += ".";
  }

  if (targetChannel.id !== msg.channel.id || opts.schedule || opts.repeat) {
    sendSuccessMessage(pluginData, msg.channel, successMessage);
  }
}
