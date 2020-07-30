import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage, sendSuccessMessage, canActOn } from "src/pluginUtils";
import { rolesCmd } from "../types";
import { resolveRoleId, stripObjectToScalars, verboseUserMention } from "src/utils";
import { LogType } from "src/data/LogType";
import { GuildChannel } from "eris";

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
      return sendErrorMessage(pluginData, msg.channel, "Cannot add roles to this user: insufficient permissions");
    }

    const roleId = await resolveRoleId(pluginData.client, pluginData.guild.id, args.role);
    if (!roleId) {
      return sendErrorMessage(pluginData, msg.channel, "Invalid role id");
    }

    const config = pluginData.config.getForMessage(msg);
    if (!config.assignable_roles.includes(roleId)) {
      return sendErrorMessage(pluginData, msg.channel, "You cannot assign that role");
    }

    // Sanity check: make sure the role is configured properly
    const role = (msg.channel as GuildChannel).guild.roles.get(roleId);
    if (!role) {
      pluginData.state.logs.log(LogType.BOT_ALERT, {
        body: `Unknown role configured for 'roles' plugin: ${roleId}`,
      });
      return sendErrorMessage(pluginData, msg.channel, "You cannot assign that role");
    }

    if (args.member.roles.includes(roleId)) {
      return sendErrorMessage(pluginData, msg.channel, "Member already has that role");
    }

    pluginData.state.logs.ignoreLog(LogType.MEMBER_ROLE_ADD, args.member.id);

    await args.member.addRole(roleId);

    pluginData.state.logs.log(LogType.MEMBER_ROLE_ADD, {
      member: stripObjectToScalars(args.member, ["user", "roles"]),
      roles: role.name,
      mod: stripObjectToScalars(msg.author),
    });

    sendSuccessMessage(
      pluginData,
      msg.channel,
      `Added role **${role.name}** to ${verboseUserMention(args.member.user)}!`,
    );
  },
});
