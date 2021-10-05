import { commandTypeHelpers as ct } from "../../../commandTypes";
import { botControlCmd } from "../types";
import blockedAt from "blocked-at";

let stop;

export const ToggleBlockDetectionCmd = botControlCmd({
  trigger: ["toggle_block_detection"],
  permission: "can_performance",

  signature: {
    threshold: ct.number({ required: false }),
  },

  async run({ pluginData, message: msg, args }) {
    if (stop) {
      stop();
      stop = null;
      msg.channel.send("Disabled block detection");
      return;
    }

    const threshold = args.threshold || 1000;
    const result = blockedAt(
      (time, stack) => {
        console.error(`Blocked for ${time}ms, operation started here:`, stack);
      },
      { threshold },
    );
    stop = result.stop;
    msg.channel.send(`Block detection enabled with ${threshold}ms threshold`);
  },
});
