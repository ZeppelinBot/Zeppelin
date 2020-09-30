import { GuildPluginData } from "knub";
import { SlowmodePluginType } from "../types";
import { GuildChannel, TextChannel } from "eris";

export async function clearBotSlowmodeFromUserId(
  pluginData: GuildPluginData<SlowmodePluginType>,
  channel: GuildChannel & TextChannel,
  userId: string,
  force = false,
) {
  try {
    // Remove permission overrides from the channel for this user
    // Previously we diffed the overrides so we could clear the "send messages" override without touching other
    // overrides. Unfortunately, it seems that was a bit buggy - we didn't always receive the event for the changed
    // overrides and then we also couldn't diff against them. For consistency's sake, we just delete the override now.
    await channel.deletePermission(userId);
  } catch (e) {
    if (!force) {
      throw e;
    }
  }

  await pluginData.state.slowmodes.clearSlowmodeUser(channel.id, userId);
}
