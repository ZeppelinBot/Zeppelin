import { GuildPluginData } from "knub";
import { CaseTypes } from "../../../data/CaseTypes";
import { LogType } from "../../../data/LogType";
import { CasesPlugin } from "../../../plugins/Cases/CasesPlugin";
import { MutesPlugin } from "../../../plugins/Mutes/MutesPlugin";
import { ERRORS, RecoverablePluginError } from "../../../RecoverablePluginError";
import { convertDelayStringToMS, resolveMember, stripObjectToScalars } from "../../../utils";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { RecentActionType, SpamPluginType } from "../types";
import { addRecentAction } from "./addRecentAction";
import { clearRecentUserActions } from "./clearRecentUserActions";
import { getRecentActionCount } from "./getRecentActionCount";

export async function logAndDetectOtherSpam(
  pluginData: GuildPluginData<SpamPluginType>,
  type: RecentActionType,
  spamConfig: any,
  userId: string,
  actionCount: number,
  actionGroupId: string,
  timestamp: number,
  extraData = null,
  description: string,
) {
  pluginData.state.spamDetectionQueue = pluginData.state.spamDetectionQueue.then(async () => {
    // Log this action...
    addRecentAction(pluginData, type, userId, actionGroupId, extraData, timestamp, actionCount);

    // ...and then check if it trips the spam filters
    const since = timestamp - 1000 * spamConfig.interval;
    const recentActionsCount = getRecentActionCount(pluginData, type, userId, actionGroupId, since);

    if (recentActionsCount > spamConfig.count) {
      const member = await resolveMember(pluginData.client, pluginData.guild, userId);
      const details = `${description} (over ${spamConfig.count} in ${spamConfig.interval}s)`;
      const logs = pluginData.getPlugin(LogsPlugin);

      if (spamConfig.mute && member) {
        const mutesPlugin = pluginData.getPlugin(MutesPlugin);
        const muteTime =
          (spamConfig.mute_time && convertDelayStringToMS(spamConfig.mute_time.toString())) ?? 120 * 1000;

        try {
          await mutesPlugin.muteUser(
            member.id,
            muteTime,
            "Automatic spam detection",
            {
              caseArgs: {
                modId: pluginData.client.user!.id,
                extraNotes: [`Details: ${details}`],
              },
            },
            spamConfig.remove_roles_on_mute,
            spamConfig.restore_roles_on_mute,
          );
        } catch (e) {
          if (e instanceof RecoverablePluginError && e.code === ERRORS.NO_MUTE_ROLE_IN_CONFIG) {
            logs.log(LogType.BOT_ALERT, {
              body: `Failed to mute <@!${member.id}> in \`spam\` plugin because a mute role has not been specified in server config`,
            });
          } else {
            throw e;
          }
        }
      } else {
        // If we're not muting the user, just add a note on them
        const casesPlugin = pluginData.getPlugin(CasesPlugin);
        await casesPlugin.createCase({
          userId,
          modId: pluginData.client.user!.id,
          type: CaseTypes.Note,
          reason: `Automatic spam detection: ${details}`,
        });
      }

      // Clear recent cases
      clearRecentUserActions(pluginData, RecentActionType.VoiceChannelMove, userId, actionGroupId);

      logs.log(LogType.OTHER_SPAM_DETECTED, {
        member: stripObjectToScalars(member, ["user", "roles"]),
        description,
        limit: spamConfig.count,
        interval: spamConfig.interval,
      });
    }
  });
}
