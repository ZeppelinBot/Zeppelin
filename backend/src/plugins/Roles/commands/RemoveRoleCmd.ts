import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage, sendSuccessMessage, canActOn } from "../../../pluginUtils";
import { rolesCmd } from "../types";
import { GuildChannel } from "eris";
import { LogType } from "../../../data/LogType";
import { stripObjectToScalars, verboseUserMention, resolveRoleId } from "../../../utils";

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
      sendErrorMessage(pluginData, msg.channel, "Cannot remove roles from this user: insufficient permissions");
      return;
    }

    const roleId = await resolveRoleId(pluginData.client, pluginData.guild.id, args.role);
    if (!roleId) {
      sendErrorMessage(pluginData, msg.channel, "Invalid role id");
      return;
    }

    const config = await pluginData.config.getForMessage(msg);
    if (!config.assignable_roles.includes(roleId)) {
      sendErrorMessage(pluginData, msg.channel, "You cannot remove that role");
      return;
    }

    // Sanity check: make sure the role is configured properly
    const role = (msg.channel as GuildChannel).guild.roles.get(roleId);
    if (!role) {
      pluginData.state.logs.log(LogType.BOT_ALERT, {
        body: `Unknown role configured for 'roles' plugin: ${roleId}`,
      });
      sendErrorMessage(pluginData, msg.channel, "You cannot remove that role");
      return;
    }

    if (!args.member.roles.includes(roleId)) {
      sendErrorMessage(pluginData, msg.channel, "Member doesn't have that role");
      return;
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
      `Removed role **${role.name}** from ${verboseUserMention(args.member.user)}!`,
    );
  },
});
