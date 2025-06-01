import { GuildChannel } from "discord.js";
import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { canActOn, resolveMessageMember } from "../../../pluginUtils.js";
import { resolveRoleId, verboseUserMention } from "../../../utils.js";
import { LogsPlugin } from "../../Logs/LogsPlugin.js";
import { RoleManagerPlugin } from "../../RoleManager/RoleManagerPlugin.js";
import { rolesCmd } from "../types.js";

export const AddRoleCmd = rolesCmd({
  trigger: "addrole",
  permission: "can_assign",
  description: "Add a role to the specified member",

  signature: {
    member: ct.resolvedMember(),
    role: ct.string({ catchAll: true }),
  },

  async run({ message: msg, args, pluginData }) {
    const member = await resolveMessageMember(msg);
    if (!canActOn(pluginData, member, args.member, true)) {
      void pluginData.state.common.sendErrorMessage(msg, "Cannot add roles to this user: insufficient permissions");
      return;
    }

    const roleId = await resolveRoleId(pluginData.client, pluginData.guild.id, args.role);
    if (!roleId) {
      void pluginData.state.common.sendErrorMessage(msg, "Invalid role id");
      return;
    }

    const config = await pluginData.config.getForMessage(msg);
    if (!config.assignable_roles.includes(roleId)) {
      void pluginData.state.common.sendErrorMessage(msg, "You cannot assign that role");
      return;
    }

    // Sanity check: make sure the role is configured properly
    const role = (msg.channel as GuildChannel).guild.roles.cache.get(roleId);
    if (!role) {
      pluginData.getPlugin(LogsPlugin).logBotAlert({
        body: `Unknown role configured for 'roles' plugin: ${roleId}`,
      });
      void pluginData.state.common.sendErrorMessage(msg, "You cannot assign that role");
      return;
    }

    if (args.member.roles.cache.has(roleId)) {
      void pluginData.state.common.sendErrorMessage(msg, "Member already has that role");
      return;
    }

    pluginData.getPlugin(RoleManagerPlugin).addRole(args.member.id, roleId);

    pluginData.getPlugin(LogsPlugin).logMemberRoleAdd({
      mod: msg.author,
      member: args.member,
      roles: [role],
    });

    void pluginData.state.common.sendSuccessMessage(
      msg,
      `Added role **${role.name}** to ${verboseUserMention(args.member.user)}!`,
    );
  },
});
