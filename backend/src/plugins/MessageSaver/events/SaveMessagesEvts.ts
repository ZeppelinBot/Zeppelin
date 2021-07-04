import { Message } from "discord.js";
import { messageSaverEvt } from "../types";

export const MessageCreateEvt = messageSaverEvt({
  event: "messageCreate",
  allowBots: true,
  allowSelf: true,

  async listener(meta) {
    // Only save regular chat messages
    if (meta.args.message.type !== "DEFAULT" && meta.args.message.type !== "REPLY") {
      return;
    }

    await meta.pluginData.state.savedMessages.createFromMsg(meta.args.message);
  },
});

export const MessageUpdateEvt = messageSaverEvt({
  event: "messageUpdate",
  allowBots: true,
  allowSelf: true,

  async listener(meta) {
    if (meta.args.newMessage.type !== "DEFAULT" && meta.args.newMessage.type !== "REPLY") {
      return;
    }

    await meta.pluginData.state.savedMessages.saveEditFromMsg(meta.args.newMessage as Message);
  },
});

export const MessageDeleteEvt = messageSaverEvt({
  event: "messageDelete",
  allowBots: true,
  allowSelf: true,

  async listener(meta) {
    const msg = meta.args.message as Message;
    if (msg.type != null && meta.args.message.type !== "DEFAULT" && meta.args.message.type !== "REPLY") {
      return;
    }

    await meta.pluginData.state.savedMessages.markAsDeleted(msg.id);
  },
});

export const MessageDeleteBulkEvt = messageSaverEvt({
  event: "messageDeleteBulk",
  allowBots: true,
  allowSelf: true,

  async listener(meta) {
    const ids = meta.args.messages.map(m => m.id);
    await meta.pluginData.state.savedMessages.markBulkAsDeleted(ids);
  },
});
