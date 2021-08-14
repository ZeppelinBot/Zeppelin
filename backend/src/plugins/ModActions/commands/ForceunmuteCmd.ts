import { commandTypeHelpers as ct } from "../../../commandTypes";
import { canActOn, sendErrorMessage } from "../../../pluginUtils";
import { resolveMember, resolveUser } from "../../../utils";
import { actualUnmuteCmd } from "../functions/actualUnmuteUserCmd";
import { modActionsCmd } from "../types";

const opts = {
  mod: ct.member({ option: true }),
};

export const ForceUnmuteCmd = modActionsCmd({
  trigger: "forceunmute",
  permission: "can_mute",
  description: "Force-unmute the specified user, even if they're not on the server",

  signature: [
    {
      user: ct.string(),
      time: ct.delay(),
      reason: ct.string({ required: false, catchAll: true }),

      ...opts,
    },
    {
      user: ct.string(),
      reason: ct.string({ required: false, catchAll: true }),

      ...opts,
    },
  ],

  async run({ pluginData, message: msg, args }) {
    const user = await resolveUser(pluginData.client, args.user);
    if (!user.id) {
      sendErrorMessage(pluginData, msg.channel, `User not found`);
      return;
    }

    // Check if they're muted in the first place
    if (!(await pluginData.state.mutes.isMuted(user.id))) {
      sendErrorMessage(pluginData, msg.channel, "Cannot unmute: member is not muted");
      return;
    }

    // Find the server member to unmute
    const memberToUnmute = await resolveMember(pluginData.client, pluginData.guild, user.id);

    // Make sure we're allowed to unmute this member
    if (memberToUnmute && !canActOn(pluginData, msg.member, memberToUnmute)) {
      sendErrorMessage(pluginData, msg.channel, "Cannot unmute: insufficient permissions");
      return;
    }

    actualUnmuteCmd(pluginData, user, msg, args);
  },
});
