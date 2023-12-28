import { ApiPermissions } from "@shared/apiPermissions";
import moment from "moment-timezone";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { DBDateFormat, isGuildInvite, resolveInvite } from "../../../utils";
import { isEligible } from "../functions/isEligible";
import { botControlCmd } from "../types";

export const AddServerFromInviteCmd = botControlCmd({
  trigger: ["add_server_from_invite", "allow_server_from_invite", "adv"],
  permission: "can_add_server_from_invite",

  signature: {
    user: ct.resolvedUser(),
    inviteCode: ct.string(),
  },

  async run({ pluginData, message: msg, args }) {
    const invite = await resolveInvite(pluginData.client, args.inviteCode, true);
    if (!invite || !isGuildInvite(invite)) {
      sendErrorMessage(pluginData, msg.channel, "Could not resolve invite"); // :D
      return;
    }

    const existing = await pluginData.state.allowedGuilds.find(invite.guild.id);
    if (existing) {
      sendErrorMessage(pluginData, msg.channel, "Server is already allowed!");
      return;
    }

    const { result, explanation } = await isEligible(pluginData, args.user, invite);
    if (!result) {
      sendErrorMessage(pluginData, msg.channel, `Could not add server because it's not eligible: ${explanation}`);
      return;
    }

    await pluginData.state.allowedGuilds.add(invite.guild.id, { name: invite.guild.name });
    await pluginData.state.configs.saveNewRevision(`guild-${invite.guild.id}`, "plugins: {}", msg.author.id);

    await pluginData.state.apiPermissionAssignments.addUser(invite.guild.id, args.user.id, [
      ApiPermissions.ManageAccess,
    ]);

    if (args.user.id !== msg.author.id) {
      // Add temporary access to user who added server
      await pluginData.state.apiPermissionAssignments.addUser(
        invite.guild.id,
        msg.author.id,
        [ApiPermissions.ManageAccess],
        moment.utc().add(1, "hour").format(DBDateFormat),
      );
    }

    sendSuccessMessage(pluginData, msg.channel, "Server was eligible and is now allowed to use Zeppelin!");
  },
});
