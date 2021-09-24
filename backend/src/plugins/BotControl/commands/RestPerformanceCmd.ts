import { TextChannel } from "discord.js";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { createChunkedMessage, formatNumber, resolveInvite, sorter, verboseUserMention } from "../../../utils";
import { botControlCmd } from "../types";
import { getTopRestCallStats } from "../../../restCallStats";

const leadingPathRegex = /(?<=\().+\/backend\//g;

export const RestPerformanceCmd = botControlCmd({
  trigger: ["rest_performance"],
  permission: "can_performance",

  signature: {
    count: ct.number({ required: false }),
  },

  async run({ pluginData, message: msg, args }) {
    const count = Math.max(1, Math.min(25, args.count || 5));
    const stats = getTopRestCallStats(count);
    const formatted = stats.map((callStats) => {
      const cleanSource = callStats.source.replace(leadingPathRegex, "");
      return `**${callStats.count} calls**\n${callStats.method.toUpperCase()} ${callStats.path}\n${cleanSource}`;
    });
    createChunkedMessage(msg.channel as TextChannel, formatted.join("\n"));
  },
});
