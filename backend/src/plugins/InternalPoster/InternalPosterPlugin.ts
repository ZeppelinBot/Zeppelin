import { PluginOptions, typedGuildCommand } from "knub";
import { GuildPingableRoles } from "../../data/GuildPingableRoles";
import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { ConfigSchema, InternalPosterPluginType } from "./types";
import {
  getPhishermanDomainInfo,
  hasPhishermanMasterAPIKey,
  phishermanApiKeyIsValid,
  reportTrackedDomainsToPhisherman,
} from "../../data/Phisherman";
import { mapToPublicFn } from "../../pluginUtils";
import { Webhooks } from "../../data/Webhooks";
import { Queue } from "../../Queue";
import { sendMessage } from "./functions/sendMessage";
import { editMessage } from "./functions/editMessage";

const defaultOptions: PluginOptions<InternalPosterPluginType> = {
  config: {},
  overrides: [],
};

export const InternalPosterPlugin = zeppelinGuildPlugin<InternalPosterPluginType>()({
  name: "internal_poster",
  showInDocs: false,

  configSchema: ConfigSchema,
  defaultOptions,

  // prettier-ignore
  public: {
    sendMessage: mapToPublicFn(sendMessage),
    editMessage: mapToPublicFn(editMessage),
  },

  async beforeLoad(pluginData) {
    pluginData.state.webhooks = new Webhooks();
    pluginData.state.queue = new Queue();
    pluginData.state.missingPermissions = false;
    pluginData.state.webhookClientCache = new Map();
  },
});
