import { modActionsCmd } from "../types";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { canActOn, sendErrorMessage } from "../../../pluginUtils";
import { resolveUser, resolveMember, noop } from "../../../utils";
import { MutesPlugin } from "../../../plugins/Mutes/MutesPlugin";
import { actualUnmuteCmd } from "../functions/actualUnmuteUserCmd";
import { isBanned } from "../functions/isBanned";
import { waitForReaction } from "knub/dist/helpers";

const opts = {
  mod: ct.member({ option: true }),
};

export const UnmuteCmd = modActionsCmd({
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
    if (!user.id) {
      sendErrorMessage(pluginData, msg.channel, `User not found`);
      return;
    }

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
      const prefix = pluginData.fullConfig.prefix;
      if (banned) {
        sendErrorMessage(
          pluginData,
          msg.channel,
          `User is banned. Use \`${prefix}forceunmute\` to unmute them anyway.`,
        );
        return;
      } else {
        // Ask the mod if we should upgrade to a forceunmute as the user is not on the server
        const notOnServerMsg = await msg.channel.createMessage("User not found on the server, forceunmute instead?");
        const reply = await waitForReaction(pluginData.client, notOnServerMsg, ["✅", "❌"], msg.author.id);

        notOnServerMsg.delete().catch(noop);
        if (!reply || reply.name === "❌") {
          sendErrorMessage(pluginData, msg.channel, "User not on server, unmute cancelled by moderator");
          return;
        }
      }
    }

    // Make sure we're allowed to unmute this member
    if (memberToUnmute && !canActOn(pluginData, msg.member, memberToUnmute)) {
      sendErrorMessage(pluginData, msg.channel, "Cannot unmute: insufficient permissions");
      return;
    }

    actualUnmuteCmd(pluginData, user, msg, args);
  },
});
