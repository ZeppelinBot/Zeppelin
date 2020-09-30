import { GuildPluginData } from "knub";
import { ModActionsPluginType, WarnOptions, WarnResult } from "../types";
import { Member } from "eris";
import { getDefaultContactMethods } from "./getDefaultContactMethods";
import { notifyUser, resolveUser, stripObjectToScalars, ucfirst } from "../../../utils";
import { waitForReaction } from "knub/dist/helpers";
import { CasesPlugin } from "../../Cases/CasesPlugin";
import { CaseTypes } from "../../../data/CaseTypes";
import { LogType } from "../../../data/LogType";

export async function warnMember(
  pluginData: GuildPluginData<ModActionsPluginType>,
  member: Member,
  reason: string,
  warnOptions: WarnOptions = {},
): Promise<WarnResult | null> {
  const config = pluginData.config.get();

  const warnMessage = config.warn_message.replace("{guildName}", pluginData.guild.name).replace("{reason}", reason);
  const contactMethods = warnOptions?.contactMethods
    ? warnOptions.contactMethods
    : getDefaultContactMethods(pluginData, "warn");
  const notifyResult = await notifyUser(member.user, warnMessage, contactMethods);

  if (!notifyResult.success) {
    if (warnOptions.retryPromptChannel && pluginData.guild.channels.has(warnOptions.retryPromptChannel.id)) {
      const failedMsg = await warnOptions.retryPromptChannel.createMessage(
        "Failed to message the user. Log the warning anyway?",
      );
      const reply = await waitForReaction(pluginData.client, failedMsg, ["✅", "❌"]);
      failedMsg.delete();
      if (!reply || reply.name === "❌") {
        return {
          status: "failed",
          error: "Failed to message user",
        };
      }
    } else {
      return {
        status: "failed",
        error: "Failed to message user",
      };
    }
  }

  const casesPlugin = pluginData.getPlugin(CasesPlugin);
  const createdCase = await casesPlugin.createCase({
    ...(warnOptions.caseArgs || {}),
    userId: member.id,
    modId: warnOptions.caseArgs?.modId,
    type: CaseTypes.Warn,
    reason,
    noteDetails: notifyResult.text ? [ucfirst(notifyResult.text)] : [],
  });

  const mod = await resolveUser(pluginData.client, warnOptions.caseArgs?.modId);
  pluginData.state.serverLogs.log(LogType.MEMBER_WARN, {
    mod: stripObjectToScalars(mod),
    member: stripObjectToScalars(member, ["user", "roles"]),
    caseNumber: createdCase.case_number,
    reason,
  });

  return {
    status: "success",
    case: createdCase,
    notifyResult,
  };
}
