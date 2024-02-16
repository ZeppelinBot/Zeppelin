import { commandTypeHelpers as ct } from "../../../../commandTypes";
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

export const CasesModMsgCmd = modActionsMsgCmd({
  trigger: ["cases", "modlogs", "infractions"],
  permission: "can_view",
  description: "Show the most recent 5 cases by the specified -mod",

  signature: [
    {
      ...opts,
    },
  ],

  async run({ pluginData, message: msg, args }) {
    return actualCasesCmd(
      pluginData,
      msg,
      args.mod,
      null,
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
