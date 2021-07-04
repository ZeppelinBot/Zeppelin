import { Message, Snowflake, TextChannel, User } from "discord.js";
import { GuildPluginData } from "knub";
import moment from "moment-timezone";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { SavedMessage } from "../../../data/entities/SavedMessage";
import { LogType } from "../../../data/LogType";
import { ModActionsPlugin } from "../../../plugins/ModActions/ModActionsPlugin";
import { getBaseUrl, sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { allowTimeout } from "../../../RegExpRunner";
import { DAYS, getInviteCodesInString, noop, SECONDS, stripObjectToScalars } from "../../../utils";
import { utilityCmd, UtilityPluginType } from "../types";

const MAX_CLEAN_COUNT = 150;
const MAX_CLEAN_TIME = 1 * DAYS;
const CLEAN_COMMAND_DELETE_DELAY = 5 * SECONDS;

async function cleanMessages(
  pluginData: GuildPluginData<UtilityPluginType>,
  channel: TextChannel,
  savedMessages: SavedMessage[],
  mod: User,
) {
  pluginData.state.logs.ignoreLog(LogType.MESSAGE_DELETE, savedMessages[0].id);
  pluginData.state.logs.ignoreLog(LogType.MESSAGE_DELETE_BULK, savedMessages[0].id);

  // Delete & archive in ID order
  savedMessages = Array.from(savedMessages).sort((a, b) => (a.id > b.id ? 1 : -1));
  const idsToDelete = savedMessages.map(m => m.id) as Snowflake[];

  // Make sure the deletions aren't double logged
  idsToDelete.forEach(id => pluginData.state.logs.ignoreLog(LogType.MESSAGE_DELETE, id));
  pluginData.state.logs.ignoreLog(LogType.MESSAGE_DELETE_BULK, idsToDelete[0]);

  // Actually delete the messages
  channel.bulkDelete(idsToDelete);
  await pluginData.state.savedMessages.markBulkAsDeleted(idsToDelete);

  // Create an archive
  const archiveId = await pluginData.state.archives.createFromSavedMessages(savedMessages, pluginData.guild);
  const baseUrl = getBaseUrl(pluginData);
  const archiveUrl = pluginData.state.archives.getUrl(baseUrl, archiveId);

  pluginData.state.logs.log(LogType.CLEAN, {
    mod: stripObjectToScalars(mod),
    channel: stripObjectToScalars(channel),
    count: savedMessages.length,
    archiveUrl,
  });

  return { archiveUrl };
}

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
    if (args.count > MAX_CLEAN_COUNT || args.count <= 0) {
      sendErrorMessage(pluginData, msg.channel, `Clean count must be between 1 and ${MAX_CLEAN_COUNT}`);
      return;
    }

    const targetChannel = args.channel ? pluginData.guild.channels.cache.get(args.channel as Snowflake) : msg.channel;
    if (!targetChannel || !(targetChannel instanceof TextChannel)) {
      sendErrorMessage(pluginData, msg.channel, `Invalid channel specified`);
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
        sendErrorMessage(pluginData, msg.channel, `Missing permissions to use clean on that channel`);
        return;
      }
    }

    const cleaningMessage = msg.channel.send("Cleaning...");

    const messagesToClean: SavedMessage[] = [];
    let beforeId = msg.id;
    const timeCutoff = msg.createdTimestamp - MAX_CLEAN_TIME;
    const upToMsgId = args["to-id"];
    let foundId = false;

    const deletePins = args["delete-pins"] != null ? args["delete-pins"] : false;
    let pins: Message[] = [];
    if (!deletePins) {
      pins = (await msg.channel.messages.fetchPinned()).array();
    }

    while (messagesToClean.length < args.count) {
      const potentialMessages = await targetChannel.messages.fetch({
        before: beforeId,
        limit: args.count,
      });
      if (potentialMessages.size === 0) break;

      const existingStored = await pluginData.state.savedMessages.getMultiple(potentialMessages.keyArray());
      const alreadyStored = existingStored.map(stored => stored.id);
      const messagesToStore = potentialMessages
        .array()
        .filter(potentialMsg => !alreadyStored.includes(potentialMsg.id));
      await pluginData.state.savedMessages.createFromMessages(messagesToStore);

      const potentialMessagesToClean = await pluginData.state.savedMessages.getMultiple(potentialMessages.keyArray());
      if (potentialMessagesToClean.length === 0) break;

      const filtered: SavedMessage[] = [];
      for (const message of potentialMessagesToClean) {
        const contentString = message.data.content || "";
        if (args.user && message.user_id !== args.user) continue;
        if (args.bots && !message.is_bot) continue;
        if (!deletePins && pins.find(x => x.id === message.id) != null) continue;
        if (args["has-invites"] && getInviteCodesInString(contentString).length === 0) continue;
        if (upToMsgId != null && message.id < upToMsgId) {
          foundId = true;
          break;
        }
        if (moment.utc(message.posted_at).valueOf() < timeCutoff) continue;
        if (args.match && !(await pluginData.state.regexRunner.exec(args.match, contentString).catch(allowTimeout))) {
          continue;
        }

        filtered.push(message);
      }
      const remaining = args.count - messagesToClean.length;
      const withoutOverflow = filtered.slice(0, remaining);
      messagesToClean.push(...withoutOverflow);

      beforeId = potentialMessages.lastKey()!;

      if (foundId || moment.utc(potentialMessages.last()!.createdTimestamp).valueOf() < timeCutoff) {
        break;
      }
    }

    let responseMsg: Message | undefined;
    if (messagesToClean.length > 0) {
      const cleanResult = await cleanMessages(pluginData, targetChannel, messagesToClean, msg.author);

      let responseText = `Cleaned ${messagesToClean.length} ${messagesToClean.length === 1 ? "message" : "messages"}`;
      if (targetChannel.id !== msg.channel.id) {
        responseText += ` in <#${targetChannel.id}>\n${cleanResult.archiveUrl}`;
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

      responseMsg = await sendSuccessMessage(pluginData, msg.channel, responseText);
    } else {
      responseMsg = await sendErrorMessage(pluginData, msg.channel, `Found no messages to clean!`);
    }

    await (await cleaningMessage).delete();

    if (targetChannel.id === msg.channel.id) {
      // Delete the !clean command and the bot response if a different channel wasn't specified
      // (so as not to spam the cleaned channel with the command itself)
      setTimeout(() => {
        msg.delete().catch(noop);
        responseMsg?.delete().catch(noop);
      }, CLEAN_COMMAND_DELETE_DELAY);
    }
  },
});
