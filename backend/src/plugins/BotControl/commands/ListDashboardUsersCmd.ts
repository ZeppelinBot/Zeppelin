import { commandTypeHelpers as ct } from "../../../commandTypes";
import { renderUsername, resolveUser } from "../../../utils";
import { CommonPlugin } from "../../Common/CommonPlugin";
import { botControlCmd } from "../types";

export const ListDashboardUsersCmd = botControlCmd({
  trigger: ["list_dashboard_users"],
  permission: "can_list_dashboard_perms",

  signature: {
    guildId: ct.string(),
  },

  async run({ pluginData, message: msg, args }) {
    const guild = await pluginData.state.allowedGuilds.find(args.guildId);
    if (!guild) {
      pluginData.getPlugin(CommonPlugin).sendErrorMessage(msg, "Server is not using Zeppelin");
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

    pluginData
      .getPlugin(CommonPlugin)
      .sendSuccessMessage(
        msg,
        `The following users have dashboard access for **${guild.name}**:\n\n${userNameList.join("\n")}`,
        {},
      );
  },
});
