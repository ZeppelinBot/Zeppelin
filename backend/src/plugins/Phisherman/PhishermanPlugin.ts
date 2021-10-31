import { PluginOptions, typedGuildCommand } from "knub";
import { GuildPingableRoles } from "../../data/GuildPingableRoles";
import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { ConfigSchema, PhishermanPluginType } from "./types";
import {
  getPhishermanDomainInfo,
  hasPhishermanMasterAPIKey,
  phishermanApiKeyIsValid,
  reportTrackedDomainsToPhisherman,
} from "../../data/Phisherman";
import { mapToPublicFn } from "../../pluginUtils";
import { getDomainInfo } from "./functions/getDomainInfo";
import { pluginInfo } from "./info";

const defaultOptions: PluginOptions<PhishermanPluginType> = {
  config: {
    api_key: null,
  },
  overrides: [],
};

export const PhishermanPlugin = zeppelinGuildPlugin<PhishermanPluginType>()({
  name: "phisherman",
  showInDocs: true,
  info: pluginInfo,

  configSchema: ConfigSchema,
  defaultOptions,

  // prettier-ignore
  public: {
    getDomainInfo: mapToPublicFn(getDomainInfo),
  },

  async beforeLoad(pluginData) {
    pluginData.state.validApiKey = null;

    if (!hasPhishermanMasterAPIKey()) {
      // tslint:disable-next-line:no-console
      console.warn("Could not load Phisherman plugin: master API key is missing");
      return;
    }

    const apiKey = pluginData.config.get().api_key;
    if (apiKey && (await phishermanApiKeyIsValid(apiKey).catch(() => false))) {
      pluginData.state.validApiKey = apiKey;
    }
  },
});
