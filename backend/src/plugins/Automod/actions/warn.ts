import z from "zod";
import { asyncMap, nonNullish, resolveMember, unique, zBoundedCharacters, zSnowflake } from "../../../utils";
import { CaseArgs } from "../../Cases/types";
import { ModActionsPlugin } from "../../ModActions/ModActionsPlugin";
import { zNotify } from "../constants";
import { resolveActionContactMethods } from "../functions/resolveActionContactMethods";
import { automodAction } from "../helpers";

export const WarnAction = automodAction({
  configSchema: z.strictObject({
    reason: zBoundedCharacters(0, 4000).nullable().default(null),
    notify: zNotify.nullable().default(null),
    notifyChannel: zSnowflake.nullable().default(null),
    postInCaseLog: z.boolean().nullable().default(null),
    hide_case: z.boolean().nullable().default(false),
  }),

  async apply({ pluginData, contexts, actionConfig, matchResult }) {
    const reason = actionConfig.reason || "Warned automatically";
    const contactMethods = actionConfig.notify ? resolveActionContactMethods(pluginData, actionConfig) : undefined;

    const caseArgs: Partial<CaseArgs> = {
      modId: pluginData.client.user!.id,
      extraNotes: matchResult.fullSummary ? [matchResult.fullSummary] : [],
      automatic: true,
      postInCaseLogOverride: actionConfig.postInCaseLog ?? undefined,
      hide: Boolean(actionConfig.hide_case),
    };

    const userIdsToWarn = unique(contexts.map((c) => c.user?.id).filter(nonNullish));
    const membersToWarn = await asyncMap(userIdsToWarn, (id) => resolveMember(pluginData.client, pluginData.guild, id));

    const modActions = pluginData.getPlugin(ModActionsPlugin);
    for (const member of membersToWarn) {
      if (!member) continue;
      await modActions.warnMember(member, reason, { contactMethods, caseArgs, isAutomodAction: true });
    }
  },
});
