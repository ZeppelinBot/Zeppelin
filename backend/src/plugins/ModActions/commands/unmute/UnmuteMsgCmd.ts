import { commandTypeHelpers as ct } from "../../../../commandTypes.js";
import { canActOn, hasPermission, resolveMessageMember } from "../../../../pluginUtils.js";
import { resolveMember, resolveUser } from "../../../../utils.js";
import { waitForButtonConfirm } from "../../../../utils/waitForInteraction.js";
import { MutesPlugin } from "../../../Mutes/MutesPlugin.js";
import { isBanned } from "../../functions/isBanned.js";
import { modActionsMsgCmd } from "../../types.js";
import { actualUnmuteCmd } from "./actualUnmuteCmd.js";

const opts = {
  mod: ct.member({ option: true }),
};

export const UnmuteMsgCmd = modActionsMsgCmd({
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
    const user = await resolveUser(pluginData.client, args.user, "ModActions:UnmuteMsgCmd");
    if (!user.id) {
      pluginData.state.common.sendErrorMessage(msg, `User not found`);
      return;
    }

    const authorMember = await resolveMessageMember(msg);
    const memberToUnmute = await resolveMember(pluginData.client, pluginData.guild, user.id);
    const mutesPlugin = pluginData.getPlugin(MutesPlugin);
    const hasMuteRole = memberToUnmute && mutesPlugin.hasMutedRole(memberToUnmute);

    // Check if they're muted in the first place
    if (
      !(await pluginData.state.mutes.isMuted(user.id)) &&
      !hasMuteRole &&
      !memberToUnmute?.isCommunicationDisabled()
    ) {
      pluginData.state.common.sendErrorMessage(msg, "Cannot unmute: member is not muted");
      return;
    }

    if (!memberToUnmute) {
      const banned = await isBanned(pluginData, user.id);
      const prefix = pluginData.fullConfig.prefix;
      if (banned) {
        pluginData.state.common.sendErrorMessage(
          msg,
          `User is banned. Use \`${prefix}forceunmute\` to unmute them anyway.`,
        );
        return;
      } else {
        // Ask the mod if we should upgrade to a forceunmute as the user is not on the server
        const reply = await waitForButtonConfirm(
          msg,
          { content: "User not on server, forceunmute instead?" },
          { confirmText: "Yes", cancelText: "No", restrictToId: authorMember.id },
        );

        if (!reply) {
          pluginData.state.common.sendErrorMessage(msg, "User not on server, unmute cancelled by moderator");
          return;
        }
      }
    }

    // Make sure we're allowed to unmute this member
    if (memberToUnmute && !canActOn(pluginData, authorMember, memberToUnmute)) {
      pluginData.state.common.sendErrorMessage(msg, "Cannot unmute: insufficient permissions");
      return;
    }

    // The moderator who did the action is the message author or, if used, the specified -mod
    let mod = authorMember;
    let ppId: string | undefined;

    if (args.mod) {
      if (!(await hasPermission(pluginData, "can_act_as_other", { message: msg }))) {
        pluginData.state.common.sendErrorMessage(msg, "You don't have permission to use -mod");
        return;
      }

      mod = args.mod;
      ppId = msg.author.id;
    }

    actualUnmuteCmd(
      pluginData,
      msg,
      user,
      [...msg.attachments.values()],
      mod,
      ppId,
      "time" in args ? (args.time ?? undefined) : undefined,
      args.reason,
    );
  },
});
