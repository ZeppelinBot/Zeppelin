import moment from "moment-timezone";
import { GuildArchives } from "../../../data/GuildArchives.js";
import { getDebugCounterValues } from "../../../debugCounters.js";
import { getBaseUrl } from "../../../pluginUtils.js";
import { botControlCmd } from "../types.js";

type SortableDebugCounter = {
  name: string;
  count: number;
};

export const DebugCountersCmd = botControlCmd({
  trigger: ["debug_counters"],
  permission: "can_performance",

  signature: {},

  async run({ pluginData, message: msg }) {
    const debugCounterValueMap = getDebugCounterValues();
    const sortableDebugCounters: SortableDebugCounter[] = [];
    for (const [name, value] of debugCounterValueMap) {
      sortableDebugCounters.push({ name, count: value.count });
    }

    sortableDebugCounters.sort((a, b) => b.count - a.count);

    const archives = GuildArchives.getGuildInstance("0");
    const archiveId = await archives.create(JSON.stringify(sortableDebugCounters, null, 2), moment().add(1, "hour"));
    const archiveUrl = archives.getUrl(getBaseUrl(pluginData), archiveId);
    msg.channel.send(`Link: ${archiveUrl}`);
  },
});
//
