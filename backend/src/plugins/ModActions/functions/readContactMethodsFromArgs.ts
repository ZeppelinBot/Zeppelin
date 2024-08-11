import { GuildTextBasedChannel } from "discord.js";
import { disableUserNotificationStrings, UserNotificationMethod } from "../../../utils.js";

export function readContactMethodsFromArgs(args: {
  notify?: string | null;
  "notify-channel"?: GuildTextBasedChannel | null;
}): null | UserNotificationMethod[] {
  if (args.notify) {
    if (args.notify === "dm") {
      return [{ type: "dm" }];
    } else if (args.notify === "channel") {
      if (!args["notify-channel"]) {
        throw new Error("No `-notify-channel` specified");
      }

      return [{ type: "channel", channel: args["notify-channel"] }];
    } else if (disableUserNotificationStrings.includes(args.notify)) {
      return [];
    } else {
      throw new Error("Unknown contact method");
    }
  }

  return null;
}
