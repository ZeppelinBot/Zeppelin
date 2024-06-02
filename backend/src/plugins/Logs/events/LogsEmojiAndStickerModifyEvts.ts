import { GuildEmoji, Sticker } from "discord.js";
import { differenceToString, getScalarDifference } from "../../../utils.js";
import { filterObject } from "../../../utils/filterObject.js";
import { logEmojiCreate } from "../logFunctions/logEmojiCreate.js";
import { logEmojiDelete } from "../logFunctions/logEmojiDelete.js";
import { logEmojiUpdate } from "../logFunctions/logEmojiUpdate.js";
import { logStickerCreate } from "../logFunctions/logStickerCreate.js";
import { logStickerDelete } from "../logFunctions/logStickerDelete.js";
import { logStickerUpdate } from "../logFunctions/logStickerUpdate.js";
import { logsEvt } from "../types.js";

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

const validEmojiDiffProps: Set<keyof GuildEmoji> = new Set(["name"]);

export const LogsEmojiUpdateEvt = logsEvt({
  event: "emojiUpdate",

  async listener(meta) {
    const oldEmojiDiffProps = filterObject(meta.args.oldEmoji || {}, (v, k) => validEmojiDiffProps.has(k));
    const newEmojiDiffProps = filterObject(meta.args.newEmoji, (v, k) => validEmojiDiffProps.has(k));
    const diff = getScalarDifference(oldEmojiDiffProps, newEmojiDiffProps);
    const differenceString = differenceToString(diff);

    if (differenceString === "") {
      return;
    }

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

const validStickerDiffProps: Set<keyof Sticker> = new Set(["name"]);

export const LogsStickerUpdateEvt = logsEvt({
  event: "stickerUpdate",

  async listener(meta) {
    const oldStickerDiffProps = filterObject(meta.args.oldSticker || {}, (v, k) => validStickerDiffProps.has(k));
    const newStickerDiffProps = filterObject(meta.args.newSticker, (v, k) => validStickerDiffProps.has(k));
    const diff = getScalarDifference(oldStickerDiffProps, newStickerDiffProps);
    const differenceString = differenceToString(diff);

    if (differenceString === "") {
      return;
    }

    logStickerUpdate(meta.pluginData, {
      oldSticker: meta.args.oldSticker,
      newSticker: meta.args.newSticker,
      differenceString,
    });
  },
});
