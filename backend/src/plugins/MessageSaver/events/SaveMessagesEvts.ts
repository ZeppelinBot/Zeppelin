import { Constants, Message, MessageType, Snowflake } from "discord.js";
import { messageSaverEvt } from "../types";
import { SECONDS } from "../../../utils";
import moment from "moment-timezone";

const recentlyCreatedMessages: Map<Snowflake, [debugId: number, timestamp: number, guildId: string]> = new Map();
const recentlyCreatedMessagesToKeep = 100;

setInterval(() => {
  let toDelete = recentlyCreatedMessages.size - recentlyCreatedMessagesToKeep;
  for (const key of recentlyCreatedMessages.keys()) {
    if (toDelete === 0) {
      break;
    }

    recentlyCreatedMessages.delete(key);

    toDelete--;
  }
}, 60 * SECONDS);

const AFFECTED_MESSAGE_TYPES: MessageType[] = ["DEFAULT", "REPLY", "APPLICATION_COMMAND"];

export const MessageCreateEvt = messageSaverEvt({
  event: "messageCreate",
  allowBots: true,
  allowSelf: true,

  async listener(meta) {
    if (!AFFECTED_MESSAGE_TYPES.includes(meta.args.message.type)) {
      return;
    }

    // Don't save partial messages
    if (meta.args.message.partial) {
      return;
    }

    // Don't save the bot's own messages
    if (meta.args.message.author.id === meta.pluginData.client.user?.id) {
      return;
    }

    // FIXME: Remove debug code
    if (recentlyCreatedMessages.has(meta.args.message.id)) {
      const ourDebugId = meta.pluginData.state.debugId;
      const oldDebugId = recentlyCreatedMessages.get(meta.args.message.id)![0];
      const oldGuildId = recentlyCreatedMessages.get(meta.args.message.id)![2];
      const context = `${ourDebugId} : ${oldDebugId} / ${meta.pluginData.guild.id} : ${oldGuildId} : ${meta.args.message.guildId} / ${meta.args.message.channelId} / ${meta.args.message.id}`;
      const timestamp = moment(recentlyCreatedMessages.get(meta.args.message.id)![1]).format("HH:mm:ss.SSS");
      // tslint:disable-next-line:no-console
      console.warn(`Tried to save duplicate message from messageCreate event: ${context} / saved at: ${timestamp}`);
      return;
    }
    recentlyCreatedMessages.set(meta.args.message.id, [meta.pluginData.state.debugId, Date.now(), meta.pluginData.guild.id]);

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

    if (meta.args.oldMessage?.partial) {
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
