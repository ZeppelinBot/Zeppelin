import { GuildMember } from "discord.js";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { LogType } from "../../../data/LogType";
import { logger } from "../../../logger";
import { canActOn, sendErrorMessage } from "../../../pluginUtils";
import { resolveMember, resolveRoleId, stripObjectToScalars, successMessage } from "../../../utils";
import { rolesCmd } from "../types";

export const MassRemoveRoleCmd = rolesCmd({
  trigger: "massremoverole",
  permission: "can_mass_assign",

  signature: {
    role: ct.string(),
    members: ct.string({ rest: true }),
  },

  async run({ message: msg, args, pluginData }) {
    msg.channel.send(`Resolving members...`);

    const members: GuildMember[] = [];
    const unknownMembers: string[] = [];
    for (const memberId of args.members) {
      const member = await resolveMember(pluginData.client, pluginData.guild, memberId);
      if (member) members.push(member);
      else unknownMembers.push(memberId);
    }

    for (const member of members) {
      if (!canActOn(pluginData, msg.member, member, true)) {
        sendErrorMessage(
          pluginData,
          msg.channel,
          "Cannot add roles to 1 or more specified members: insufficient permissions",
        );
        return;
      }
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

    const role = pluginData.guild.roles.cache.get(roleId);
    if (!role) {
      pluginData.state.logs.log(LogType.BOT_ALERT, {
        body: `Unknown role configured for 'roles' plugin: ${roleId}`,
      });
      sendErrorMessage(pluginData, msg.channel, "You cannot remove that role");
      return;
    }

    const membersWithTheRole = members.filter(m => m.roles.cache.has(roleId));
    let assigned = 0;
    const failed: string[] = [];
    const didNotHaveRole = members.length - membersWithTheRole.length;

    msg.channel.send(
      `Removing role **${role.name}** from ${membersWithTheRole.length} ${
        membersWithTheRole.length === 1 ? "member" : "members"
      }...`,
    );

    for (const member of membersWithTheRole) {
      try {
        pluginData.state.logs.ignoreLog(LogType.MEMBER_ROLE_REMOVE, member.id);
        await member.roles.remove(roleId);
        pluginData.state.logs.log(LogType.MEMBER_ROLE_REMOVE, {
          member: stripObjectToScalars(member, ["user", "roles"]),
          roles: role.name,
          mod: stripObjectToScalars(msg.author),
        });
        assigned++;
      } catch (e) {
        logger.warn(`Error when removing role via !massremoverole: ${e.message}`);
        failed.push(member.id);
      }
    }

    let resultMessage = `Removed role **${role.name}** from  ${assigned} ${assigned === 1 ? "member" : "members"}!`;
    if (didNotHaveRole) {
      resultMessage += ` ${didNotHaveRole} ${didNotHaveRole === 1 ? "member" : "members"} didn't have the role.`;
    }

    if (failed.length) {
      resultMessage += `\nFailed to remove the role from the following members: ${failed.join(", ")}`;
    }

    if (unknownMembers.length) {
      resultMessage += `\nUnknown members: ${unknownMembers.join(", ")}`;
    }

    msg.channel.send(successMessage(resultMessage));
  },
});
