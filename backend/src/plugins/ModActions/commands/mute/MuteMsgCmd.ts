import { commandTypeHelpers as ct } from "../../../../commandTypes";
import { canActOn, hasPermission } from "../../../../pluginUtils";
import { resolveMember, resolveUser } from "../../../../utils";
import { waitForButtonConfirm } from "../../../../utils/waitForInteraction";
import { CommonPlugin } from "../../../Common/CommonPlugin";
import { actualMuteCmd } from "../../functions/actualCommands/actualMuteCmd";
import { isBanned } from "../../functions/isBanned";
import { readContactMethodsFromArgs } from "../../functions/readContactMethodsFromArgs";
import { modActionsMsgCmd } from "../../types";

const opts = {
  mod: ct.member({ option: true }),
  notify: ct.string({ option: true }),
  "notify-channel": ct.textChannel({ option: true }),
};

export const MuteMsgCmd = modActionsMsgCmd({
  trigger: "mute",
  permission: "can_mute",
  description: "Mute the specified member",

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
      pluginData.getPlugin(CommonPlugin).sendErrorMessage(msg, `User not found`);
      return;
    }

    const memberToMute = await resolveMember(pluginData.client, pluginData.guild, user.id);

    if (!memberToMute) {
      const _isBanned = await isBanned(pluginData, user.id);
      const prefix = pluginData.fullConfig.prefix;
      if (_isBanned) {
        pluginData
          .getPlugin(CommonPlugin)
          .sendErrorMessage(msg, `User is banned. Use \`${prefix}forcemute\` if you want to mute them anyway.`);
        return;
      } else {
        // Ask the mod if we should upgrade to a forcemute as the user is not on the server
        const reply = await waitForButtonConfirm(
          msg,
          { content: "User not found on the server, forcemute instead?" },
          { confirmText: "Yes", cancelText: "No", restrictToId: msg.member.id },
        );

        if (!reply) {
          pluginData.getPlugin(CommonPlugin).sendErrorMessage(msg, "User not on server, mute cancelled by moderator");
          return;
        }
      }
    }

    // Make sure we're allowed to mute this member
    if (memberToMute && !canActOn(pluginData, msg.member, memberToMute)) {
      pluginData.getPlugin(CommonPlugin).sendErrorMessage(msg, "Cannot mute: insufficient permissions");
      return;
    }

    // The moderator who did the action is the message author or, if used, the specified -mod
    let mod = msg.member;
    let ppId: string | undefined;

    if (args.mod) {
      if (!(await hasPermission(pluginData, "can_act_as_other", { message: msg }))) {
        pluginData.getPlugin(CommonPlugin).sendErrorMessage(msg, "You don't have permission to use -mod");
        return;
      }

      mod = args.mod;
      ppId = msg.author.id;
    }

    let contactMethods;
    try {
      contactMethods = readContactMethodsFromArgs(args);
    } catch (e) {
      pluginData.getPlugin(CommonPlugin).sendErrorMessage(msg, e.message);
      return;
    }

    actualMuteCmd(
      pluginData,
      msg,
      user,
      [...msg.attachments.values()],
      mod,
      ppId,
      "time" in args ? args.time ?? undefined : undefined,
      args.reason,
      contactMethods,
    );
  },
});
