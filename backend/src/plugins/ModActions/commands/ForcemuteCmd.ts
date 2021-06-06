import { commandTypeHelpers as ct } from "../../../commandTypes";
import { canActOn, sendErrorMessage } from "../../../pluginUtils";
import { resolveMember, resolveUser } from "../../../utils";
import { actualMuteUserCmd } from "../functions/actualMuteUserCmd";
import { modActionsCmd } from "../types";

const opts = {
  mod: ct.member({ option: true }),
  notify: ct.string({ option: true }),
  "notify-channel": ct.textChannel({ option: true }),
};

export const ForcemuteCmd = modActionsCmd({
  trigger: "forcemute",
  permission: "can_mute",
  description: "Force-mute the specified user, even if they're not on the server",

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

    const memberToMute = await resolveMember(pluginData.client, pluginData.guild, user.id);

    // Make sure we're allowed to mute this user
    if (memberToMute && !canActOn(pluginData, msg.member, memberToMute)) {
      sendErrorMessage(pluginData, msg.channel, "Cannot mute: insufficient permissions");
      return;
    }

    actualMuteUserCmd(pluginData, user, msg, { ...args, notify: "none" });
  },
});
