import { RecentActionType } from "../constants";
import { automodTrigger } from "../helpers";
import { getBaseUrl } from "../../../pluginUtils";
import { convertDelayStringToMS, sorter, tDelayString, tNullable } from "../../../utils";
import { humanizeDurationShort } from "../../../humanizeDurationShort";
import { findRecentSpam } from "./findRecentSpam";
import { getMatchingMessageRecentActions } from "./getMatchingMessageRecentActions";
import * as t from "io-ts";
import { getMessageSpamIdentifier } from "./getSpamIdentifier";
import { SavedMessage } from "../../../data/entities/SavedMessage";

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

      const spamIdentifier = getMessageSpamIdentifier(context.message, Boolean(triggerConfig.per_channel));

      const recentSpam = findRecentSpam(pluginData, spamType, spamIdentifier);
      if (recentSpam) {
        if (recentSpam.archiveId) {
          await pluginData.state.archives.addSavedMessagesToArchive(
            recentSpam.archiveId,
            [context.message],
            pluginData.guild,
          );
        }

        return {
          silentClean: true,
          extra: { archiveId: "" }, // FIXME: Fix up automod trigger match() typings so extra is not required when doing a silentClean
        };
      }

      const within = convertDelayStringToMS(triggerConfig.within) ?? 0;
      const matchedSpam = getMatchingMessageRecentActions(
        pluginData,
        context.message,
        spamType,
        spamIdentifier,
        triggerConfig.amount,
        within,
      );

      if (matchedSpam) {
        const messages = matchedSpam.recentActions
          .map((action) => action.context.message)
          .filter(Boolean)
          .sort(sorter("posted_at")) as SavedMessage[];

        const archiveId = await pluginData.state.archives.createFromSavedMessages(messages, pluginData.guild);

        pluginData.state.recentSpam.push({
          type: spamType,
          identifiers: [spamIdentifier],
          archiveId,
          timestamp: Date.now(),
        });

        return {
          extraContexts: matchedSpam.recentActions
            .map((action) => action.context)
            .filter((_context) => _context !== context),

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
