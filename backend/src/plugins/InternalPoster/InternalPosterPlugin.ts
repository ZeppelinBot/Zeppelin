import { PluginOptions } from "knub";
import { Webhooks } from "../../data/Webhooks";
import { makeIoTsConfigParser, mapToPublicFn } from "../../pluginUtils";
import { Queue } from "../../Queue";
import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { editMessage } from "./functions/editMessage";
import { sendMessage } from "./functions/sendMessage";
import { ConfigSchema, InternalPosterPluginType } from "./types";

const defaultOptions: PluginOptions<InternalPosterPluginType> = {
  config: {},
  overrides: [],
};

export const InternalPosterPlugin = zeppelinGuildPlugin<InternalPosterPluginType>()({
  name: "internal_poster",
  showInDocs: false,

  configParser: makeIoTsConfigParser(ConfigSchema),
  defaultOptions,

  // prettier-ignore
  public: {
    sendMessage: mapToPublicFn(sendMessage),
    editMessage: mapToPublicFn(editMessage),
  },

  async beforeLoad(pluginData) {
    const { state } = pluginData;

    state.webhooks = new Webhooks();
    state.queue = new Queue();
    state.missingPermissions = false;
    state.webhookClientCache = new Map();
  },
});
