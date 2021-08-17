import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { Emoji } from "discord.js";
import { emojiToTemplateSafeEmoji } from "../../../utils/templateSafeObjects";

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
