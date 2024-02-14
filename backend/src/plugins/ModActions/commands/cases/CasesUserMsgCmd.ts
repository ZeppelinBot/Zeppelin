import { commandTypeHelpers as ct } from "../../../../commandTypes";
import { sendErrorMessage } from "../../../../pluginUtils";
import { resolveUser } from "../../../../utils";
import { actualCasesCmd } from "../../functions/actualCommands/actualCasesCmd";
import { modActionsMsgCmd } from "../../types";

const opts = {
  mod: ct.userId({ option: true }),
  expand: ct.bool({ option: true, isSwitch: true, shortcut: "e" }),
  hidden: ct.bool({ option: true, isSwitch: true, shortcut: "h" }),
  reverseFilters: ct.switchOption({ def: false, shortcut: "r" }),
  notes: ct.switchOption({ def: false, shortcut: "n" }),
  warns: ct.switchOption({ def: false, shortcut: "w" }),
  mutes: ct.switchOption({ def: false, shortcut: "m" }),
  unmutes: ct.switchOption({ def: false, shortcut: "um" }),
  bans: ct.switchOption({ def: false, shortcut: "b" }),
  unbans: ct.switchOption({ def: false, shortcut: "ub" }),
};

export const CasesUserMsgCmd = modActionsMsgCmd({
  trigger: ["cases", "modlogs", "infractions"],
  permission: "can_view",
  description: "Show a list of cases the specified user has",

  signature: [
    {
      user: ct.string(),

      ...opts,
    },
  ],

  async run({ pluginData, message: msg, args }) {
    const user = await resolveUser(pluginData.client, args.user);
    if (!user.id) {
      sendErrorMessage(pluginData, msg.channel, `User not found`);
      return;
    }

    return actualCasesCmd(
      pluginData,
      msg.channel,
      args.mod,
      user,
      msg.author,
      args.notes,
      args.warns,
      args.mutes,
      args.unmutes,
      args.bans,
      args.unbans,
      args.reverseFilters,
      args.hidden,
      args.expand,
    );
  },
});
