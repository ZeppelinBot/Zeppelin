import { PluginOptions, guildPlugin } from "knub";
import z from "zod/v4";
import { Queue } from "../../Queue.js";
import { Webhooks } from "../../data/Webhooks.js";
import { makePublicFn } from "../../pluginUtils.js";
import { editMessage } from "./functions/editMessage.js";
import { sendMessage } from "./functions/sendMessage.js";
import { InternalPosterPluginType } from "./types.js";

const defaultOptions: PluginOptions<InternalPosterPluginType> = {
  config: {},
  overrides: [],
};

export const InternalPosterPlugin = guildPlugin<InternalPosterPluginType>()({
  name: "internal_poster",

  configParser: (input) => z.strictObject({}).parse(input),
  defaultOptions,

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
