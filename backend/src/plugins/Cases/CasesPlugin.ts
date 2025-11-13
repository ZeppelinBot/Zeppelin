import { guildPlugin } from "vety";
import { GuildArchives } from "../../data/GuildArchives.js";
import { GuildCases } from "../../data/GuildCases.js";
import { GuildLogs } from "../../data/GuildLogs.js";
import { makePublicFn } from "../../pluginUtils.js";
import { InternalPosterPlugin } from "../InternalPoster/InternalPosterPlugin.js";
import { TimeAndDatePlugin } from "../TimeAndDate/TimeAndDatePlugin.js";
import { createCase } from "./functions/createCase.js";
import { createCaseNote } from "./functions/createCaseNote.js";
import { getCaseEmbed } from "./functions/getCaseEmbed.js";
import { getCaseSummary } from "./functions/getCaseSummary.js";
import { getCaseTypeAmountForUserId } from "./functions/getCaseTypeAmountForUserId.js";
import { getRecentCasesByMod } from "./functions/getRecentCasesByMod.js";
import { getTotalCasesByMod } from "./functions/getTotalCasesByMod.js";
import { postCaseToCaseLogChannel } from "./functions/postToCaseLogChannel.js";
import { CasesPluginType, zCasesConfig } from "./types.js";

// The `any` cast here is to prevent TypeScript from locking up from the circular dependency
function getLogsPlugin(): Promise<any> {
  return import("../Logs/LogsPlugin.js") as Promise<any>;
}

export const CasesPlugin = guildPlugin<CasesPluginType>()({
  name: "cases",

  dependencies: async () => [TimeAndDatePlugin, InternalPosterPlugin, (await getLogsPlugin()).LogsPlugin],
  configSchema: zCasesConfig,

  public(pluginData) {
    return {
      createCase: makePublicFn(pluginData, createCase),
      createCaseNote: makePublicFn(pluginData, createCaseNote),
      postCaseToCaseLogChannel: makePublicFn(pluginData, postCaseToCaseLogChannel),
      getCaseTypeAmountForUserId: makePublicFn(pluginData, getCaseTypeAmountForUserId),
      getTotalCasesByMod: makePublicFn(pluginData, getTotalCasesByMod),
      getRecentCasesByMod: makePublicFn(pluginData, getRecentCasesByMod),
      getCaseEmbed: makePublicFn(pluginData, getCaseEmbed),
      getCaseSummary: makePublicFn(pluginData, getCaseSummary),
    };
  },

  afterLoad(pluginData) {
    const { state, guild } = pluginData;

    state.logs = new GuildLogs(pluginData.guild.id);
    state.archives = GuildArchives.getGuildInstance(guild.id);
    state.cases = GuildCases.getGuildInstance(guild.id);
  },
});
