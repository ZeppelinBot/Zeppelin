import { guildPlugin } from "vety";
import { Queue } from "../../Queue.js";
import { Webhooks } from "../../data/Webhooks.js";
import { makePublicFn } from "../../pluginUtils.js";
import { editMessage } from "./functions/editMessage.js";
import { sendMessage } from "./functions/sendMessage.js";
import { InternalPosterPluginType, zInternalPosterConfig } from "./types.js";

export const InternalPosterPlugin = guildPlugin<InternalPosterPluginType>()({
  name: "internal_poster",

  configSchema: zInternalPosterConfig,

  public(pluginData) {
    return {
      sendMessage: makePublicFn(pluginData, sendMessage),
      editMessage: makePublicFn(pluginData, editMessage),
    };
  },

  async beforeLoad(pluginData) {
    const { state } = pluginData;

    state.webhooks = new Webhooks();
    state.queue = new Queue();
    state.missingPermissions = false;
    state.webhookClientCache = new Map();
  },
});
