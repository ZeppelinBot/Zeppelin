import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils.js";
import { renderUsername, resolveUser } from "../../../utils.js";
import { botControlCmd } from "../types.js";

export const ListDashboardUsersCmd = botControlCmd({
  trigger: ["list_dashboard_users"],
  permission: "can_list_dashboard_perms",

  signature: {
    guildId: ct.string(),
  },

  async run({ pluginData, message: msg, args }) {
    const guild = await pluginData.state.allowedGuilds.find(args.guildId);
    if (!guild) {
      sendErrorMessage(pluginData, msg.channel, "Server is not using Zeppelin");
      return;
    }

    const dashboardUsers = await pluginData.state.apiPermissionAssignments.getByGuildId(guild.id);
    const users = await Promise.all(
      dashboardUsers.map(async (perm) => ({
        user: await resolveUser(pluginData.client, perm.target_id),
        permission: perm,
      })),
    );
    const userNameList = users.map(
      ({ user, permission }) =>
        `<@!${user.id}> (**${renderUsername(user)}**, \`${user.id}\`): ${permission.permissions.join(", ")}`,
    );

    sendSuccessMessage(
      pluginData,
      msg.channel,
      `The following users have dashboard access for **${guild.name}**:\n\n${userNameList.join("\n")}`,
      {},
    );
  },
});
