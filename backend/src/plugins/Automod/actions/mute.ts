import * as t from "io-ts";
import { automodAction } from "../helpers";
import { LogType } from "../../../data/LogType";
import { asyncMap, convertDelayStringToMS, resolveMember, tDelayString, tNullable, unique } from "../../../utils";
import { resolveActionContactMethods } from "../functions/resolveActionContactMethods";
import { ModActionsPlugin } from "../../ModActions/ModActionsPlugin";
import { MutesPlugin } from "../../Mutes/MutesPlugin";

export const MuteAction = automodAction({
  configType: t.type({
    reason: tNullable(t.string),
    duration: tNullable(tDelayString),
    notify: tNullable(t.string),
    notifyChannel: tNullable(t.string),
  }),

  defaultConfig: {
    notify: null, // Use defaults from ModActions
  },

  async apply({ pluginData, contexts, actionConfig, matchResult }) {
    const duration = actionConfig.duration ? convertDelayStringToMS(actionConfig.duration) : null;
    const reason = actionConfig.reason || "Muted automatically";
    const contactMethods = resolveActionContactMethods(pluginData, actionConfig);

    const caseArgs = {
      modId: pluginData.client.user.id,
      extraNotes: [matchResult.fullSummary],
    };

    const userIdsToMute = unique(contexts.map(c => c.user?.id).filter(Boolean));

    const mutes = pluginData.getPlugin(MutesPlugin);
    for (const userId of userIdsToMute) {
      await mutes.muteUser(userId, duration, reason, { contactMethods, caseArgs });
    }
  },
});
