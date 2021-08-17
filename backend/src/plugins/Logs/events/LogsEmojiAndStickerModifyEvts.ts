import { differenceToString, getScalarDifference } from "../../../utils";
import { logsEvt } from "../types";
import { logEmojiCreate } from "../logFunctions/logEmojiCreate";
import { logEmojiDelete } from "../logFunctions/logEmojiDelete";
import { logEmojiUpdate } from "../logFunctions/logEmojiUpdate";
import { logStickerCreate } from "../logFunctions/logStickerCreate";
import { logStickerDelete } from "../logFunctions/logStickerDelete";
import { logStickerUpdate } from "../logFunctions/logStickerUpdate";

export const LogsEmojiCreateEvt = logsEvt({
  event: "emojiCreate",

  async listener(meta) {
    logEmojiCreate(meta.pluginData, {
      emoji: meta.args.emoji,
    });
  },
});

export const LogsEmojiDeleteEvt = logsEvt({
  event: "emojiDelete",

  async listener(meta) {
    logEmojiDelete(meta.pluginData, {
      emoji: meta.args.emoji,
    });
  },
});

export const LogsEmojiUpdateEvt = logsEvt({
  event: "emojiUpdate",

  async listener(meta) {
    const diff = getScalarDifference(meta.args.oldEmoji, meta.args.newEmoji);
    const differenceString = differenceToString(diff);

    logEmojiUpdate(meta.pluginData, {
      oldEmoji: meta.args.oldEmoji,
      newEmoji: meta.args.newEmoji,
      differenceString,
    });
  },
});

export const LogsStickerCreateEvt = logsEvt({
  event: "stickerCreate",

  async listener(meta) {
    logStickerCreate(meta.pluginData, {
      sticker: meta.args.sticker,
    });
  },
});

export const LogsStickerDeleteEvt = logsEvt({
  event: "stickerDelete",

  async listener(meta) {
    logStickerDelete(meta.pluginData, {
      sticker: meta.args.sticker,
    });
  },
});

export const LogsStickerUpdateEvt = logsEvt({
  event: "stickerUpdate",

  async listener(meta) {
    const diff = getScalarDifference(meta.args.oldSticker, meta.args.newSticker);
    const differenceString = differenceToString(diff);

    logStickerUpdate(meta.pluginData, {
      oldSticker: meta.args.oldSticker,
      newSticker: meta.args.newSticker,
      differenceString,
    });
  },
});
