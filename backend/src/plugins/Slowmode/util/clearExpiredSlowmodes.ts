import { GuildChannel, Snowflake, TextChannel } from "discord.js";
import { GuildPluginData } from "knub";
import { logger } from "../../../logger";
import { UnknownUser, verboseChannelMention, verboseUserMention } from "../../../utils";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { SlowmodePluginType } from "../types";
import { clearBotSlowmodeFromUserId } from "./clearBotSlowmodeFromUserId";

export async function clearExpiredSlowmodes(pluginData: GuildPluginData<SlowmodePluginType>) {
  const expiredSlowmodeUsers = await pluginData.state.slowmodes.getExpiredSlowmodeUsers();
  for (const user of expiredSlowmodeUsers) {
    const channel = pluginData.guild.channels.cache.get(user.channel_id as Snowflake);
    if (!channel) {
      await pluginData.state.slowmodes.clearSlowmodeUser(user.channel_id, user.user_id);
      continue;
    }

    try {
      await clearBotSlowmodeFromUserId(pluginData, channel as GuildChannel & TextChannel, user.user_id);
    } catch (e) {
      logger.error(e);

      const realUser = await pluginData.client
        .users!.fetch(user.user_id as Snowflake)
        .catch(() => new UnknownUser({ id: user.user_id }));

      pluginData.getPlugin(LogsPlugin).logBotAlert({
        body: `Failed to clear slowmode permissions from ${verboseUserMention(
          await realUser,
        )} in ${verboseChannelMention(channel)}`,
      });
    }
  }
}
