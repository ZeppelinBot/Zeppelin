import { z } from "zod";
import { asyncMap, nonNullish, resolveMember, unique, zBoundedCharacters, zSnowflake } from "../../../utils.js";
import { CaseArgs } from "../../Cases/types.js";
import { ModActionsPlugin } from "../../ModActions/ModActionsPlugin.js";
import { zNotify } from "../constants.js";
import { resolveActionContactMethods } from "../functions/resolveActionContactMethods.js";
import { automodAction } from "../helpers.js";

export const KickAction = automodAction({
  configSchema: z.strictObject({
    reason: zBoundedCharacters(0, 4000).nullable().default(null),
    notify: zNotify.nullable().default(null),
    notifyChannel: zSnowflake.nullable().default(null),
    postInCaseLog: z.boolean().nullable().default(null),
    hide_case: z.boolean().nullable().default(false),
  }),

  async apply({ pluginData, contexts, actionConfig, matchResult }) {
    const reason = actionConfig.reason || "Kicked automatically";
    const contactMethods = actionConfig.notify ? resolveActionContactMethods(pluginData, actionConfig) : undefined;

    const caseArgs: Partial<CaseArgs> = {
      modId: pluginData.client.user!.id,
      extraNotes: matchResult.fullSummary ? [matchResult.fullSummary] : [],
      automatic: true,
      postInCaseLogOverride: actionConfig.postInCaseLog ?? undefined,
      hide: Boolean(actionConfig.hide_case),
    };

    const userIdsToKick = unique(contexts.map((c) => c.user?.id).filter(nonNullish));
    const membersToKick = await asyncMap(userIdsToKick, (id) => resolveMember(pluginData.client, pluginData.guild, id));

    const modActions = pluginData.getPlugin(ModActionsPlugin);
    for (const member of membersToKick) {
      if (!member) continue;
      await modActions.kickMember(member, reason, reason, { contactMethods, caseArgs, isAutomodAction: true });
    }
  },
});
