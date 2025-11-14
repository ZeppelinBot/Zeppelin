import { Emoji } from "discord.js";
import { GuildPluginData } from "vety";
import { LogType } from "../../../data/LogType.js";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter.js";
import { emojiToTemplateSafeEmoji } from "../../../utils/templateSafeObjects.js";
import { LogsPluginType } from "../types.js";
import { log } from "../util/log.js";

export interface LogEmojiCreateData {
  emoji: Emoji;
}

export function logEmojiCreate(pluginData: GuildPluginData<LogsPluginType>, data: LogEmojiCreateData) {
  return log(
    pluginData,
    LogType.EMOJI_CREATE,
    createTypedTemplateSafeValueContainer({
      emoji: emojiToTemplateSafeEmoji(data.emoji),
    }),
    {},
  );
}
