import { z } from "zod";
import { SavedMessage } from "../../../data/entities/SavedMessage.js";
import { humanizeDurationShort } from "../../../humanizeDuration.js";
import { getBaseUrl } from "../../../pluginUtils.js";
import { convertDelayStringToMS, sorter, zDelayString } from "../../../utils.js";
import { RecentActionType } from "../constants.js";
import { automodTrigger } from "../helpers.js";
import { findRecentSpam } from "./findRecentSpam.js";
import { getMatchingMessageRecentActions } from "./getMatchingMessageRecentActions.js";
import { getMessageSpamIdentifier } from "./getSpamIdentifier.js";

export interface TMessageSpamMatchResultType {
  archiveId: string;
}

const configSchema = z.strictObject({
  amount: z.number().int(),
  within: zDelayString,
  per_channel: z.boolean().nullable().default(false),
});

export function createMessageSpamTrigger(spamType: RecentActionType, prettyName: string) {
  return automodTrigger<TMessageSpamMatchResultType>()({
    configSchema,

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
