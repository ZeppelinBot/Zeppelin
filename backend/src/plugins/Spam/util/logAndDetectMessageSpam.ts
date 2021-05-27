import { SavedMessage } from "../../../data/entities/SavedMessage";
import { RecentActionType, SpamPluginType, TBaseSingleSpamConfig } from "../types";
import moment from "moment-timezone";
import { MuteResult } from "../../../plugins/Mutes/types";
import {
  convertDelayStringToMS,
  DBDateFormat,
  noop,
  resolveMember,
  stripObjectToScalars,
  trimLines,
} from "../../../utils";
import { LogType } from "../../../data/LogType";
import { CaseTypes } from "../../../data/CaseTypes";
import { logger } from "../../../logger";
import { GuildPluginData } from "knub";
import { MutesPlugin } from "../../../plugins/Mutes/MutesPlugin";
import { CasesPlugin } from "../../../plugins/Cases/CasesPlugin";
import { addRecentAction } from "./addRecentAction";
import { getRecentActionCount } from "./getRecentActionCount";
import { getRecentActions } from "./getRecentActions";
import { clearRecentUserActions } from "./clearRecentUserActions";
import { saveSpamArchives } from "./saveSpamArchives";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { ERRORS, RecoverablePluginError } from "../../../RecoverablePluginError";

export async function logAndDetectMessageSpam(
  pluginData: GuildPluginData<SpamPluginType>,
  savedMessage: SavedMessage,
  type: RecentActionType,
  spamConfig: TBaseSingleSpamConfig,
  actionCount: number,
  description: string,
) {
  if (actionCount === 0) return;

  // Make sure we're not handling some messages twice
  if (pluginData.state.lastHandledMsgIds.has(savedMessage.user_id)) {
    const channelMap = pluginData.state.lastHandledMsgIds.get(savedMessage.user_id)!;
    if (channelMap.has(savedMessage.channel_id)) {
      const lastHandledMsgId = channelMap.get(savedMessage.channel_id)!;
      if (lastHandledMsgId >= savedMessage.id) return;
    }
  }

  pluginData.state.spamDetectionQueue = pluginData.state.spamDetectionQueue.then(
    async () => {
      const timestamp = moment.utc(savedMessage.posted_at, DBDateFormat).valueOf();
      const member = await resolveMember(pluginData.client, pluginData.guild, savedMessage.user_id);
      const logs = pluginData.getPlugin(LogsPlugin);

      // Log this action...
      addRecentAction(
        pluginData,
        type,
        savedMessage.user_id,
        savedMessage.channel_id,
        savedMessage,
        timestamp,
        actionCount,
      );

      // ...and then check if it trips the spam filters
      const since = timestamp - 1000 * spamConfig.interval;
      const recentActionsCount = getRecentActionCount(
        pluginData,
        type,
        savedMessage.user_id,
        savedMessage.channel_id,
        since,
      );

      // If the user tripped the spam filter...
      if (recentActionsCount > spamConfig.count) {
        const recentActions = getRecentActions(pluginData, type, savedMessage.user_id, savedMessage.channel_id, since);

        // Start by muting them, if enabled
        let muteResult: MuteResult | null = null;
        if (spamConfig.mute && member) {
          const mutesPlugin = pluginData.getPlugin(MutesPlugin);
          const muteTime =
            (spamConfig.mute_time && convertDelayStringToMS(spamConfig.mute_time.toString())) ?? 120 * 1000;

          try {
            muteResult = await mutesPlugin.muteUser(
              member.id,
              muteTime,
              "Automatic spam detection",
              {
                caseArgs: {
                  modId: pluginData.client.user.id,
                  postInCaseLogOverride: false,
                },
              },
              spamConfig.remove_roles_on_mute,
              spamConfig.restore_roles_on_unmute,
            );
          } catch (e) {
            if (e instanceof RecoverablePluginError && e.code === ERRORS.NO_MUTE_ROLE_IN_CONFIG) {
              logs.log(LogType.BOT_ALERT, {
                body: `Failed to mute <@!${member.id}> in \`spam\` plugin because a mute role has not been specified in server config`,
              });
            } else {
              throw e;
            }
          }
        }

        // Get the offending message IDs
        // We also get the IDs of any messages after the last offending message, to account for lag before detection
        const savedMessages = recentActions.map(a => a.extraData as SavedMessage);
        const msgIds = savedMessages.map(m => m.id);
        const lastDetectedMsgId = msgIds[msgIds.length - 1];

        const additionalMessages = await pluginData.state.savedMessages.getUserMessagesByChannelAfterId(
          savedMessage.user_id,
          savedMessage.channel_id,
          lastDetectedMsgId,
        );
        additionalMessages.forEach(m => msgIds.push(m.id));

        // Then, if enabled, remove the spam messages
        if (spamConfig.clean !== false) {
          msgIds.forEach(id => pluginData.state.logs.ignoreLog(LogType.MESSAGE_DELETE, id));
          pluginData.client.deleteMessages(savedMessage.channel_id, msgIds).catch(noop);
        }

        // Store the ID of the last handled message
        const uniqueMessages = Array.from(new Set([...savedMessages, ...additionalMessages]));
        uniqueMessages.sort((a, b) => (a.id > b.id ? 1 : -1));
        const lastHandledMsgId = uniqueMessages
          .map(m => m.id)
          .reduce((last, id): string => {
            return id > last ? id : last;
          });

        if (!pluginData.state.lastHandledMsgIds.has(savedMessage.user_id)) {
          pluginData.state.lastHandledMsgIds.set(savedMessage.user_id, new Map());
        }

        const channelMap = pluginData.state.lastHandledMsgIds.get(savedMessage.user_id)!;
        channelMap.set(savedMessage.channel_id, lastHandledMsgId);

        // Clear the handled actions from recentActions
        clearRecentUserActions(pluginData, type, savedMessage.user_id, savedMessage.channel_id);

        // Generate a log from the detected messages
        const channel = pluginData.guild.channels.get(savedMessage.channel_id);
        const archiveUrl = await saveSpamArchives(pluginData, uniqueMessages);

        // Create a case
        const casesPlugin = pluginData.getPlugin(CasesPlugin);
        if (muteResult) {
          // If the user was muted, the mute already generated a case - in that case, just update the case with extra details
          // This will also post the case in the case log channel, which we didn't do with the mute initially to avoid
          // posting the case on the channel twice: once with the initial reason, and then again with the note from here
          const updateText = trimLines(`
              Details: ${description} (over ${spamConfig.count} in ${spamConfig.interval}s)
              ${archiveUrl}
            `);
          casesPlugin.createCaseNote({
            caseId: muteResult.case.id,
            modId: muteResult.case.mod_id || "0",
            body: updateText,
            automatic: true,
          });
        } else {
          // If the user was not muted, create a note case of the detected spam instead
          const caseText = trimLines(`
              Automatic spam detection: ${description} (over ${spamConfig.count} in ${spamConfig.interval}s)
              ${archiveUrl}
            `);

          casesPlugin.createCase({
            userId: savedMessage.user_id,
            modId: pluginData.client.user.id,
            type: CaseTypes.Note,
            reason: caseText,
            automatic: true,
          });
        }

        // Create a log entry
        logs.log(LogType.MESSAGE_SPAM_DETECTED, {
          member: stripObjectToScalars(member, ["user", "roles"]),
          channel: stripObjectToScalars(channel),
          description,
          limit: spamConfig.count,
          interval: spamConfig.interval,
          archiveUrl,
        });
      }
    },
    err => {
      logger.error(`Error while detecting spam:\n${err}`);
    },
  );
}
