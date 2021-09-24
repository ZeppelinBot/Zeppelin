import { TextChannel } from "discord.js";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { createChunkedMessage, formatNumber, resolveInvite, sorter, verboseUserMention } from "../../../utils";
import { botControlCmd } from "../types";

export const PluginPerformanceCmd = botControlCmd({
  trigger: ["plugin_performance"],
  permission: "can_performance",

  signature: {},

  async run({ pluginData, message: msg, args }) {
    const stats = pluginData.getKnubInstance().getPluginPerformanceStats();
    const averageLoadTimeEntries = Object.entries(stats.averageLoadTimes);
    averageLoadTimeEntries.sort(sorter((v) => v[1].time, "DESC"));
    const lines = averageLoadTimeEntries.map(
      ([pluginName, { time }]) => `${pluginName}: **${formatNumber(Math.round(time))}ms**`,
    );
    const fullStats = `Average plugin load times:\n\n${lines.join("\n")}`;
    createChunkedMessage(msg.channel as TextChannel, fullStats);
  },
});
