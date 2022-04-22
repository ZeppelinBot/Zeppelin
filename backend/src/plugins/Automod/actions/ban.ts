import * as t from "io-ts";
import { convertDelayStringToMS, nonNullish, tDelayString, tNullable, unique } from "../../../utils";
import { CaseArgs } from "../../Cases/types";
import { ModActionsPlugin } from "../../ModActions/ModActionsPlugin";
import { resolveActionContactMethods } from "../functions/resolveActionContactMethods";
import { automodAction } from "../helpers";

export const BanAction = automodAction({
  configType: t.type({
    reason: tNullable(t.string),
    duration: tNullable(tDelayString),
    notify: tNullable(t.string),
    notifyChannel: tNullable(t.string),
    deleteMessageDays: tNullable(t.number),
    postInCaseLog: tNullable(t.boolean),
    hide_case: tNullable(t.boolean),
  }),

  defaultConfig: {
    notify: null, // Use defaults from ModActions
    hide_case: false,
  },

  async apply({ pluginData, contexts, actionConfig, matchResult }) {
    const reason = actionConfig.reason || "Kicked automatically";
    const duration = actionConfig.duration ? convertDelayStringToMS(actionConfig.duration)! : undefined;
    const contactMethods = actionConfig.notify ? resolveActionContactMethods(pluginData, actionConfig) : undefined;
    const deleteMessageDays = actionConfig.deleteMessageDays ?? undefined;

    const caseArgs: Partial<CaseArgs> = {
      modId: pluginData.client.user!.id,
      extraNotes: matchResult.fullSummary ? [matchResult.fullSummary] : [],
      automatic: true,
      postInCaseLogOverride: actionConfig.postInCaseLog ?? undefined,
      hide: Boolean(actionConfig.hide_case),
    };

    const userIdsToBan = unique(contexts.map((c) => c.user?.id).filter(nonNullish));

    const modActions = pluginData.getPlugin(ModActionsPlugin);
    for (const userId of userIdsToBan) {
      await modActions.banUserId(
        userId,
        reason,
        {
          contactMethods,
          caseArgs,
          deleteMessageDays,
          isAutomodAction: true,
        },
        duration,
      );
    }
  },
});
