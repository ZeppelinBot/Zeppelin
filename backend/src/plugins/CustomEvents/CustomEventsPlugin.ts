import { parseSignature, typedGuildCommand } from "knub";
import { commandTypes } from "../../commandTypes";
import { stripObjectToScalars } from "../../utils";
import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { runEvent } from "./functions/runEvent";
import { ConfigSchema, CustomEventsPluginType } from "./types";

const defaultOptions = {
  config: {
    events: {},
  },
};

export const CustomEventsPlugin = zeppelinGuildPlugin<CustomEventsPluginType>()({
  name: "custom_events",
  showInDocs: false,

  configSchema: ConfigSchema,
  defaultOptions,

  afterLoad(pluginData) {
    const config = pluginData.config.get();
    for (const [key, event] of Object.entries(config.events)) {
      if (event.trigger.type === "command") {
        const signature = event.trigger.params ? parseSignature(event.trigger.params, commandTypes) : {};
        const eventCommand = typedGuildCommand({
          trigger: event.trigger.name,
          permission: `events.${key}.trigger.can_use`,
          signature,
          run({ message, args }) {
            const strippedMsg = stripObjectToScalars(message, ["channel", "author"]);
            runEvent(pluginData, event, { msg: message, args }, { args, msg: strippedMsg });
          },
        });
        pluginData.commands.add(eventCommand);
      }
    }
  },

  beforeUnload() {
    // TODO: Run clearTriggers() once we actually have something there
  },
});
