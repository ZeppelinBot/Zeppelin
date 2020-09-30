import { modActionsCmd } from "../types";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { canActOn, sendErrorMessage } from "../../../pluginUtils";
import { resolveUser, resolveMember } from "../../../utils";
import { MutesPlugin } from "../../../plugins/Mutes/MutesPlugin";
import { actualUnmuteCmd } from "../functions/actualUnmuteUserCmd";
import { isBanned } from "../functions/isBanned";
import { actualKickMemberCmd } from "../functions/actualKickMemberCmd";

const opts = {
  mod: ct.member({ option: true }),
  notify: ct.string({ option: true }),
  "notify-channel": ct.textChannel({ option: true }),
  clean: ct.bool({ option: true, isSwitch: true }),
};

export const KickCmd = modActionsCmd({
  trigger: "kick",
  permission: "can_kick",
  description: "Kick the specified member",

  signature: [
    {
      user: ct.string(),
      reason: ct.string({ required: false, catchAll: true }),

      ...opts,
    },
  ],

  async run({ pluginData, message: msg, args }) {
    actualKickMemberCmd(pluginData, msg, args);
  },
});
