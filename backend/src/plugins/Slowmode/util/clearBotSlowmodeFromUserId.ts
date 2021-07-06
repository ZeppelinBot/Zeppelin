import { GuildChannel, Snowflake, TextChannel } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType";
import { SlowmodePluginType } from "../types";

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
    pluginData.state.serverLogs.ignoreLog(LogType.CHANNEL_UPDATE, channel.id, 3 * 1000);
    await channel.permissionOverwrites.resolve(userId as Snowflake)?.delete();
  } catch (e) {
    if (!force) {
      throw e;
    }
  }

  await pluginData.state.slowmodes.clearSlowmodeUser(channel.id, userId);
}
