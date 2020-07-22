import { zeppelinPlugin } from "../ZeppelinPluginBlueprint";
import { CaseArgs, CaseNoteArgs, CasesPluginType, ConfigSchema } from "./types";
import { resolveUser } from "../../utils";
import { createCase } from "./functions/createCase";
import { GuildLogs } from "../../data/GuildLogs";
import { GuildArchives } from "../../data/GuildArchives";
import { GuildCases } from "../../data/GuildCases";
import { createCaseNote } from "./functions/createCaseNote";
import { Case } from "../../data/entities/Case";
import { postCaseToCaseLogChannel } from "./functions/postToCaseLogChannel";

const defaultOptions = {
  config: {
    log_automatic_actions: true,
    case_log_channel: null,
  },
};

export const CasesPlugin = zeppelinPlugin<CasesPluginType>()("cases", {
  configSchema: ConfigSchema,
  defaultOptions,

  public: {
    createCase(pluginData) {
      return async (args: CaseArgs) => {
        return createCase(pluginData, args);
      };
    },

    createCaseNote(pluginData) {
      return async (args: CaseNoteArgs) => {
        return createCaseNote(pluginData, args);
      };
    },

    postCaseToCaseLogChannel(pluginData) {
      return async (caseOrCaseId: Case | number) => {
        return postCaseToCaseLogChannel(pluginData, caseOrCaseId);
      };
    },
  },

  onLoad(pluginData) {
    pluginData.state.logs = new GuildLogs(pluginData.guild.id);
    pluginData.state.archives = GuildArchives.getGuildInstance(pluginData.guild.id);
    pluginData.state.cases = GuildCases.getGuildInstance(pluginData.guild.id);
  },
});
