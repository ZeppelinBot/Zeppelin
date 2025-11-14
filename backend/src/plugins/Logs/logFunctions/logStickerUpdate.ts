import { Sticker } from "discord.js";
import { GuildPluginData } from "vety";
import { LogType } from "../../../data/LogType.js";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter.js";
import { stickerToTemplateSafeSticker } from "../../../utils/templateSafeObjects.js";
import { LogsPluginType } from "../types.js";
import { log } from "../util/log.js";

export interface LogStickerUpdateData {
  oldSticker: Sticker;
  newSticker: Sticker;
  differenceString: string;
}

export function logStickerUpdate(pluginData: GuildPluginData<LogsPluginType>, data: LogStickerUpdateData) {
  return log(
    pluginData,
    LogType.STICKER_UPDATE,
    createTypedTemplateSafeValueContainer({
      oldSticker: stickerToTemplateSafeSticker(data.oldSticker),
      newSticker: stickerToTemplateSafeSticker(data.newSticker),
      differenceString: data.differenceString,
    }),
    {},
  );
}
