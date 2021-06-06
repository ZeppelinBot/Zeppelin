import { TextChannel } from "discord.js";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { isOwnerPreFilter, sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { resolveUser } from "../../../utils";
import { botControlCmd } from "../types";

export const ListDashboardUsersCmd = botControlCmd({
  trigger: ["list_dashboard_users"],
  permission: null,
  config: {
    preFilters: [isOwnerPreFilter],
  },

  signature: {
    guildId: ct.string(),
  },

  async run({ pluginData, message: msg, args }) {
    const guild = await pluginData.state.allowedGuilds.find(args.guildId);
    if (!guild) {
      sendErrorMessage(pluginData, msg.channel as TextChannel, "Server is not using Zeppelin");
      return;
    }

    const dashboardUsers = await pluginData.state.apiPermissionAssignments.getByGuildId(guild.id);
    const users = await Promise.all(dashboardUsers.map(perm => resolveUser(pluginData.client, perm.target_id)));
    const userNameList = users.map(
      user => `<@!${user.id}> (**${user.username}#${user.discriminator}**, \`${user.id}\`)`,
    );

    sendSuccessMessage(
      pluginData,
      msg.channel as TextChannel,
      `The following users have dashboard access for **${guild.name}**:\n\n${userNameList}`,
      {},
    );
  },
});
