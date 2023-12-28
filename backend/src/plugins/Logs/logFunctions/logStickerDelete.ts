import { Sticker } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { stickerToTemplateSafeSticker } from "../../../utils/templateSafeObjects";
import { LogsPluginType } from "../types";
import { log } from "../util/log";

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
