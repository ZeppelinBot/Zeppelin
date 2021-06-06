import { ApiPermissions } from "@shared/apiPermissions";
import { TextChannel } from "discord.js";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { isOwnerPreFilter, sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { isSnowflake } from "../../../utils";
import { botControlCmd } from "../types";

export const AllowServerCmd = botControlCmd({
  trigger: ["allow_server", "allowserver", "add_server", "addserver"],
  permission: null,
  config: {
    preFilters: [isOwnerPreFilter],
  },

  signature: {
    guildId: ct.string(),
    userId: ct.string({ required: false }),
  },

  async run({ pluginData, message: msg, args }) {
    const existing = await pluginData.state.allowedGuilds.find(args.guildId);
    if (existing) {
      sendErrorMessage(pluginData, msg.channel as TextChannel, "Server is already allowed!");
      return;
    }

    if (!isSnowflake(args.guildId)) {
      sendErrorMessage(pluginData, msg.channel as TextChannel, "Invalid server ID!");
      return;
    }

    if (args.userId && !isSnowflake(args.userId)) {
      sendErrorMessage(pluginData, msg.channel as TextChannel, "Invalid user ID!");
      return;
    }

    await pluginData.state.allowedGuilds.add(args.guildId);
    await pluginData.state.configs.saveNewRevision(`guild-${args.guildId}`, "plugins: {}", msg.author.id);

    if (args.userId) {
      await pluginData.state.apiPermissionAssignments.addUser(args.guildId, args.userId, [ApiPermissions.EditConfig]);
    }

    sendSuccessMessage(pluginData, msg.channel as TextChannel, "Server is now allowed to use Zeppelin!");
  },
});
