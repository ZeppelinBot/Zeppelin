import { PluginOptions, guildPlugin } from "knub";
import z from "zod";
import { Queue } from "../../Queue";
import { Webhooks } from "../../data/Webhooks";
import { makePublicFn } from "../../pluginUtils";
import { editMessage } from "./functions/editMessage";
import { sendMessage } from "./functions/sendMessage";
import { InternalPosterPluginType } from "./types";

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
