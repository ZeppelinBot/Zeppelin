import { Message, Snowflake } from "discord.js";
import { messageSaverEvt } from "../types";
import { SECONDS } from "../../../utils";

const recentlyCreatedMessages: Snowflake[] = [];
const recentlyCreatedMessagesToKeep = 100;

setInterval(() => {
  const toDelete = recentlyCreatedMessages.length - recentlyCreatedMessagesToKeep;
  if (toDelete > 0) {
    recentlyCreatedMessages.splice(0, toDelete);
  }
}, 60 * SECONDS);

export const MessageCreateEvt = messageSaverEvt({
  event: "messageCreate",
  allowBots: true,
  allowSelf: true,

  async listener(meta) {
    // Only save regular chat messages
    if (meta.args.message.type !== "DEFAULT" && meta.args.message.type !== "REPLY") {
      return;
    }

    // Don't save partial messages
    if (meta.args.message.partial) {
      return;
    }

    meta.pluginData.state.queue.add(async () => {
      if (recentlyCreatedMessages.includes(meta.args.message.id)) {
        console.warn(
          `Tried to save duplicate message from messageCreate event: ${meta.args.message.guildId} / ${meta.args.message.channelId} / ${meta.args.message.id}`,
        );
        return;
      }
      recentlyCreatedMessages.push(meta.args.message.id);

      await meta.pluginData.state.savedMessages.createFromMsg(meta.args.message);
    });
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

    if (meta.args.oldMessage?.partial) {
      return;
    }

    meta.pluginData.state.queue.add(async () => {
      await meta.pluginData.state.savedMessages.saveEditFromMsg(meta.args.newMessage as Message);
    });
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

    meta.pluginData.state.queue.add(async () => {
      await meta.pluginData.state.savedMessages.markAsDeleted(msg.id);
    });
  },
});

export const MessageDeleteBulkEvt = messageSaverEvt({
  event: "messageDeleteBulk",
  allowBots: true,
  allowSelf: true,

  async listener(meta) {
    const ids = meta.args.messages.map(m => m.id);
    meta.pluginData.state.queue.add(async () => {
      await meta.pluginData.state.savedMessages.markBulkAsDeleted(ids);
    });
  },
});
