import { PluginData } from "knub";
import { SlowmodePluginType } from "../types";
import { LogType } from "src/data/LogType";
import { logger } from "src/logger";
import { GuildChannel, TextChannel } from "eris";
import { UnknownUser, stripObjectToScalars } from "src/utils";
import { clearBotSlowmodeFromUserId } from "./clearBotSlowmodeFromUserId";

export async function clearExpiredSlowmodes(pluginData: PluginData<SlowmodePluginType>) {
  const expiredSlowmodeUsers = await pluginData.state.slowmodes.getExpiredSlowmodeUsers();
  for (const user of expiredSlowmodeUsers) {
    const channel = pluginData.guild.channels.get(user.channel_id);
    if (!channel) {
      await pluginData.state.slowmodes.clearSlowmodeUser(user.channel_id, user.user_id);
      continue;
    }

    try {
      await clearBotSlowmodeFromUserId(pluginData, channel as GuildChannel & TextChannel, user.user_id);
    } catch (e) {
      logger.error(e);

      const realUser = pluginData.client.users.get(user.user_id) || new UnknownUser({ id: user.user_id });
      pluginData.state.logs.log(LogType.BOT_ALERT, {
        body: `Failed to clear slowmode permissions from {userMention(user)} in {channelMention(channel)}`,
        user: stripObjectToScalars(realUser),
        channel: stripObjectToScalars(channel),
      });
    }
  }
}
