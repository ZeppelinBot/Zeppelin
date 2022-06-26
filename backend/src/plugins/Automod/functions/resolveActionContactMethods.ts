import { Snowflake, TextChannel, ThreadChannel } from "discord.js";
import { GuildPluginData } from "knub";
import { ERRORS, RecoverablePluginError } from "../../../RecoverablePluginError";
import { disableUserNotificationStrings, UserNotificationMethod } from "../../../utils";
import { AutomodPluginType } from "../types";

export function resolveActionContactMethods(
  pluginData: GuildPluginData<AutomodPluginType>,
  actionConfig: {
    notify?: string | null;
    notifyChannel?: string | null;
  },
): UserNotificationMethod[] {
  if (actionConfig.notify === "dm") {
    return [{ type: "dm" }];
  } else if (actionConfig.notify === "channel") {
    if (!actionConfig.notifyChannel) {
      throw new RecoverablePluginError(ERRORS.NO_USER_NOTIFICATION_CHANNEL);
    }

    const channel = pluginData.guild.channels.cache.get(actionConfig.notifyChannel as Snowflake);
    if (!channel?.isText()) {
      throw new RecoverablePluginError(ERRORS.INVALID_USER_NOTIFICATION_CHANNEL);
    }

    return [{ type: "channel", channel }];
  } else if (actionConfig.notify && disableUserNotificationStrings.includes(actionConfig.notify)) {
    return [];
  }

  return [];
}
