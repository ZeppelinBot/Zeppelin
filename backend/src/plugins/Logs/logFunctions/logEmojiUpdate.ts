import { Emoji } from "discord.js";
import { GuildPluginData } from "vety";
import { LogType } from "../../../data/LogType.js";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter.js";
import { emojiToTemplateSafeEmoji } from "../../../utils/templateSafeObjects.js";
import { LogsPluginType } from "../types.js";
import { log } from "../util/log.js";

export interface LogEmojiUpdateData {
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
