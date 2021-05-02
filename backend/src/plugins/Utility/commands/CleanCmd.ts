import { utilityCmd, UtilityPluginType } from "../types";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { DAYS, getInviteCodesInString, noop, SECONDS, stripObjectToScalars } from "../../../utils";
import { getBaseUrl, sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { Message, TextChannel, User } from "eris";
import moment from "moment-timezone";
import { GuildPluginData } from "knub";
import { SavedMessage } from "../../../data/entities/SavedMessage";
import { LogType } from "../../../data/LogType";
import { allowTimeout } from "../../../RegExpRunner";
import { ModActionsPlugin } from "../../../plugins/ModActions/ModActionsPlugin";

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
  const idsToDelete = savedMessages.map(m => m.id);

  // Make sure the deletions aren't double logged
  idsToDelete.forEach(id => pluginData.state.logs.ignoreLog(LogType.MESSAGE_DELETE, id));
  pluginData.state.logs.ignoreLog(LogType.MESSAGE_DELETE_BULK, idsToDelete[0]);

  // Actually delete the messages
  await pluginData.client.deleteMessages(channel.id, idsToDelete);
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
  bots: ct.switchOption({ shortcut: "b" }),
  "delete-pins": ct.switchOption({ shortcut: "p" }),
  "has-invites": ct.switchOption({ shortcut: "i" }),
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
      update: ct.switchOption({ shortcut: "up" }),

      ...opts,
    },
  ],

  async run({ message: msg, args, pluginData }) {
    if (args.count > MAX_CLEAN_COUNT || args.count <= 0) {
      sendErrorMessage(pluginData, msg.channel, `Clean count must be between 1 and ${MAX_CLEAN_COUNT}`);
      return;
    }

    const targetChannel = args.channel ? pluginData.guild.channels.get(args.channel) : msg.channel;
    if (!targetChannel || !(targetChannel instanceof TextChannel)) {
      sendErrorMessage(pluginData, msg.channel, `Invalid channel specified`);
      return;
    }

    if (targetChannel.id !== msg.channel.id) {
      const configForTargetChannel = pluginData.config.getMatchingConfig({
        userId: msg.author.id,
        member: msg.member,
        channelId: targetChannel.id,
        categoryId: targetChannel.parentID,
      });
      if (configForTargetChannel.can_clean !== true) {
        sendErrorMessage(pluginData, msg.channel, `Missing permissions to use clean on that channel`);
        return;
      }
    }

    const cleaningMessage = msg.channel.createMessage("Cleaning...");

    const messagesToClean: SavedMessage[] = [];
    let beforeId = msg.id;
    const timeCutoff = msg.timestamp - MAX_CLEAN_TIME;
    const upToMsgId = args["to-id"];
    let foundId = false;

    const deletePins = args["delete-pins"] != null ? args["delete-pins"] : false;
    let pins: Message[] = [];
    if (!deletePins) {
      pins = await msg.channel.getPins();
    }

    while (messagesToClean.length < args.count) {
      const potentialMessagesToClean = await pluginData.state.savedMessages.getLatestByChannelBeforeId(
        targetChannel.id,
        beforeId,
        args.count,
      );
      if (potentialMessagesToClean.length === 0) break;

      const filtered: SavedMessage[] = [];
      for (let i = 0; i < potentialMessagesToClean.length; ++i) {
        const message = potentialMessagesToClean[i];
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

      beforeId = potentialMessagesToClean[potentialMessagesToClean.length - 1].id;

      if (
        foundId ||
        moment.utc(potentialMessagesToClean[potentialMessagesToClean.length - 1].posted_at).valueOf() < timeCutoff
      ) {
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
