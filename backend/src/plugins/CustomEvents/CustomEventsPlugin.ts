import { GuildChannel, GuildMember, User } from "discord.js";
import { guildPlugin, guildPluginMessageCommand, parseSignature } from "vety";
import { TSignature } from "knub-command-manager";
import { commandTypes } from "../../commandTypes.js";
import { TemplateSafeValueContainer, createTypedTemplateSafeValueContainer } from "../../templateFormatter.js";
import { UnknownUser } from "../../utils.js";
import { isScalar } from "../../utils/isScalar.js";
import {
  channelToTemplateSafeChannel,
  memberToTemplateSafeMember,
  messageToTemplateSafeMessage,
  userToTemplateSafeUser,
} from "../../utils/templateSafeObjects.js";
import { CommonPlugin } from "../Common/CommonPlugin.js";
import { LogsPlugin } from "../Logs/LogsPlugin.js";
import { runEvent } from "./functions/runEvent.js";
import { CustomEventsPluginType, zCustomEventsConfig } from "./types.js";

export const CustomEventsPlugin = guildPlugin<CustomEventsPluginType>()({
  name: "custom_events",

  dependencies: () => [LogsPlugin],
  configSchema: zCustomEventsConfig,

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
