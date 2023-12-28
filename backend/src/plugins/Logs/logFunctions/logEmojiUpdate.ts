import { Emoji } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { emojiToTemplateSafeEmoji } from "../../../utils/templateSafeObjects";
import { LogsPluginType } from "../types";
import { log } from "../util/log";

interface LogEmojiUpdateData {
  oldEmoji: Emoji;
  newEmoji: Emoji;
  differenceString: string;
}

export function logEmojiUpdate(pluginData: GuildPluginData<LogsPluginType>, data: LogEmojiUpdateData) {
  return log(
    pluginData,
    LogType.EMOJI_UPDATE,
    createTypedTemplateSafeValueContainer({
      oldEmoji: emojiToTemplateSafeEmoji(data.oldEmoji),
      newEmoji: emojiToTemplateSafeEmoji(data.newEmoji),
      differenceString: data.differenceString,
    }),
    {},
  );
}
