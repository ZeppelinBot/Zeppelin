import { parseSignature, typedGuildCommand } from "knub";
import { commandTypes } from "../../commandTypes";
import { stripObjectToScalars, UnknownUser } from "../../utils";
import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { runEvent } from "./functions/runEvent";
import { ConfigSchema, CustomEventsPluginType } from "./types";
import { createTypedTemplateSafeValueContainer, TemplateSafeValueContainer } from "../../templateFormatter";
import { Channel, GuildChannel, GuildMember, ThreadChannel, User } from "discord.js";
import {
  channelToTemplateSafeChannel,
  memberToTemplateSafeMember,
  messageToTemplateSafeMessage,
  userToTemplateSafeUser,
} from "../../utils/templateSafeObjects";
import { isScalar } from "../../utils/isScalar";

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
            const safeArgs = new TemplateSafeValueContainer();
            for (const [argKey, argValue] of Object.entries(args as Record<string, unknown>)) {
              if (argValue instanceof User || argValue instanceof UnknownUser) {
                safeArgs[argKey] = userToTemplateSafeUser(argValue);
              } else if (argValue instanceof GuildMember) {
                safeArgs[argKey] = memberToTemplateSafeMember(argValue);
              } else if (argValue instanceof GuildChannel || argValue instanceof ThreadChannel) {
                safeArgs[argKey] = channelToTemplateSafeChannel(argValue);
              } else if (isScalar(argValue)) {
                safeArgs[argKey] = argValue;
              }
            }

            const values = createTypedTemplateSafeValueContainer({
              ...safeArgs,
              msg: messageToTemplateSafeMessage(message),
            });

            runEvent(pluginData, event, { msg: message, args }, values);
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
