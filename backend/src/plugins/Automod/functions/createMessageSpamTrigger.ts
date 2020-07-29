import { RecentActionType } from "../constants";
import { automodTrigger } from "../helpers";
import { getBaseUrl } from "../../../pluginUtils";
import { convertDelayStringToMS, sorter, tDelayString, tNullable } from "../../../utils";
import { humanizeDurationShort } from "../../../humanizeDurationShort";
import { findRecentSpam } from "./findRecentSpam";
import { getMatchingMessageRecentActions } from "./getMatchingMessageRecentActions";
import * as t from "io-ts";

const MessageSpamTriggerConfig = t.type({
  amount: t.number,
  within: tDelayString,
  per_channel: tNullable(t.boolean),
});
type TMessageSpamTriggerConfig = t.TypeOf<typeof MessageSpamTriggerConfig>;

interface TMessageSpamMatchResultType {
  archiveId: string;
}

export function createMessageSpamTrigger(spamType: RecentActionType, prettyName: string) {
  return automodTrigger<TMessageSpamMatchResultType>()({
    configType: MessageSpamTriggerConfig,
    defaultConfig: {},

    async match({ pluginData, context, triggerConfig }) {
      if (!context.message) {
        return;
      }

      const recentSpam = findRecentSpam(pluginData, spamType, context.message.user_id);
      if (recentSpam) {
        await pluginData.state.archives.addSavedMessagesToArchive(
          recentSpam.archiveId,
          [context.message],
          pluginData.guild,
        );

        return {
          silentClean: true,
        };
      }

      const within = convertDelayStringToMS(triggerConfig.within);
      const matchedSpam = getMatchingMessageRecentActions(
        pluginData,
        context.message,
        spamType,
        triggerConfig.amount,
        within,
        triggerConfig.per_channel,
      );

      if (matchedSpam) {
        const messages = matchedSpam.recentActions
          .map(action => action.context.message)
          .filter(Boolean)
          .sort(sorter("posted_at"));

        const archiveId = await pluginData.state.archives.createFromSavedMessages(messages, pluginData.guild);

        pluginData.state.recentSpam.push({
          type: spamType,
          userIds: [context.message.user_id],
          archiveId,
          timestamp: Date.now(),
        });

        return {
          extraContexts: matchedSpam.recentActions
            .map(action => action.context)
            .filter(_context => _context !== context),

          extra: {
            archiveId,
          },
        };
      }
    },

    renderMatchInformation({ pluginData, matchResult, triggerConfig }) {
      const baseUrl = getBaseUrl(pluginData);
      const archiveUrl = pluginData.state.archives.getUrl(baseUrl, matchResult.extra.archiveId);
      const withinMs = convertDelayStringToMS(triggerConfig.within);
      const withinStr = humanizeDurationShort(withinMs);

      return `Matched ${prettyName} spam (${triggerConfig.amount} in ${withinStr}): ${archiveUrl}`;
    },
  });
}
