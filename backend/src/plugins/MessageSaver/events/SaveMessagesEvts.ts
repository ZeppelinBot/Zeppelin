import { Message, MessageType } from "discord.js";
import { messageSaverEvt } from "../types";

const AFFECTED_MESSAGE_TYPES: MessageType[] = [MessageType.Default, MessageType.Reply, MessageType.ChatInputCommand];

export const MessageCreateEvt = messageSaverEvt({
  event: "messageCreate",
  allowBots: true,
  allowSelf: true,

  async listener(meta) {
    // Don't save partial messages
    if (meta.args.message.partial) {
      return;
    }

    if (!AFFECTED_MESSAGE_TYPES.includes(meta.args.message.type)) {
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
    if (meta.args.newMessage.partial) {
      return;
    }

    if (!AFFECTED_MESSAGE_TYPES.includes(meta.args.newMessage.type)) {
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
    if (!meta.args.message.partial && !AFFECTED_MESSAGE_TYPES.includes(meta.args.message.type)) {
      return;
    }

    await meta.pluginData.state.savedMessages.markAsDeleted(meta.args.message.id);
  },
});

export const MessageDeleteBulkEvt = messageSaverEvt({
  event: "messageDeleteBulk",
  allowBots: true,
  allowSelf: true,

  async listener(meta) {
    const affectedMessages = meta.args.messages.filter((m) => m.partial || AFFECTED_MESSAGE_TYPES.includes(m.type));
    const ids = affectedMessages.map((m) => m.id);
    await meta.pluginData.state.savedMessages.markBulkAsDeleted(ids);
  },
});
