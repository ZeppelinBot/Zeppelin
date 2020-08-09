import { commandTypeHelpers as ct } from "../../../commandTypes";
import { slowmodeCmd } from "../types";
import { actualDisableSlowmodeCmd } from "../util/actualDisableSlowmodeCmd";

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
