import { GuildPluginData } from "knub";
import { ModActionsPluginType } from "../types";
import { UserNotificationMethod } from "../../../utils";

export function getDefaultContactMethods(
  pluginData: GuildPluginData<ModActionsPluginType>,
  type: "warn" | "kick" | "ban",
): UserNotificationMethod[] {
  const methods: UserNotificationMethod[] = [];
  const config = pluginData.config.get();

  if (config[`dm_on_${type}`]) {
    methods.push({ type: "dm" });
  }

  if (config[`message_on_${type}`] && config.message_channel) {
    const channel = pluginData.guild.channels.cache.get(config.message_channel);
    if (channel instanceof TextChannel) {
      methods.push({
        type: "channel",
        channel,
      });
    }
  }

  return methods;
}
