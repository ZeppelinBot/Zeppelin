import { commandTypeHelpers as ct } from "../../../commandTypes";
import { trimPluginDescription } from "../../../utils";
import { actualKickMemberCmd } from "../functions/actualKickMemberCmd";
import { modActionsCmd } from "../types";

const opts = {
  mod: ct.member({ option: true }),
  notify: ct.string({ option: true }),
  "notify-channel": ct.textChannel({ option: true }),
};

export const SoftbanCmd = modActionsCmd({
  trigger: "softban",
  permission: "can_kick",
  description: trimPluginDescription(`
        "Softban" the specified user by banning and immediately unbanning them. Effectively a kick with message deletions.
        This command will be removed in the future, please use kick with the \`- clean\` argument instead
    `),

  signature: [
    {
      user: ct.string(),
      reason: ct.string({ required: false, catchAll: true }),

      ...opts,
    },
  ],

  async run({ pluginData, message: msg, args }) {
    await actualKickMemberCmd(pluginData, msg, { clean: true, ...args });
    await msg.channel.send(
      "Softban will be removed in the future - please use the kick command with the `-clean` argument instead!",
    );
  },
});
