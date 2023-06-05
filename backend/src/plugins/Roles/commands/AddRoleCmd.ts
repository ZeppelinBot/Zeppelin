import { GuildChannel } from "discord.js";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { canActOn, sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { resolveRoleId, verboseUserMention } from "../../../utils";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { RoleManagerPlugin } from "../../RoleManager/RoleManagerPlugin";
import { rolesCmd } from "../types";

export const AddRoleCmd = rolesCmd({
  trigger: "addrole",
  permission: "can_assign",
  description: "Add a role to the specified member",

  signature: {
    member: ct.resolvedMember(),
    role: ct.string({ catchAll: true }),
  },

  async run({ message: msg, args, pluginData }) {
    if (!canActOn(pluginData, msg.member, args.member, true)) {
      sendErrorMessage(pluginData, msg.channel, "Cannot add roles to this user: insufficient permissions");
      return;
    }

    const roleId = await resolveRoleId(pluginData.client, pluginData.guild.id, args.role);
    if (!roleId) {
      sendErrorMessage(pluginData, msg.channel, "Invalid role id");
      return;
    }

    const config = await pluginData.config.getForMessage(msg);
    if (!config.assignable_roles.includes(roleId)) {
      sendErrorMessage(pluginData, msg.channel, "You cannot assign that role");
      return;
    }

    // Sanity check: make sure the role is configured properly
    const role = (msg.channel as GuildChannel).guild.roles.cache.get(roleId);
    if (!role) {
      pluginData.getPlugin(LogsPlugin).logBotAlert({
        body: `Unknown role configured for 'roles' plugin: ${roleId}`,
      });
      sendErrorMessage(pluginData, msg.channel, "You cannot assign that role");
      return;
    }

    if (args.member.roles.cache.has(roleId)) {
      sendErrorMessage(pluginData, msg.channel, "Member already has that role");
      return;
    }

    pluginData.getPlugin(RoleManagerPlugin).addRole(args.member.id, roleId);

    pluginData.getPlugin(LogsPlugin).logMemberRoleAdd({
      mod: msg.author,
      member: args.member,
      roles: [role],
    });

    sendSuccessMessage(
      pluginData,
      msg.channel,
      `Added role **${role.name}** to ${verboseUserMention(args.member.user)}!`,
    );
  },
});
