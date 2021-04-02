import * as t from "io-ts";
import { automodAction } from "../helpers";
import { LogType } from "../../../data/LogType";
import { asyncMap, nonNullish, resolveMember, tNullable, unique } from "../../../utils";
import { resolveActionContactMethods } from "../functions/resolveActionContactMethods";
import { ModActionsPlugin } from "../../ModActions/ModActionsPlugin";
import { CaseArgs } from "../../Cases/types";

export const WarnAction = automodAction({
  configType: t.type({
    reason: tNullable(t.string),
    notify: tNullable(t.string),
    notifyChannel: tNullable(t.string),
  }),

  defaultConfig: {
    notify: null, // Use defaults from ModActions
  },

  async apply({ pluginData, contexts, actionConfig, matchResult }) {
    const reason = actionConfig.reason || "Warned automatically";
    const contactMethods = actionConfig.notify ? resolveActionContactMethods(pluginData, actionConfig) : undefined;

    const caseArgs: Partial<CaseArgs> = {
      modId: pluginData.client.user.id,
      extraNotes: matchResult.fullSummary ? [matchResult.fullSummary] : [],
      automatic: true,
    };

    const userIdsToWarn = unique(contexts.map(c => c.user?.id).filter(nonNullish));
    const membersToWarn = await asyncMap(userIdsToWarn, id => resolveMember(pluginData.client, pluginData.guild, id));

    const modActions = pluginData.getPlugin(ModActionsPlugin);
    for (const member of membersToWarn) {
      if (!member) continue;
      await modActions.warnMember(member, reason, { contactMethods, caseArgs });
    }
  },
});
