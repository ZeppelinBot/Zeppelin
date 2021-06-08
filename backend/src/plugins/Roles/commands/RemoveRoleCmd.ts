import { GuildChannel } from "discord.js";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { LogType } from "../../../data/LogType";
import { canActOn, sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { resolveRoleId, stripObjectToScalars, verboseUserMention } from "../../../utils";
import { rolesCmd } from "../types";

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
    const role = (msg.channel as GuildChannel).guild.roles.cache.get(roleId);
    if (!role) {
      pluginData.state.logs.log(LogType.BOT_ALERT, {
        body: `Unknown role configured for 'roles' plugin: ${roleId}`,
      });
      sendErrorMessage(pluginData, msg.channel, "You cannot remove that role");
      return;
    }

    if (!args.member.roles.cache.has(roleId)) {
      sendErrorMessage(pluginData, msg.channel, "Member doesn't have that role");
      return;
    }

    pluginData.state.logs.ignoreLog(LogType.MEMBER_ROLE_REMOVE, args.member.id);

    await args.member.roles.remove(roleId);

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
