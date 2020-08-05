import { zeppelinPlugin } from "../ZeppelinPluginBlueprint";
import { ConfigSchema, CustomEventsPluginType } from "./types";
import { command, parseSignature } from "knub";
import { commandTypes } from "../../commandTypes";
import { stripObjectToScalars } from "../../utils";
import { runEvent } from "./functions/runEvent";

const defaultOptions = {
  config: {
    events: {},
  },
};

export const CustomEventsPlugin = zeppelinPlugin<CustomEventsPluginType>()("custom_events", {
  showInDocs: false,

  configSchema: ConfigSchema,
  defaultOptions,

  onLoad(pluginData) {
    const config = pluginData.config.get();
    for (const [key, event] of Object.entries(config.events)) {
      if (event.trigger.type === "command") {
        const signature = event.trigger.params ? parseSignature(event.trigger.params, commandTypes) : {};
        const eventCommand = command({
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

  onUnload() {
    // TODO: Run clearTriggers() once we actually have something there
  },
});
