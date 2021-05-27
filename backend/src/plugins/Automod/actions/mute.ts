import * as t from "io-ts";
import { automodAction } from "../helpers";
import { LogType } from "../../../data/LogType";
import {
  asyncMap,
  convertDelayStringToMS,
  nonNullish,
  resolveMember,
  tDelayString,
  tNullable,
  unique,
} from "../../../utils";
import { resolveActionContactMethods } from "../functions/resolveActionContactMethods";
import { ModActionsPlugin } from "../../ModActions/ModActionsPlugin";
import { MutesPlugin } from "../../Mutes/MutesPlugin";
import { ERRORS, RecoverablePluginError } from "../../../RecoverablePluginError";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { CaseArgs } from "../../Cases/types";

export const MuteAction = automodAction({
  configType: t.type({
    reason: tNullable(t.string),
    duration: tNullable(tDelayString),
    notify: tNullable(t.string),
    notifyChannel: tNullable(t.string),
    remove_roles_on_mute: tNullable(t.union([t.boolean, t.array(t.string)])),
    restore_roles_on_unmute: tNullable(t.union([t.boolean, t.array(t.string)])),
    postInCaseLog: tNullable(t.boolean),
    hide_case: tNullable(t.boolean),
  }),

  defaultConfig: {
    notify: null, // Use defaults from ModActions
    hide_case: false,
  },

  async apply({ pluginData, contexts, actionConfig, ruleName, matchResult }) {
    const duration = actionConfig.duration ? convertDelayStringToMS(actionConfig.duration)! : undefined;
    const reason = actionConfig.reason || "Muted automatically";
    const contactMethods = actionConfig.notify ? resolveActionContactMethods(pluginData, actionConfig) : undefined;
    const rolesToRemove = actionConfig.remove_roles_on_mute;
    const rolesToRestore = actionConfig.restore_roles_on_unmute;

    const caseArgs: Partial<CaseArgs> = {
      modId: pluginData.client.user.id,
      extraNotes: matchResult.fullSummary ? [matchResult.fullSummary] : [],
      automatic: true,
      postInCaseLogOverride: actionConfig.postInCaseLog ?? undefined,
      hide: Boolean(actionConfig.hide_case),
    };

    const userIdsToMute = unique(contexts.map(c => c.user?.id).filter(nonNullish));

    const mutes = pluginData.getPlugin(MutesPlugin);
    for (const userId of userIdsToMute) {
      try {
        await mutes.muteUser(
          userId,
          duration,
          reason,
          { contactMethods, caseArgs, isAutomodAction: true },
          rolesToRemove,
          rolesToRestore,
        );
      } catch (e) {
        if (e instanceof RecoverablePluginError && e.code === ERRORS.NO_MUTE_ROLE_IN_CONFIG) {
          pluginData.getPlugin(LogsPlugin).log(LogType.BOT_ALERT, {
            body: `Failed to mute <@!${userId}> in Automod rule \`${ruleName}\` because a mute role has not been specified in server config`,
          });
        } else {
          throw e;
        }
      }
    }
  },
});
