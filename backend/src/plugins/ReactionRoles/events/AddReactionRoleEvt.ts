import { reactionRolesEvt } from "../types";
import { noop, resolveMember, sleep } from "../../../utils";
import { addMemberPendingRoleChange } from "../util/addMemberPendingRoleChange";
import { DiscordRESTError, Message } from "eris";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { LogType } from "../../../data/LogType";

const CLEAR_ROLES_EMOJI = "❌";

export const AddReactionRoleEvt = reactionRolesEvt({
  event: "messageReactionAdd",

  async listener(meta) {
    const pluginData = meta.pluginData;
    const msg = meta.args.message as Message;
    const emoji = meta.args.emoji;
    const userId = meta.args.member.id;

    if (userId === pluginData.client.user.id) {
      // Don't act on own reactions
      // FIXME: This may not be needed? Knub currently requires the *member* to be found for the user to be resolved as well. Need to look into it more.
      return;
    }

    // Make sure this message has reaction roles on it
    const reactionRoles = await pluginData.state.reactionRoles.getForMessage(msg.id);
    if (reactionRoles.length === 0) return;

    const member = await resolveMember(pluginData.client, pluginData.guild, userId);
    if (!member) return;

    if (emoji.name === CLEAR_ROLES_EMOJI) {
      // User reacted with "clear roles" emoji -> clear their roles
      const reactionRoleRoleIds = reactionRoles.map(rr => rr.role_id);
      for (const roleId of reactionRoleRoleIds) {
        addMemberPendingRoleChange(pluginData, userId, "-", roleId);
      }
    } else {
      // User reacted with a reaction role emoji -> add the role
      const matchingReactionRole = await pluginData.state.reactionRoles.getByMessageAndEmoji(
        msg.id,
        emoji.id || emoji.name,
      );
      if (!matchingReactionRole) return;

      // If the reaction role is exclusive, remove any other roles in the message first
      if (matchingReactionRole.is_exclusive) {
        const messageReactionRoles = await pluginData.state.reactionRoles.getForMessage(msg.id);
        for (const reactionRole of messageReactionRoles) {
          addMemberPendingRoleChange(pluginData, userId, "-", reactionRole.role_id);
        }
      }

      addMemberPendingRoleChange(pluginData, userId, "+", matchingReactionRole.role_id);
    }

    // Remove the reaction after a small delay
    const config = pluginData.config.getForMember(member);
    if (config.remove_user_reactions) {
      setTimeout(() => {
        pluginData.state.reactionRemoveQueue.add(async () => {
          const reaction = emoji.id ? `${emoji.name}:${emoji.id}` : emoji.name;
          const wait = sleep(1500);
          await msg.channel.removeMessageReaction(msg.id, reaction, userId).catch(noop);
          await wait;
        });
      }, 1500);
    }
  },
});
