import { disableUserNotificationStrings, UserNotificationMethod } from "../../../utils";
import { ERRORS, RecoverablePluginError } from "../../../RecoverablePluginError";
import { TextChannel } from "eris";
import { PluginData } from "knub";
import { AutomodPluginType } from "../types";

export function resolveActionContactMethods(
  pluginData: PluginData<AutomodPluginType>,
  actionConfig: {
    notify?: string;
    notifyChannel?: string;
  },
): UserNotificationMethod[] | null {
  if (actionConfig.notify === "dm") {
    return [{ type: "dm" }];
  } else if (actionConfig.notify === "channel") {
    if (!actionConfig.notifyChannel) {
      throw new RecoverablePluginError(ERRORS.NO_USER_NOTIFICATION_CHANNEL);
    }

    const channel = pluginData.guild.channels.get(actionConfig.notifyChannel);
    if (!(channel instanceof TextChannel)) {
      throw new RecoverablePluginError(ERRORS.INVALID_USER_NOTIFICATION_CHANNEL);
    }

    return [{ type: "channel", channel }];
  } else if (actionConfig.notify && disableUserNotificationStrings.includes(actionConfig.notify)) {
    return [];
  }

  return null;
}
