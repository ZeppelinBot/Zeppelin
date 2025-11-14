import { Sticker } from "discord.js";
import { GuildPluginData } from "vety";
import { LogType } from "../../../data/LogType.js";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter.js";
import { stickerToTemplateSafeSticker } from "../../../utils/templateSafeObjects.js";
import { LogsPluginType } from "../types.js";
import { log } from "../util/log.js";

export interface LogStickerCreateData {
  sticker: Sticker;
}

export function logStickerCreate(pluginData: GuildPluginData<LogsPluginType>, data: LogStickerCreateData) {
  return log(
    pluginData,
    LogType.STICKER_CREATE,
    createTypedTemplateSafeValueContainer({
      sticker: stickerToTemplateSafeSticker(data.sticker),
    }),
    {},
  );
}
