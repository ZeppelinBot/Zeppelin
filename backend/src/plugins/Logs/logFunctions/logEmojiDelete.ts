import { Emoji } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { emojiToTemplateSafeEmoji } from "../../../utils/templateSafeObjects";
import { LogsPluginType } from "../types";
import { log } from "../util/log";

interface LogEmojiDeleteData {
  emoji: Emoji;
}

export function logEmojiDelete(pluginData: GuildPluginData<LogsPluginType>, data: LogEmojiDeleteData) {
  return log(
    pluginData,
    LogType.EMOJI_DELETE,
    createTypedTemplateSafeValueContainer({
      emoji: emojiToTemplateSafeEmoji(data.emoji),
    }),
    {},
  );
}
