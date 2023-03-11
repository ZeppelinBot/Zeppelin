import { ApiPermissions } from "@shared/apiPermissions";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { isStaffPreFilter, sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { botControlCmd } from "../types";

export const AddDashboardUserCmd = botControlCmd({
  trigger: ["add_dashboard_user"],
  permission: null,
  config: {
    preFilters: [isStaffPreFilter],
  },

  signature: {
    guildId: ct.string(),
    users: ct.resolvedUser({ rest: true }),
  },

  async run({ pluginData, message: msg, args }) {
    const guild = await pluginData.state.allowedGuilds.find(args.guildId);
    if (!guild) {
      sendErrorMessage(pluginData, msg.channel, "Server is not using Zeppelin");
      return;
    }

    for (const user of args.users) {
      const existingAssignment = await pluginData.state.apiPermissionAssignments.getByGuildAndUserId(
        args.guildId,
        user.id,
      );
      if (existingAssignment) {
        continue;
      }

      await pluginData.state.apiPermissionAssignments.addUser(args.guildId, user.id, [ApiPermissions.EditConfig]);
    }

    const userNameList = args.users.map((user) => `<@!${user.id}> (**${user.tag}**, \`${user.id}\`)`);
    sendSuccessMessage(
      pluginData,
      msg.channel,
      `The following users were given dashboard access for **${guild.name}**:\n\n${userNameList}`,
    );
  },
});
