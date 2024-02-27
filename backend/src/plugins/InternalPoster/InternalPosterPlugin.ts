import { PluginOptions } from "knub";
import z from "zod";
import { Queue } from "../../Queue";
import { Webhooks } from "../../data/Webhooks";
import { mapToPublicFn } from "../../pluginUtils";
import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { editMessage } from "./functions/editMessage";
import { sendMessage } from "./functions/sendMessage";
import { InternalPosterPluginType } from "./types";

const defaultOptions: PluginOptions<InternalPosterPluginType> = {
  config: {},
  overrides: [],
};

export const InternalPosterPlugin = zeppelinGuildPlugin<InternalPosterPluginType>()({
  name: "internal_poster",
  showInDocs: false,

  configParser: (input) => z.strictObject({}).parse(input),
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
