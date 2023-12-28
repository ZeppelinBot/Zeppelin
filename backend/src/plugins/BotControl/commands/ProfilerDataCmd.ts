import moment from "moment-timezone";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { GuildArchives } from "../../../data/GuildArchives";
import { getBaseUrl } from "../../../pluginUtils";
import { sorter } from "../../../utils";
import { botControlCmd } from "../types";

const sortProps = {
  totalTime: "TOTAL TIME",
  averageTime: "AVERAGE TIME",
  count: "SAMPLES",
};

export const ProfilerDataCmd = botControlCmd({
  trigger: ["profiler_data"],
  permission: "can_performance",

  signature: {
    filter: ct.string({ required: false }),
    sort: ct.string({ option: true, required: false }),
  },

  async run({ pluginData, message: msg, args }) {
    if (args.sort === "samples") {
      args.sort = "count";
    }
    const sortProp = args.sort && sortProps[args.sort] ? args.sort : "totalTime";

    const headerInfoItems = [`sorted by ${sortProps[sortProp]}`];

    const profilerData = pluginData.getKnubInstance().profiler.getData();
    let entries = Object.entries(profilerData);
    entries.sort(sorter((entry) => entry[1][sortProp], "DESC"));

    if (args.filter) {
      entries = entries.filter(([key]) => key.includes(args.filter));
      headerInfoItems.push(`matching "${args.filter}"`);
    }

    const formattedEntries = entries.map(([key, data]) => {
      const dataLines = [
        ["Total time", `${Math.round(data.totalTime)} ms`],
        ["Average time", `${Math.round(data.averageTime)} ms`],
        ["Samples", data.count],
      ];
      return `${key}\n${dataLines.map((v) => `  ${v[0]}: ${v[1]}`).join("\n")}`;
    });
    const formatted = `Profiler data, ${headerInfoItems.join(", ")}:\n\n${formattedEntries.join("\n\n")}`;

    const archives = GuildArchives.getGuildInstance("0");
    const archiveId = await archives.create(formatted, moment().add(1, "hour"));
    const archiveUrl = archives.getUrl(getBaseUrl(pluginData), archiveId);

    msg.channel.send(`Link: ${archiveUrl}`);
  },
});
