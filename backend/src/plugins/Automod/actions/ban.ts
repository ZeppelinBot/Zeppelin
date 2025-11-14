import { z } from "zod";
import {
  convertDelayStringToMS,
  nonNullish,
  unique,
  zBoundedCharacters,
  zDelayString,
  zSnowflake,
} from "../../../utils.js";
import { CaseArgs } from "../../Cases/types.js";
import { ModActionsPlugin } from "../../ModActions/ModActionsPlugin.js";
import { zNotify } from "../constants.js";
import { resolveActionContactMethods } from "../functions/resolveActionContactMethods.js";
import { automodAction } from "../helpers.js";

const configSchema = z.strictObject({
  reason: zBoundedCharacters(0, 4000).nullable().default(null),
  duration: zDelayString.nullable().default(null),
  notify: zNotify.nullable().default(null),
  notifyChannel: zSnowflake.nullable().default(null),
  deleteMessageDays: z.number().nullable().default(null),
  postInCaseLog: z.boolean().nullable().default(null),
  hide_case: z.boolean().nullable().default(false),
});

export const BanAction = automodAction({
  configSchema,

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
