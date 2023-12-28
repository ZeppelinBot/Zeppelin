import { Sticker } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { stickerToTemplateSafeSticker } from "../../../utils/templateSafeObjects";
import { LogsPluginType } from "../types";
import { log } from "../util/log";

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
