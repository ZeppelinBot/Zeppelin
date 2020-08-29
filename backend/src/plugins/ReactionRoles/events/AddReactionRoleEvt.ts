import { reactionRolesEvent } from "../types";
import { resolveMember, noop, sleep } from "src/utils";
import { addMemberPendingRoleChange } from "../util/addMemberPendingRoleChange";
import { Message } from "eris";

const CLEAR_ROLES_EMOJI = "❌";

export const AddReactionRoleEvt = reactionRolesEvent({
  event: "messageReactionAdd",

  async listener(meta) {
    const pluginData = meta.pluginData;
    const msg = meta.args.message as Message;
    const emoji = meta.args.emoji;
    const userId = meta.args.userID;

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

      pluginData.state.reactionRemoveQueue.add(async () => {
        await msg.channel.removeMessageReaction(msg.id, CLEAR_ROLES_EMOJI, userId);
      });
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
