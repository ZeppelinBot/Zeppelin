import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage, sendSuccessMessage, canActOn } from "src/pluginUtils";
import { rolesCmd } from "../types";
import { GuildChannel } from "eris";
import { LogType } from "src/data/LogType";
import { stripObjectToScalars, verboseUserMention, resolveRoleId } from "src/utils";

export const RemoveRoleCmd = rolesCmd({
  trigger: "removerole",
  permission: "can_assign",
  description: "Remove a role from the specified member",

  signature: {
    member: ct.resolvedMember(),
    role: ct.string({ catchAll: true }),
  },

  async run({ message: msg, args, pluginData }) {
    if (!canActOn(pluginData, msg.member, args.member, true)) {
      return sendErrorMessage(pluginData, msg.channel, "Cannot remove roles from this user: insufficient permissions");
    }

    const roleId = await resolveRoleId(pluginData.client, pluginData.guild.id, args.role);
    if (!roleId) {
      return sendErrorMessage(pluginData, msg.channel, "Invalid role id");
    }

    const config = pluginData.config.getForMessage(msg);
    if (!config.assignable_roles.includes(roleId)) {
      return sendErrorMessage(pluginData, msg.channel, "You cannot remove that role");
    }

    // Sanity check: make sure the role is configured properly
    const role = (msg.channel as GuildChannel).guild.roles.get(roleId);
    if (!role) {
      pluginData.state.logs.log(LogType.BOT_ALERT, {
        body: `Unknown role configured for 'roles' plugin: ${roleId}`,
      });
      return sendErrorMessage(pluginData, msg.channel, "You cannot remove that role");
    }

    if (!args.member.roles.includes(roleId)) {
      return sendErrorMessage(pluginData, msg.channel, "Member doesn't have that role");
    }

    pluginData.state.logs.ignoreLog(LogType.MEMBER_ROLE_REMOVE, args.member.id);

    await args.member.removeRole(roleId);

    pluginData.state.logs.log(LogType.MEMBER_ROLE_REMOVE, {
      member: stripObjectToScalars(args.member, ["user", "roles"]),
      roles: role.name,
      mod: stripObjectToScalars(msg.author),
    });

    sendSuccessMessage(
      pluginData,
      msg.channel,
      `Removed role **${role.name}** removed from ${verboseUserMention(args.member.user)}!`,
    );
  },
});
