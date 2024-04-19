import { PluginOptions, guildPlugin } from "knub";
import { hasPhishermanMasterAPIKey, phishermanApiKeyIsValid } from "../../data/Phisherman";
import { makePublicFn } from "../../pluginUtils";
import { getDomainInfo } from "./functions/getDomainInfo";
import { PhishermanPluginType, zPhishermanConfig } from "./types";

const defaultOptions: PluginOptions<PhishermanPluginType> = {
  config: {
    api_key: null,
  },
  overrides: [],
};

export const PhishermanPlugin = guildPlugin<PhishermanPluginType>()({
  name: "phisherman",

  configParser: (input) => zPhishermanConfig.parse(input),
  defaultOptions,

  public(pluginData) {
    return {
      getDomainInfo: makePublicFn(pluginData, getDomainInfo),
    };
  },

  async beforeLoad(pluginData) {
    const { state } = pluginData;

    pluginData.state.validApiKey = null;

    if (!hasPhishermanMasterAPIKey()) {
      // tslint:disable-next-line:no-console
      console.warn("[PHISHERMAN] Could not load Phisherman plugin: master API key is missing");
      return;
    }

    const apiKey = pluginData.config.get().api_key;
    if (apiKey) {
      const isValid = await phishermanApiKeyIsValid(apiKey).catch((err) => {
        // tslint:disable-next-line:no-console
        console.warn(`[PHISHERMAN] Error checking user API key validity:\n${err.toString()}`);
        return false;
      });
      if (isValid) {
        state.validApiKey = apiKey;
      }
    }
  },
});
