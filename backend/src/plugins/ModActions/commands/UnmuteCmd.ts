import { modActionsCommand } from "../types";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { canActOn, sendErrorMessage } from "../../../pluginUtils";
import { resolveUser, resolveMember } from "../../../utils";
import { MutesPlugin } from "src/plugins/Mutes/MutesPlugin";
import { actualUnmuteCmd } from "../functions/actualUnmuteUserCmd";
import { isBanned } from "../functions/isBanned";
import { plugin } from "knub";

const opts = {
  mod: ct.member({ option: true }),
};

export const UnmuteCmd = modActionsCommand({
  trigger: "unmute",
  permission: "can_mute",
  description: "Unmute the specified member",

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
    if (!user) return sendErrorMessage(pluginData, msg.channel, `User not found`);

    const memberToUnmute = await resolveMember(pluginData.client, pluginData.guild, user.id);
    const mutesPlugin = pluginData.getPlugin(MutesPlugin);
    const hasMuteRole = memberToUnmute && mutesPlugin.hasMutedRole(memberToUnmute);

    // Check if they're muted in the first place
    if (!(await pluginData.state.mutes.isMuted(args.user)) && !hasMuteRole) {
      sendErrorMessage(pluginData, msg.channel, "Cannot unmute: member is not muted");
      return;
    }

    if (!memberToUnmute) {
      const banned = await isBanned(pluginData, user.id);
      const prefix = pluginData.guildConfig.prefix;
      if (banned) {
        sendErrorMessage(
          pluginData,
          msg.channel,
          `User is banned. Use \`${prefix}forceunmute\` to unmute them anyway.`,
        );
      } else {
        sendErrorMessage(
          pluginData,
          msg.channel,
          `User is not on the server. Use \`${prefix}forceunmute\` to unmute them anyway.`,
        );
      }

      return;
    }

    // Make sure we're allowed to unmute this member
    if (memberToUnmute && !canActOn(pluginData, msg.member, memberToUnmute)) {
      sendErrorMessage(pluginData, msg.channel, "Cannot unmute: insufficient permissions");
      return;
    }

    actualUnmuteCmd(pluginData, user, msg, args);
  },
});
