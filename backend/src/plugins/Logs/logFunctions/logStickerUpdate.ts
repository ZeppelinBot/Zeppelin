import { Sticker } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { stickerToTemplateSafeSticker } from "../../../utils/templateSafeObjects";
import { LogsPluginType } from "../types";
import { log } from "../util/log";

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
