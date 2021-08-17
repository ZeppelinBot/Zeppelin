import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { Sticker } from "discord.js";
import { stickerToTemplateSafeSticker } from "../../../utils/templateSafeObjects";

interface LogStickerDeleteData {
  sticker: Sticker;
}

export function logStickerDelete(pluginData: GuildPluginData<LogsPluginType>, data: LogStickerDeleteData) {
  return log(
    pluginData,
    LogType.STICKER_DELETE,
    createTypedTemplateSafeValueContainer({
      sticker: stickerToTemplateSafeSticker(data.sticker),
    }),
    {},
  );
}
