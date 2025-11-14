import { z } from "zod";
import { ERRORS, RecoverablePluginError } from "../../../RecoverablePluginError.js";
import {
  convertDelayStringToMS,
  nonNullish,
  unique,
  zBoundedCharacters,
  zDelayString,
  zSnowflake,
} from "../../../utils.js";
import { CaseArgs } from "../../Cases/types.js";
import { LogsPlugin } from "../../Logs/LogsPlugin.js";
import { MutesPlugin } from "../../Mutes/MutesPlugin.js";
import { zNotify } from "../constants.js";
import { resolveActionContactMethods } from "../functions/resolveActionContactMethods.js";
import { automodAction } from "../helpers.js";

export const MuteAction = automodAction({
  configSchema: z.strictObject({
    reason: zBoundedCharacters(0, 4000).nullable().default(null),
    duration: zDelayString.nullable().default(null),
    notify: zNotify.nullable().default(null),
    notifyChannel: zSnowflake.nullable().default(null),
    remove_roles_on_mute: z
      .union([z.boolean(), z.array(zSnowflake)])
      .nullable()
      .default(null),
    restore_roles_on_mute: z
      .union([z.boolean(), z.array(zSnowflake)])
      .nullable()
      .default(null),
    postInCaseLog: z.boolean().nullable().default(null),
    hide_case: z.boolean().nullable().default(false),
  }),

  async apply({ pluginData, contexts, actionConfig, ruleName, matchResult }) {
    const duration = actionConfig.duration ? convertDelayStringToMS(actionConfig.duration)! : undefined;
    const reason = actionConfig.reason || "Muted automatically";
    const contactMethods = actionConfig.notify ? resolveActionContactMethods(pluginData, actionConfig) : undefined;
    const rolesToRemove = actionConfig.remove_roles_on_mute;
    const rolesToRestore = actionConfig.restore_roles_on_mute;

    const caseArgs: Partial<CaseArgs> = {
      modId: pluginData.client.user!.id,
      extraNotes: matchResult.fullSummary ? [matchResult.fullSummary] : [],
      automatic: true,
      postInCaseLogOverride: actionConfig.postInCaseLog ?? undefined,
      hide: Boolean(actionConfig.hide_case),
    };

    const userIdsToMute = unique(contexts.map((c) => c.user?.id).filter(nonNullish));

    const mutes = pluginData.getPlugin(MutesPlugin);
    for (const userId of userIdsToMute) {
      try {
        await mutes.muteUser(
          userId,
          duration,
          reason,
          reason,
          { contactMethods, caseArgs, isAutomodAction: true },
          rolesToRemove,
          rolesToRestore,
        );
      } catch (e) {
        if (e instanceof RecoverablePluginError && e.code === ERRORS.NO_MUTE_ROLE_IN_CONFIG) {
          pluginData.getPlugin(LogsPlugin).logBotAlert({
            body: `Failed to mute <@!${userId}> in Automod rule \`${ruleName}\` because a mute role has not been specified in server config`,
          });
        } else {
          throw e;
        }
      }
    }
  },
});
