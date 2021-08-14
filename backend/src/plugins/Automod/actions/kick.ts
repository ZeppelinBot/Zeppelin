import * as t from "io-ts";
import { asyncMap, nonNullish, resolveMember, tNullable, unique } from "../../../utils";
import { CaseArgs } from "../../Cases/types";
import { ModActionsPlugin } from "../../ModActions/ModActionsPlugin";
import { resolveActionContactMethods } from "../functions/resolveActionContactMethods";
import { automodAction } from "../helpers";

export const KickAction = automodAction({
  configType: t.type({
    reason: tNullable(t.string),
    notify: tNullable(t.string),
    notifyChannel: tNullable(t.string),
    postInCaseLog: tNullable(t.boolean),
    hide_case: tNullable(t.boolean),
  }),

  defaultConfig: {
    notify: null, // Use defaults from ModActions
    hide_case: false,
  },

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

    const userIdsToKick = unique(contexts.map(c => c.user?.id).filter(nonNullish));
    const membersToKick = await asyncMap(userIdsToKick, id => resolveMember(pluginData.client, pluginData.guild, id));

    const modActions = pluginData.getPlugin(ModActionsPlugin);
    for (const member of membersToKick) {
      if (!member) continue;
      await modActions.kickMember(member, reason, { contactMethods, caseArgs, isAutomodAction: true });
    }
  },
});
