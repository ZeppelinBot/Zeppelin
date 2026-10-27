import z from "zod";
import { availableGlobalPlugins, availableGuildPlugins } from "./plugins/availablePlugins.js";
import { ZeppelinPluginDocs } from "./types.js";
import { writeFileSync } from "node:fs";
import { GlobalPluginBlueprint, GuildPluginBlueprint } from "vety";

import type { ZeppelinPluginDocsData, ZeppelinDocsData } from "@zeppelinbot/shared/docsDataTypes.js";

const outputPath = process.argv[2];
if (!outputPath) {
  console.error("Output dir required");
  process.exit(1);
}

function pluginToDocsData(plugin: GuildPluginBlueprint<any, any> | GlobalPluginBlueprint<any, any>, docs: ZeppelinPluginDocs): ZeppelinPluginDocsData {
  return {
    name: plugin.name,
    prettyName: docs.prettyName ?? plugin.name,
    type: docs.type,
    description: docs.description,
    usageGuide: docs.usageGuide,
    configurationGuide: docs.configurationGuide,
    configJsonSchema: z.toJSONSchema(docs.configSchema, { io: "input", cycles: "ref" }),
  };
}

const docsData: ZeppelinDocsData = {
  guildPlugins: availableGuildPlugins.map(({ plugin, docs }) => pluginToDocsData(plugin, docs)),
  globalPlugins: availableGlobalPlugins.map(({ plugin, docs }) => pluginToDocsData(plugin, docs)),
};

writeFileSync(outputPath, JSON.stringify(docsData), { encoding: "utf8" });

process.exit(0);
