import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage, sendSuccessMessage } from "src/pluginUtils";
import { slowmodeCmd } from "../types";
import { disableBotSlowmodeForChannel } from "../util/disableBotSlowmodeForChannel";
import { noop } from "src/utils";
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
