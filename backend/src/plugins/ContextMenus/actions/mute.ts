import humanizeDuration from "humanize-duration";
import * as t from "io-ts";
import { canActOn } from "src/pluginUtils";
import { LogType } from "../../../data/LogType";
import { ERRORS, RecoverablePluginError } from "../../../RecoverablePluginError";
import { convertDelayStringToMS, tDelayString, tNullable } from "../../../utils";
import { CaseArgs } from "../../Cases/types";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { MutesPlugin } from "../../Mutes/MutesPlugin";
import { contextMenuAction } from "../helpers";
import { resolveActionContactMethods } from "../utils/resolveActionContactMethods";

export const MuteAction = contextMenuAction({
  configType: t.type({
    reason: tNullable(t.string),
    duration: tNullable(tDelayString),
    notify: tNullable(t.string),
    notifyChannel: tNullable(t.string),
    remove_roles_on_mute: tNullable(t.union([t.boolean, t.array(t.string)])),
    restore_roles_on_mute: tNullable(t.union([t.boolean, t.array(t.string)])),
    postInCaseLog: tNullable(t.boolean),
    hide_case: tNullable(t.boolean),
  }),

  defaultConfig: {
    notify: null, // Use defaults from ModActions
    hide_case: false,
  },

  async apply({ pluginData, actionConfig, actionName, interaction }) {
    const duration = actionConfig.duration ? convertDelayStringToMS(actionConfig.duration)! : undefined;
    const reason = actionConfig.reason || "Context Menu Action";
    const contactMethods = actionConfig.notify ? resolveActionContactMethods(pluginData, actionConfig) : undefined;
    const rolesToRemove = actionConfig.remove_roles_on_mute;
    const rolesToRestore = actionConfig.restore_roles_on_mute;

    const caseArgs: Partial<CaseArgs> = {
      modId: pluginData.client.user!.id,
      automatic: true,
      postInCaseLogOverride: actionConfig.postInCaseLog ?? undefined,
      hide: Boolean(actionConfig.hide_case),
    };

    interaction.deferReply({ ephemeral: true });
    const mutes = pluginData.getPlugin(MutesPlugin);
    const userId = interaction.targetId;
    const targetMember = await pluginData.guild.members.fetch(interaction.targetId);
    const executingMember = await pluginData.guild.members.fetch(interaction.user.id);

    if (!canActOn(pluginData, executingMember, targetMember)) {
      interaction.followUp({ ephemeral: true, content: "Cannot mute: insufficient permissions" });
      return;
    }

    try {
      const result = await mutes.muteUser(
        userId,
        duration,
        reason,
        { contactMethods, caseArgs, isAutomodAction: true },
        rolesToRemove,
        rolesToRestore,
      );

      const muteMessage = `Muted **${result.case.user_name}** ${
        duration ? `for ${humanizeDuration(duration)}` : "indefinitely"
      } (Case #${result.case.case_number}) (user notified via ${result.notifyResult.method ??
        "dm"})\nPlease update the new case with the \`update\` command`;

      interaction.followUp({ ephemeral: true, content: muteMessage });
    } catch (e) {
      interaction.followUp({ ephemeral: true, content: "Plugin error, please check your BOT_ALERTs" });

      if (e instanceof RecoverablePluginError && e.code === ERRORS.NO_MUTE_ROLE_IN_CONFIG) {
        pluginData.getPlugin(LogsPlugin).log(LogType.BOT_ALERT, {
          body: `Failed to mute <@!${userId}> in ContextMenu action \`${actionName}\` because a mute role has not been specified in server config`,
        });
      } else {
        throw e;
      }
    }
  },
});
