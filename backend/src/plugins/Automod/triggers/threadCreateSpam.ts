import z from "zod";
import { convertDelayStringToMS, zDelayString } from "../../../utils";
import { RecentActionType } from "../constants";
import { findRecentSpam } from "../functions/findRecentSpam";
import { getMatchingRecentActions } from "../functions/getMatchingRecentActions";
import { sumRecentActionCounts } from "../functions/sumRecentActionCounts";
import { automodTrigger } from "../helpers";

const configSchema = z.strictObject({
  amount: z.number().int(),
  within: zDelayString,
});

export const ThreadCreateSpamTrigger = automodTrigger<unknown>()({
  configSchema,

  async match({ pluginData, context, triggerConfig }) {
    if (!context.threadChange?.created) {
      return;
    }

    const recentSpam = findRecentSpam(pluginData, RecentActionType.ThreadCreate);
    if (recentSpam) {
      context.actioned = true;
      return {};
    }

    const since = Date.now() - convertDelayStringToMS(triggerConfig.within)!;
    const matchingActions = getMatchingRecentActions(pluginData, RecentActionType.ThreadCreate, null, since);
    const totalCount = sumRecentActionCounts(matchingActions);

    if (totalCount >= triggerConfig.amount) {
      const extraContexts = matchingActions.map((a) => a.context).filter((c) => c !== context);

      pluginData.state.recentSpam.push({
        type: RecentActionType.ThreadCreate,
        timestamp: Date.now(),
        archiveId: null,
        identifiers: [],
      });

      return {
        extraContexts,
      };
    }
  },

  renderMatchInformation() {
    return "";
  },
});
