import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { getTopRestCallStats } from "../../../restCallStats.js";
import { createChunkedMessage } from "../../../utils.js";
import { botControlCmd } from "../types.js";

const leadingPathRegex = /(?<=\().+\/backend\//g;

export const RestPerformanceCmd = botControlCmd({
  trigger: ["rest_performance"],
  permission: "can_performance",

  signature: {
    count: ct.number({ required: false }),
  },

  async run({ message: msg, args }) {
    const count = Math.max(1, Math.min(25, args.count || 5));
    const stats = getTopRestCallStats(count);
    const formatted = stats.map((callStats) => {
      const cleanSource = callStats.source.replace(leadingPathRegex, "");
      return `**${callStats.count} calls**\n${callStats.method.toUpperCase()} ${callStats.path}\n${cleanSource}`;
    });
    createChunkedMessage(msg.channel, `Top rest calls:\n\n${formatted.join("\n")}`);
  },
});
