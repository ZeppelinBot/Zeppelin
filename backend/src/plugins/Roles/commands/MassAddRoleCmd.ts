import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage, canActOn } from "src/pluginUtils";
import { rolesCmd } from "../types";
import { resolveMember, resolveRoleId, stripObjectToScalars, successMessage } from "src/utils";
import { LogType } from "src/data/LogType";
import { logger } from "src/logger";

export const MassAddRoleCmd = rolesCmd({
  trigger: "massaddrole",
  permission: "can_mass_assign",

  signature: {
    role: ct.string(),
    members: ct.string({ rest: true }),
  },

  async run({ message: msg, args, pluginData }) {
    msg.channel.createMessage(`Resolving members...`);

    const members = [];
    const unknownMembers = [];
    for (const memberId of args.members) {
      const member = await resolveMember(pluginData.client, pluginData.guild, memberId);
      if (member) members.push(member);
      else unknownMembers.push(memberId);
    }

    for (const member of members) {
      if (!canActOn(pluginData, msg.member, member, true)) {
        return sendErrorMessage(
          pluginData,
          msg.channel,
          "Cannot add roles to 1 or more specified members: insufficient permissions",
        );
      }
    }

    const roleId = await resolveRoleId(pluginData.client, pluginData.guild.id, args.role);
    if (!roleId) {
      return sendErrorMessage(pluginData, msg.channel, "Invalid role id");
    }

    const config = pluginData.config.getForMessage(msg);
    if (!config.assignable_roles.includes(roleId)) {
      return sendErrorMessage(pluginData, msg.channel, "You cannot assign that role");
    }

    const role = pluginData.guild.roles.get(roleId);
    if (!role) {
      pluginData.state.logs.log(LogType.BOT_ALERT, {
        body: `Unknown role configured for 'roles' plugin: ${roleId}`,
      });
      return sendErrorMessage(pluginData, msg.channel, "You cannot assign that role");
    }

    const membersWithoutTheRole = members.filter(m => !m.roles.includes(roleId));
    let assigned = 0;
    const failed = [];
    const alreadyHadRole = members.length - membersWithoutTheRole.length;

    msg.channel.createMessage(
      `Adding role **${role.name}** to ${membersWithoutTheRole.length} ${
        membersWithoutTheRole.length === 1 ? "member" : "members"
      }...`,
    );

    for (const member of membersWithoutTheRole) {
      try {
        pluginData.state.logs.ignoreLog(LogType.MEMBER_ROLE_ADD, member.id);
        await member.addRole(roleId);
        pluginData.state.logs.log(LogType.MEMBER_ROLE_ADD, {
          member: stripObjectToScalars(member, ["user", "roles"]),
          roles: role.name,
          mod: stripObjectToScalars(msg.author),
        });
        assigned++;
      } catch (e) {
        logger.warn(`Error when adding role via !massaddrole: ${e.message}`);
        failed.push(member.id);
      }
    }

    let resultMessage = `Added role **${role.name}** to ${assigned} ${assigned === 1 ? "member" : "members"}!`;
    if (alreadyHadRole) {
      resultMessage += ` ${alreadyHadRole} ${alreadyHadRole === 1 ? "member" : "members"} already had the role.`;
    }

    if (failed.length) {
      resultMessage += `\nFailed to add the role to the following members: ${failed.join(", ")}`;
    }

    if (unknownMembers.length) {
      resultMessage += `\nUnknown members: ${unknownMembers.join(", ")}`;
    }

    msg.channel.createMessage(successMessage(resultMessage));
  },
});
