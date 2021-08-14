import { Snowflake, TextChannel } from "discord.js";
import { GuildPluginData } from "knub";
import { UserNotificationMethod } from "../../../utils";
import { ModActionsPluginType } from "../types";

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
    const channel = pluginData.guild.channels.cache.get(config.message_channel as Snowflake);
    if (channel instanceof TextChannel) {
      methods.push({
        type: "channel",
        channel,
      });
    }
  }

  return methods;
}
