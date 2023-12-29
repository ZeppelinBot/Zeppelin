import { commandTypeHelpers as ct } from "../../../commandTypes";
import { AllowedGuild } from "../../../data/entities/AllowedGuild";
import { ApiPermissionAssignment } from "../../../data/entities/ApiPermissionAssignment";
import { sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { renderUserUsername, resolveUser } from "../../../utils";
import { botControlCmd } from "../types";

export const ListDashboardPermsCmd = botControlCmd({
  trigger: ["list_dashboard_permissions", "list_dashboard_perms", "list_dash_permissions", "list_dash_perms"],
  permission: "can_list_dashboard_perms",

  signature: {
    guildId: ct.string({ option: true, shortcut: "g" }),
    user: ct.resolvedUser({ option: true, shortcut: "u" }),
  },

  async run({ pluginData, message: msg, args }) {
    if (!args.user && !args.guildId) {
      sendErrorMessage(pluginData, msg.channel, "Must specify at least guildId, user, or both.");
      return;
    }

    let guild: AllowedGuild | null = null;
    if (args.guildId) {
      guild = await pluginData.state.allowedGuilds.find(args.guildId);
      if (!guild) {
        sendErrorMessage(pluginData, msg.channel, "Server is not using Zeppelin");
        return;
      }
    }

    let existingUserAssignment: ApiPermissionAssignment[];
    if (args.user) {
      existingUserAssignment = await pluginData.state.apiPermissionAssignments.getByUserId(args.user.id);
      if (existingUserAssignment.length === 0) {
        sendErrorMessage(pluginData, msg.channel, "The user has no assigned permissions.");
        return;
      }
    }

    let finalMessage = "";

    // If we have user, always display which guilds they have permissions in (or only specified guild permissions)
    if (args.user) {
      const userInfo = `**${renderUserUsername(args.user)}** (\`${args.user.id}\`)`;

      for (const assignment of existingUserAssignment!) {
        if (guild != null && assignment.guild_id !== args.guildId) continue;
        const assignmentGuild = await pluginData.state.allowedGuilds.find(assignment.guild_id);
        const guildName = assignmentGuild?.name ?? "Unknown";
        const guildInfo = `**${guildName}** (\`${assignment.guild_id}\`)`;
        finalMessage += `The user ${userInfo} has the following permissions on server ${guildInfo}:`;
        finalMessage += `\n${assignment.permissions.join("\n")}\n\n`;
      }

      if (finalMessage === "") {
        sendErrorMessage(
          pluginData,
          msg.channel,
          `The user ${userInfo} has no assigned permissions on the specified server.`,
        );
        return;
      }
      // Else display all users that have permissions on the specified guild
    } else if (guild) {
      const guildInfo = `**${guild.name}** (\`${guild.id}\`)`;

      const existingGuildAssignment = await pluginData.state.apiPermissionAssignments.getByGuildId(guild.id);
      if (existingGuildAssignment.length === 0) {
        sendErrorMessage(pluginData, msg.channel, `The server ${guildInfo} has no assigned permissions.`);
        return;
      }

      finalMessage += `The server ${guildInfo} has the following assigned permissions:\n`; // Double \n for consistency with AddDashboardUserCmd
      for (const assignment of existingGuildAssignment) {
        const user = await resolveUser(pluginData.client, assignment.target_id);
        finalMessage += `\n**${renderUserUsername(user)}**, \`${assignment.target_id}\`: ${assignment.permissions.join(
          ", ",
        )}`;
      }
    }

    await sendSuccessMessage(pluginData, msg.channel, finalMessage.trim(), {});
  },
});
