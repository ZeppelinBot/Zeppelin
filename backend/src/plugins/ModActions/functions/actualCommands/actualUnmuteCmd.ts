import { Attachment, ChatInputCommandInteraction, GuildMember, TextBasedChannel, User } from "discord.js";
import humanizeDuration from "humanize-duration";
import { GuildPluginData } from "knub";
import { sendErrorMessage, sendSuccessMessage } from "../../../../pluginUtils";
import { UnknownUser, asSingleLine, renderUserUsername } from "../../../../utils";
import { MutesPlugin } from "../../../Mutes/MutesPlugin";
import { ModActionsPluginType } from "../../types";
import { formatReasonWithAttachments } from "../formatReasonWithAttachments";

export async function actualUnmuteCmd(
  pluginData: GuildPluginData<ModActionsPluginType>,
  context: TextBasedChannel | ChatInputCommandInteraction,
  user: User | UnknownUser,
  attachments: Array<Attachment>,
  mod: GuildMember,
  ppId?: string,
  time?: number,
  reason?: string,
) {
  const parsedReason = reason ? formatReasonWithAttachments(reason, attachments) : undefined;

  const mutesPlugin = pluginData.getPlugin(MutesPlugin);
  const result = await mutesPlugin.unmuteUser(user.id, time, {
    modId: mod.id,
    ppId: ppId ?? undefined,
    reason: parsedReason,
  });

  if (!result) {
    sendErrorMessage(pluginData, context, "User is not muted!");
    return;
  }

  // Confirm the action to the moderator
  if (time) {
    const timeUntilUnmute = time && humanizeDuration(time);
    sendSuccessMessage(
      pluginData,
      context,
      asSingleLine(`
        Unmuting **${renderUserUsername(user)}**
        in ${timeUntilUnmute} (Case #${result.case.case_number})
      `),
    );
  } else {
    sendSuccessMessage(
      pluginData,
      context,
      asSingleLine(`
        Unmuted **${renderUserUsername(user)}**
        (Case #${result.case.case_number})
      `),
    );
  }
}
