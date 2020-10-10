import { botControlCmd } from "../types";
import { isOwnerPreFilter, sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { ApiPermissions } from "@shared/apiPermissions";

export const AddDashboardUserCmd = botControlCmd({
  trigger: ["add_dashboard_user"],
  permission: null,
  config: {
    preFilters: [isOwnerPreFilter],
  },

  signature: {
    guildId: ct.string(),
    users: ct.user({ rest: true }),
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

    const userNameList = args.users.map(
      user => `<@!${user.id}> (**${user.username}#${user.discriminator}**, \`${user.id}\`)`,
    );
    sendSuccessMessage(
      pluginData,
      msg.channel,
      `The following users were given dashboard access for **${guild.name}**:\n\n${userNameList}`,
    );
  },
});
