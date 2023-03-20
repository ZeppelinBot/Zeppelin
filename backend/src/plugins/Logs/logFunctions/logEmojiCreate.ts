import { Emoji } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { emojiToTemplateSafeEmoji } from "../../../utils/templateSafeObjects";
import { LogsPluginType } from "../types";
import { log } from "../util/log";

interface LogEmojiCreateData {
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
