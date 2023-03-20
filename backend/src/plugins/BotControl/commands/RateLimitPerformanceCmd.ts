import moment from "moment-timezone";
import { GuildArchives } from "../../../data/GuildArchives";
import { getBaseUrl, sendSuccessMessage } from "../../../pluginUtils";
import { getRateLimitStats } from "../../../rateLimitStats";
import { botControlCmd } from "../types";

export const RateLimitPerformanceCmd = botControlCmd({
  trigger: ["rate_limit_performance"],
  permission: "can_performance",

  signature: {},

  async run({ pluginData, message: msg, args }) {
    const logItems = getRateLimitStats();
    if (logItems.length === 0) {
      sendSuccessMessage(pluginData, msg.channel, `No rate limits hit`);
      return;
    }

    logItems.reverse();
    const formatted = logItems.map((item) => {
      const formattedTime = moment.utc(item.timestamp).format("YYYY-MM-DD HH:mm:ss.SSS");
      const items: string[] = [`[${formattedTime}]`];
      if (item.data.global) items.push("GLOBAL");
      items.push(item.data.method.toUpperCase());
      items.push(item.data.route);
      items.push(`stalled for ${item.data.timeToReset}ms`);
      items.push(`(max requests ${item.data.limit})`);
      return items.join(" ");
    });

    const fullText = `Last ${logItems.length} rate limits hit:\n\n${formatted.join("\n")}`;

    const archives = GuildArchives.getGuildInstance("0");
    const archiveId = await archives.create(fullText, moment().add(1, "hour"));
    const archiveUrl = archives.getUrl(getBaseUrl(pluginData), archiveId);
    msg.channel.send(`Link: ${archiveUrl}`);
  },
});
