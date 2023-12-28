import { ApiPermissions } from "@shared/apiPermissions";
import moment from "moment-timezone";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { isStaffPreFilter, sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { DBDateFormat, isSnowflake } from "../../../utils";
import { botControlCmd } from "../types";

export const AllowServerCmd = botControlCmd({
  trigger: ["allow_server", "allowserver", "add_server", "addserver"],
  permission: null,
  config: {
    preFilters: [isStaffPreFilter],
  },

  signature: {
    guildId: ct.string(),
    userId: ct.string({ required: false }),
  },

  async run({ pluginData, message: msg, args }) {
    const existing = await pluginData.state.allowedGuilds.find(args.guildId);
    if (existing) {
      sendErrorMessage(pluginData, msg.channel, "Server is already allowed!");
      return;
    }

    if (!isSnowflake(args.guildId)) {
      sendErrorMessage(pluginData, msg.channel, "Invalid server ID!");
      return;
    }

    if (args.userId && !isSnowflake(args.userId)) {
      sendErrorMessage(pluginData, msg.channel, "Invalid user ID!");
      return;
    }

    await pluginData.state.allowedGuilds.add(args.guildId);
    await pluginData.state.configs.saveNewRevision(`guild-${args.guildId}`, "plugins: {}", msg.author.id);

    if (args.userId) {
      await pluginData.state.apiPermissionAssignments.addUser(args.guildId, args.userId, [ApiPermissions.ManageAccess]);
    }

    if (args.userId !== msg.author.id) {
      // Add temporary access to user who added server
      await pluginData.state.apiPermissionAssignments.addUser(
        args.guildId,
        msg.author.id,
        [ApiPermissions.ManageAccess],
        moment.utc().add(1, "hour").format(DBDateFormat),
      );
    }

    sendSuccessMessage(pluginData, msg.channel, "Server is now allowed to use Zeppelin!");
  },
});
