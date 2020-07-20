import { messageSaverEvt } from "../types";
import { Message } from "eris";

export const MessageCreateEvt = messageSaverEvt({
  event: "messageCreate",
  allowOutsideOfGuild: false,

  async listener(meta) {
    // Only save regular chat messages
    if (meta.args.message.type !== 0) {
      return;
    }

    await meta.pluginData.state.savedMessages.createFromMsg(meta.args.message);
  },
});

export const MessageUpdateEvt = messageSaverEvt({
  event: "messageUpdate",
  allowOutsideOfGuild: false,

  async listener(meta) {
    if (meta.args.message.type !== 0) {
      return;
    }

    await meta.pluginData.state.savedMessages.saveEditFromMsg(meta.args.message);
  },
});

export const MessageDeleteEvt = messageSaverEvt({
  event: "messageDelete",
  allowOutsideOfGuild: false,

  async listener(meta) {
    const msg = meta.args.message as Message;
    if (msg.type != null && msg.type !== 0) {
      return;
    }

    await meta.pluginData.state.savedMessages.markAsDeleted(msg.id);
  },
});

export const MessageDeleteBulkEvt = messageSaverEvt({
  event: "messageDeleteBulk",
  allowOutsideOfGuild: false,

  async listener(meta) {
    const ids = meta.args.messages.map(m => m.id);
    await meta.pluginData.state.savedMessages.markBulkAsDeleted(ids);
  },
});
