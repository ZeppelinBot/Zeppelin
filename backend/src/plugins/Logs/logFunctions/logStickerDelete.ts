import { Sticker } from "discord.js";
import { GuildPluginData } from "vety";
import { LogType } from "../../../data/LogType.js";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter.js";
import { stickerToTemplateSafeSticker } from "../../../utils/templateSafeObjects.js";
import { LogsPluginType } from "../types.js";
import { log } from "../util/log.js";

export interface LogStickerDeleteData {
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
