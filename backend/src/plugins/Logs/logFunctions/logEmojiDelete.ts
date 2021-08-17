import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { Emoji } from "discord.js";
import { emojiToTemplateSafeEmoji } from "../../../utils/templateSafeObjects";

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
