import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { slowmodeCmd } from "../types.js";
import { actualDisableSlowmodeCmd } from "../util/actualDisableSlowmodeCmd.js";

export const SlowmodeDisableCmd = slowmodeCmd({
  trigger: ["slowmode disable", "slowmode d"],
  permission: "can_manage",

  signature: {
    channel: ct.textChannel(),
  },

  async run({ message: msg, args, pluginData }) {
    // Workaround until you can call this cmd from SlowmodeSetChannelCmd
    actualDisableSlowmodeCmd(msg, args, pluginData);
  },
});
