import { Attachment, ChatInputCommandInteraction, GuildMember, Message, User } from "discord.js";
import { GuildPluginData } from "vety";
import { humanizeDuration } from "../../../../humanizeDuration.js";
import { UnknownUser, asSingleLine, renderUsername } from "../../../../utils.js";
import { MutesPlugin } from "../../../Mutes/MutesPlugin.js";
import { handleAttachmentLinkDetectionAndGetRestriction } from "../../functions/attachmentLinkReaction.js";
import { formatReasonWithMessageLinkForAttachments } from "../../functions/formatReasonForAttachments.js";
import { ModActionsPluginType } from "../../types.js";

export async function actualUnmuteCmd(
  pluginData: GuildPluginData<ModActionsPluginType>,
  context: Message | ChatInputCommandInteraction,
  user: User | UnknownUser,
  attachments: Array<Attachment>,
  mod: GuildMember,
  ppId?: string,
  time?: number,
  reason?: string | null,
) {
  if (await handleAttachmentLinkDetectionAndGetRestriction(pluginData, context, reason)) {
    return;
  }

  const formattedReason =
    reason || attachments.length > 0
      ? await formatReasonWithMessageLinkForAttachments(pluginData, reason ?? "", context, attachments)
      : undefined;

  const mutesPlugin = pluginData.getPlugin(MutesPlugin);
  const result = await mutesPlugin.unmuteUser(user.id, time, {
    modId: mod.id,
    ppId: ppId ?? undefined,
    reason: formattedReason,
  });

  if (!result) {
    pluginData.state.common.sendErrorMessage(context, "User is not muted!");
    return;
  }

  // Confirm the action to the moderator
  if (time) {
    const timeUntilUnmute = time && humanizeDuration(time);
    pluginData.state.common.sendSuccessMessage(
      context,
      asSingleLine(`
        Unmuting **${renderUsername(user)}**
        in ${timeUntilUnmute} (Case #${result.case.case_number})
      `),
    );
  } else {
    pluginData.state.common.sendSuccessMessage(
      context,
      asSingleLine(`
        Unmuted **${renderUsername(user)}**
        (Case #${result.case.case_number})
      `),
    );
  }
}
