import { Emoji } from "discord.js";
import { GuildPluginData } from "vety";
import { LogType } from "../../../data/LogType.js";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter.js";
import { emojiToTemplateSafeEmoji } from "../../../utils/templateSafeObjects.js";
import { LogsPluginType } from "../types.js";
import { log } from "../util/log.js";

export interface LogEmojiDeleteData {
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
