import { Message, Snowflake } from "discord.js";
import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { ContextResponse, deleteContextResponse } from "../../../pluginUtils.js";
import { ModActionsPlugin } from "../../../plugins/ModActions/ModActionsPlugin.js";
import { SECONDS, noop } from "../../../utils.js";
import { cleanMessages } from "../functions/cleanMessages.js";
import { fetchChannelMessagesToClean } from "../functions/fetchChannelMessagesToClean.js";
import { utilityCmd } from "../types.js";

const CLEAN_COMMAND_DELETE_DELAY = 10 * SECONDS;

const opts = {
  user: ct.userId({ option: true, shortcut: "u" }),
  channel: ct.channelId({ option: true, shortcut: "c" }),
  bots: ct.switchOption({ def: false, shortcut: "b" }),
  "delete-pins": ct.switchOption({ def: false, shortcut: "p" }),
  "has-invites": ct.switchOption({ def: false, shortcut: "i" }),
  match: ct.regex({ option: true, shortcut: "m" }),
  "to-id": ct.anyId({ option: true, shortcut: "id" }),
};

export const CleanCmd = utilityCmd({
  trigger: ["clean", "clear"],
  description: "Remove a number of recent messages",
  usage: "!clean 20",
  permission: "can_clean",

  signature: [
    {
      count: ct.number(),
      update: ct.number({ option: true, shortcut: "up" }),

      ...opts,
    },
    {
      count: ct.number(),
      update: ct.switchOption({ def: false, shortcut: "up" }),

      ...opts,
    },
  ],

  async run({ message: msg, args, pluginData }) {
    const targetChannel = args.channel ? pluginData.guild.channels.cache.get(args.channel as Snowflake) : msg.channel;
    if (!targetChannel?.isTextBased()) {
      void pluginData.state.common.sendErrorMessage(
        msg,
        `Invalid channel specified`,
        undefined,
        args["response-interaction"],
      );
      return;
    }

    if (targetChannel.id !== msg.channel.id) {
      const configForTargetChannel = await pluginData.config.getMatchingConfig({
        userId: msg.author.id,
        member: msg.member,
        channelId: targetChannel.id,
        categoryId: targetChannel.parentId,
      });
      if (configForTargetChannel.can_clean !== true) {
        void pluginData.state.common.sendErrorMessage(
          msg,
          `Missing permissions to use clean on that channel`,
          undefined,
          args["response-interaction"],
        );
        return;
      }
    }

    let cleaningMessage: Message | undefined = undefined;
    if (!args["response-interaction"]) {
      cleaningMessage = await msg.channel.send("Cleaning...");
    }

    const fetchMessagesResult = await fetchChannelMessagesToClean(pluginData, targetChannel, {
      beforeId: msg.id,
      count: args.count,
      authorId: args.user,
      includePins: args["delete-pins"],
      onlyBotMessages: args.bots,
      onlyWithInvites: args["has-invites"],
      upToId: args["to-id"],
      matchContent: args.match,
    });
    if ("error" in fetchMessagesResult) {
      void pluginData.state.common.sendErrorMessage(msg, fetchMessagesResult.error);
      return;
    }

    const { messages: messagesToClean, note } = fetchMessagesResult;

    let responseMsg: ContextResponse | null = null;
    if (messagesToClean.length > 0) {
      const cleanResult = await cleanMessages(pluginData, targetChannel, messagesToClean, msg.author);

      let responseText = `Cleaned ${messagesToClean.length} ${messagesToClean.length === 1 ? "message" : "messages"}`;
      if (note) {
        responseText += ` (${note})`;
      }
      if (targetChannel.id !== msg.channel.id) {
        responseText += ` in <#${targetChannel.id}>: ${cleanResult.archiveUrl}`;
      }

      if (args.update) {
        const modActions = pluginData.getPlugin(ModActionsPlugin);
        const channelId = targetChannel.id !== msg.channel.id ? targetChannel.id : msg.channel.id;
        const updateMessage = `Cleaned ${messagesToClean.length} ${
          messagesToClean.length === 1 ? "message" : "messages"
        } in <#${channelId}>: ${cleanResult.archiveUrl}`;
        if (typeof args.update === "number") {
          modActions.updateCase(msg, args.update, updateMessage);
        } else {
          modActions.updateCase(msg, null, updateMessage);
        }
      }

      responseMsg = await pluginData.state.common.sendSuccessMessage(
        msg,
        responseText,
        undefined,
        args["response-interaction"],
      );
    } else {
      const responseText = `Found no messages to clean${note ? ` (${note})` : ""}!`;
      responseMsg = await pluginData.state.common.sendErrorMessage(
        msg,
        responseText,
        undefined,
        args["response-interaction"],
      );
    }

    cleaningMessage?.delete();

    if (targetChannel.id === msg.channel.id) {
      // Delete the !clean command and the bot response if a different channel wasn't specified
      // (so as not to spam the cleaned channel with the command itself)
      msg.delete().catch(noop);
      setTimeout(() => {
        deleteContextResponse(responseMsg).catch(noop);
        responseMsg?.delete().catch(noop);
      }, CLEAN_COMMAND_DELETE_DELAY);
    }
  },
});
