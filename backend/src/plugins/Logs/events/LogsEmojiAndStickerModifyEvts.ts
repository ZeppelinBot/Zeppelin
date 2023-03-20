import { GuildEmoji, Sticker } from "discord.js";
import { differenceToString, getScalarDifference } from "../../../utils";
import { filterObject } from "../../../utils/filterObject";
import { logEmojiCreate } from "../logFunctions/logEmojiCreate";
import { logEmojiDelete } from "../logFunctions/logEmojiDelete";
import { logEmojiUpdate } from "../logFunctions/logEmojiUpdate";
import { logStickerCreate } from "../logFunctions/logStickerCreate";
import { logStickerDelete } from "../logFunctions/logStickerDelete";
import { logStickerUpdate } from "../logFunctions/logStickerUpdate";
import { logsEvt } from "../types";

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
