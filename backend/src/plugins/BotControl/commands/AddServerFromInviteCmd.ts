import { ApiPermissions } from "@zeppelinbot/shared/apiPermissions.js";
import moment from "moment-timezone";
import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { DBDateFormat, isGuildInvite, resolveInvite } from "../../../utils.js";
import { isEligible } from "../functions/isEligible.js";
import { botControlCmd } from "../types.js";

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
      void msg.channel.send("Could not resolve invite"); // :D
      return;
    }

    const existing = await pluginData.state.allowedGuilds.find(invite.guild.id);
    if (existing) {
      void msg.channel.send("Server is already allowed!");
      return;
    }

    const { result, explanation } = await isEligible(pluginData, args.user, invite);
    if (!result) {
      msg.channel.send(`Could not add server because it's not eligible: ${explanation}`);
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

    msg.channel.send("Server was eligible and is now allowed to use Zeppelin!");
  },
});
