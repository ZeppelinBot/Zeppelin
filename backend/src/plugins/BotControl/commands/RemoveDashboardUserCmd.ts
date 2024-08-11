import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { isStaffPreFilter } from "../../../pluginUtils.js";
import { renderUsername } from "../../../utils.js";
import { botControlCmd } from "../types.js";

export const RemoveDashboardUserCmd = botControlCmd({
  trigger: ["remove_dashboard_user"],
  permission: null,
  config: {
    preFilters: [isStaffPreFilter],
  },

  signature: {
    guildId: ct.string(),
    users: ct.user({ rest: true }),
  },

  async run({ pluginData, message: msg, args }) {
    const guild = await pluginData.state.allowedGuilds.find(args.guildId);
    if (!guild) {
      void msg.channel.send("Server is not using Zeppelin");
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

    const userNameList = args.users.map((user) => `<@!${user.id}> (**${renderUsername(user)}**, \`${user.id}\`)`);

    msg.channel.send(`The following users were removed from the dashboard for **${guild.name}**:\n\n${userNameList}`);
  },
});
