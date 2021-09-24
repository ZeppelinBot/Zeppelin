import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { Sticker } from "discord.js";
import { stickerToTemplateSafeSticker } from "../../../utils/templateSafeObjects";

interface LogStickerCreateData {
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
