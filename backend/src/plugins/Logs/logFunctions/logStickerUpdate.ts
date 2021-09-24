import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { Sticker } from "discord.js";
import { stickerToTemplateSafeSticker } from "../../../utils/templateSafeObjects";

interface LogStickerUpdateData {
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
