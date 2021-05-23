import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { CaseArgs, CaseNoteArgs, CasesPluginType, ConfigSchema } from "./types";
import { createCase } from "./functions/createCase";
import { GuildLogs } from "../../data/GuildLogs";
import { GuildArchives } from "../../data/GuildArchives";
import { GuildCases } from "../../data/GuildCases";
import { createCaseNote } from "./functions/createCaseNote";
import { Case } from "../../data/entities/Case";
import { postCaseToCaseLogChannel } from "./functions/postToCaseLogChannel";
import { CaseTypes } from "../../data/CaseTypes";
import { getCaseTypeAmountForUserId } from "./functions/getCaseTypeAmountForUserId";
import { getCaseEmbed } from "./functions/getCaseEmbed";
import { trimPluginDescription } from "../../utils";
import { getCaseSummary } from "./functions/getCaseSummary";
import { TimeAndDatePlugin } from "../TimeAndDate/TimeAndDatePlugin";
import { mapToPublicFn } from "../../pluginUtils";
import { getTotalCasesByMod } from "./functions/getTotalCasesByMod";
import { getRecentCasesByMod } from "./functions/getRecentCasesByMod";

const defaultOptions = {
  config: {
    log_automatic_actions: true,
    case_log_channel: null,
    show_relative_times: true,
    relative_time_cutoff: "7d",
    case_colors: null,
    case_icons: null,
  },
};

export const CasesPlugin = zeppelinGuildPlugin<CasesPluginType>()({
  name: "cases",
  showInDocs: true,
  info: {
    prettyName: "Cases",
    description: trimPluginDescription(`
      This plugin contains basic configuration for cases created by other plugins
    `),
  },

  dependencies: [TimeAndDatePlugin],
  configSchema: ConfigSchema,
  defaultOptions,

  public: {
    createCase(pluginData) {
      return (args: CaseArgs) => {
        return createCase(pluginData, args);
      };
    },

    createCaseNote(pluginData) {
      return (args: CaseNoteArgs) => {
        return createCaseNote(pluginData, args);
      };
    },

    postCaseToCaseLogChannel(pluginData) {
      return (caseOrCaseId: Case | number) => {
        return postCaseToCaseLogChannel(pluginData, caseOrCaseId);
      };
    },

    getCaseTypeAmountForUserId(pluginData) {
      return (userID: string, type: CaseTypes) => {
        return getCaseTypeAmountForUserId(pluginData, userID, type);
      };
    },

    getTotalCasesByMod: mapToPublicFn(getTotalCasesByMod),
    getRecentCasesByMod: mapToPublicFn(getRecentCasesByMod),

    getCaseEmbed: mapToPublicFn(getCaseEmbed),
    getCaseSummary: mapToPublicFn(getCaseSummary),
  },

  afterLoad(pluginData) {
    pluginData.state.logs = new GuildLogs(pluginData.guild.id);
    pluginData.state.archives = GuildArchives.getGuildInstance(pluginData.guild.id);
    pluginData.state.cases = GuildCases.getGuildInstance(pluginData.guild.id);
  },
});
