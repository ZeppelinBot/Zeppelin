import { CaseTypes } from "../../data/CaseTypes";
import { Case } from "../../data/entities/Case";
import { GuildArchives } from "../../data/GuildArchives";
import { GuildCases } from "../../data/GuildCases";
import { GuildLogs } from "../../data/GuildLogs";
import { mapToPublicFn } from "../../pluginUtils";
import { trimPluginDescription } from "../../utils";
import { TimeAndDatePlugin } from "../TimeAndDate/TimeAndDatePlugin";
import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { createCase } from "./functions/createCase";
import { createCaseNote } from "./functions/createCaseNote";
import { getCaseEmbed } from "./functions/getCaseEmbed";
import { getCaseSummary } from "./functions/getCaseSummary";
import { getCaseTypeAmountForUserId } from "./functions/getCaseTypeAmountForUserId";
import { getRecentCasesByMod } from "./functions/getRecentCasesByMod";
import { getTotalCasesByMod } from "./functions/getTotalCasesByMod";
import { postCaseToCaseLogChannel } from "./functions/postToCaseLogChannel";
import { CaseArgs, CaseNoteArgs, CasesPluginType, ConfigSchema } from "./types";

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
