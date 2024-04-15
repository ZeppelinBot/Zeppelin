import { GuildChannel, GuildMember, User } from "discord.js";
import { guildPlugin, guildPluginMessageCommand, parseSignature } from "knub";
import { TSignature } from "knub-command-manager";
import { commandTypes } from "../../commandTypes";
import { TemplateSafeValueContainer, createTypedTemplateSafeValueContainer } from "../../templateFormatter";
import { UnknownUser } from "../../utils";
import { isScalar } from "../../utils/isScalar";
import {
  channelToTemplateSafeChannel,
  memberToTemplateSafeMember,
  messageToTemplateSafeMessage,
  userToTemplateSafeUser,
} from "../../utils/templateSafeObjects";
import { LogsPlugin } from "../Logs/LogsPlugin";
import { runEvent } from "./functions/runEvent";
import { CustomEventsPluginType, zCustomEventsConfig } from "./types";
import { CommonPlugin } from "../Common/CommonPlugin";

const defaultOptions = {
  config: {
    events: {},
  },
};

export const CustomEventsPlugin = guildPlugin<CustomEventsPluginType>()({
  name: "custom_events",

  dependencies: () => [LogsPlugin],
  configParser: (input) => zCustomEventsConfig.parse(input),
  defaultOptions,

  beforeStart(pluginData) {
    pluginData.state.common = pluginData.getPlugin(CommonPlugin);
  },

  afterLoad(pluginData) {
    const config = pluginData.config.get();
    for (const [key, event] of Object.entries(config.events)) {
      if (event.trigger.type === "command") {
        const signature: TSignature<any> = event.trigger.params
          ? parseSignature(event.trigger.params, commandTypes)
          : {};
        const eventCommand = guildPluginMessageCommand<CustomEventsPluginType>()({
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
              } else if (argValue instanceof GuildChannel && argValue.isTextBased()) {
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
        pluginData.messageCommands.add(eventCommand);
      }
    }
  },

  beforeUnload() {
    // TODO: Run clearTriggers() once we actually have something there
  },
});
