import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { Emoji } from "discord.js";
import { emojiToTemplateSafeEmoji } from "../../../utils/templateSafeObjects";

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
