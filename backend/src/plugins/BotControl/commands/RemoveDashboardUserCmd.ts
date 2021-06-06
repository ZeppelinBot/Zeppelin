import { TextChannel } from "discord.js";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { isOwnerPreFilter, sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { botControlCmd } from "../types";

export const RemoveDashboardUserCmd = botControlCmd({
  trigger: ["remove_dashboard_user"],
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
      sendErrorMessage(pluginData, msg.channel as TextChannel, "Server is not using Zeppelin");
      return;
    }

    for (const user of args.users) {
      const existingAssignment = await pluginData.state.apiPermissionAssignments.getByGuildAndUserId(
        args.guildId,
        user.id,
      );
      if (!existingAssignment) {
        continue;
      }

      await pluginData.state.apiPermissionAssignments.removeUser(args.guildId, user.id);
    }

    const userNameList = args.users.map(
      user => `<@!${user.id}> (**${user.username}#${user.discriminator}**, \`${user.id}\`)`,
    );
    sendSuccessMessage(
      pluginData,
      msg.channel as TextChannel,
      `The following users were removed from the dashboard for **${guild.name}**:\n\n${userNameList}`,
    );
  },
});
