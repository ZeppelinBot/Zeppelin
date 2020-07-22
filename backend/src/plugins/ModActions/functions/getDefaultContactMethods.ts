import { PluginData } from "knub";
import { ModActionsPluginType } from "../types";
import { UserNotificationMethod } from "../../../utils";
import { TextChannel } from "eris";

export function getDefaultContactMethods(
  pluginData: PluginData<ModActionsPluginType>,
  type: "warn" | "kick" | "ban",
): UserNotificationMethod[] {
  const methods: UserNotificationMethod[] = [];
  const config = pluginData.config.get();

  if (config[`dm_on_${type}`]) {
    methods.push({ type: "dm" });
  }

  if (config[`message_on_${type}`] && config.message_channel) {
    const channel = pluginData.guild.channels.get(config.message_channel);
    if (channel instanceof TextChannel) {
      methods.push({
        type: "channel",
        channel,
      });
    }
  }

  return methods;
}
