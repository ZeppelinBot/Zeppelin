import { Message } from "discord.js";
import { noop, resolveMember, sleep } from "../../../utils";
import { reactionRolesEvt } from "../types";
import { addMemberPendingRoleChange } from "../util/addMemberPendingRoleChange";

const CLEAR_ROLES_EMOJI = "❌";

export const AddReactionRoleEvt = reactionRolesEvt({
  event: "messageReactionAdd",

  async listener(meta) {
    const pluginData = meta.pluginData;
    const msg = meta.args.reaction.message as Message;
    const emoji = meta.args.reaction.emoji;
    const userId = meta.args.user.id;

    if (userId === pluginData.client.user!.id) {
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
        emoji.id || emoji.name!,
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
    const config = await pluginData.config.getForMember(member);
    if (config.remove_user_reactions) {
      setTimeout(() => {
        pluginData.state.reactionRemoveQueue.add(async () => {
          const wait = sleep(1500);
          await meta.args.reaction.users.remove(userId).catch(noop);
          await wait;
        });
      }, 1500);
    }
  },
});
