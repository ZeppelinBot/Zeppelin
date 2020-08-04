import { utilityCmd } from "../types";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { actualInfoCmd } from "../actualInfoCmd";

export const InfoCmd = utilityCmd({
  trigger: "info",
  description: "Show basic information about a user",
  usage: "!info 106391128718245888",
  permission: "can_info",

  signature: {
    user: ct.resolvedUserLoose({ required: false }),

    compact: ct.switchOption({ shortcut: "c" }),
  },

  async run({ message: msg, args, pluginData }) {
    actualInfoCmd(msg, args, pluginData);
  },
});
