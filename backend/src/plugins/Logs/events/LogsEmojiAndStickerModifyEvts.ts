import { LogType } from "../../../data/LogType";
import { differenceToString, getScalarDifference } from "../../../utils";
import {
  channelToConfigAccessibleChannel,
  emojiToConfigAccessibleEmoji,
  stickerToConfigAccessibleSticker,
} from "../../../utils/configAccessibleObjects";
import { logsEvt } from "../types";

export const LogsEmojiCreateEvt = logsEvt({
  event: "emojiCreate",

  async listener(meta) {
    meta.pluginData.state.guildLogs.log(LogType.EMOJI_CREATE, {
      emoji: emojiToConfigAccessibleEmoji(meta.args.emoji),
    });
  },
});

export const LogsEmojiDeleteEvt = logsEvt({
  event: "emojiDelete",

  async listener(meta) {
    meta.pluginData.state.guildLogs.log(LogType.EMOJI_DELETE, {
      emoji: emojiToConfigAccessibleEmoji(meta.args.emoji),
    });
  },
});

export const LogsEmojiUpdateEvt = logsEvt({
  event: "emojiUpdate",

  async listener(meta) {
    const diff = getScalarDifference(meta.args.oldEmoji, meta.args.newEmoji);
    const differenceString = differenceToString(diff);

    meta.pluginData.state.guildLogs.log(LogType.EMOJI_UPDATE, {
      oldEmoji: emojiToConfigAccessibleEmoji(meta.args.oldEmoji),
      newEmoji: emojiToConfigAccessibleEmoji(meta.args.newEmoji),
      differenceString,
    });
  },
});

export const LogsStickerCreateEvt = logsEvt({
  event: "stickerCreate",

  async listener(meta) {
    meta.pluginData.state.guildLogs.log(LogType.STICKER_CREATE, {
      sticker: stickerToConfigAccessibleSticker(meta.args.sticker),
    });
  },
});

export const LogsStickerDeleteEvt = logsEvt({
  event: "stickerDelete",

  async listener(meta) {
    meta.pluginData.state.guildLogs.log(LogType.STICKER_DELETE, {
      sticker: stickerToConfigAccessibleSticker(meta.args.sticker),
    });
  },
});

export const LogsStickerUpdateEvt = logsEvt({
  event: "stickerUpdate",

  async listener(meta) {
    const diff = getScalarDifference(meta.args.oldSticker, meta.args.newSticker);
    const differenceString = differenceToString(diff);

    meta.pluginData.state.guildLogs.log(
      LogType.STICKER_UPDATE,
      {
        oldSticker: stickerToConfigAccessibleSticker(meta.args.oldSticker),
        newSticker: stickerToConfigAccessibleSticker(meta.args.newSticker),
        differenceString,
      },
      meta.args.newSticker.id,
    );
  },
});
