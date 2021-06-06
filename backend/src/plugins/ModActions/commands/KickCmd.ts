import { commandTypeHelpers as ct } from "../../../commandTypes";
import { actualKickMemberCmd } from "../functions/actualKickMemberCmd";
import { modActionsCmd } from "../types";

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
