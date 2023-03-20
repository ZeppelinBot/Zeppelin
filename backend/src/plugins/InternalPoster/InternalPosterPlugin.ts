import { PluginOptions } from "knub";
import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { ConfigSchema, InternalPosterPluginType } from "./types";
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
    const { state } = pluginData;

    state.webhooks = new Webhooks();
    state.queue = new Queue();
    state.missingPermissions = false;
    state.webhookClientCache = new Map();
  },

  // FIXME: Proper inherittance from ZeppelinPluginBlueprint
  configParser: (o: any) => o,
});
