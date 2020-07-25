import { GuildChannel, TextChannel } from "eris";
import { PluginData } from "knub";
import { SlowmodePluginType } from "../types";
import { clearBotSlowmodeFromUserId } from "./clearBotSlowmodeFromUserId";

export async function disableBotSlowmodeForChannel(
  pluginData: PluginData<SlowmodePluginType>,
  channel: GuildChannel & TextChannel,
) {
  // Disable channel slowmode
  await pluginData.state.slowmodes.deleteChannelSlowmode(channel.id);

  // Remove currently applied slowmodes
  const users = await pluginData.state.slowmodes.getChannelSlowmodeUsers(channel.id);
  const failedUsers = [];

  for (const slowmodeUser of users) {
    try {
      await clearBotSlowmodeFromUserId(pluginData, channel, slowmodeUser.user_id);
    } catch (e) {
      // Removing the slowmode failed. Record this so the permissions can be changed manually, and remove the database entry.
      failedUsers.push(slowmodeUser.user_id);
      await pluginData.state.slowmodes.clearSlowmodeUser(channel.id, slowmodeUser.user_id);
    }
  }

  return { failedUsers };
}
