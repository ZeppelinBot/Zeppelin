import { GuildTextBasedChannel, Snowflake } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType";
import { logger } from "../../../logger";
import { isDiscordAPIError, UnknownUser, verboseChannelMention, verboseUserMention } from "../../../utils";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { SlowmodePluginType } from "../types";

export async function applyBotSlowmodeToUserId(
  pluginData: GuildPluginData<SlowmodePluginType>,
  channel: GuildTextBasedChannel,
  userId: string,
) {
  // FIXME: Is there a better way to do this?
  if (channel.isThread()) return;

  // Deny sendMessage permission from the user. If there are existing permission overwrites, take those into account.
  const existingOverride = channel.permissionOverwrites?.resolve(userId as Snowflake);
  try {
    pluginData.state.serverLogs.ignoreLog(LogType.CHANNEL_UPDATE, channel.id, 5 * 1000);
    if (existingOverride) {
      await existingOverride.edit({ SendMessages: false });
    } else {
      await channel.permissionOverwrites?.create(userId as Snowflake, { SendMessages: false }, { type: 1 });
    }
  } catch (e) {
    const user = await pluginData.client.users.fetch(userId as Snowflake).catch(() => new UnknownUser({ id: userId }));

    if (isDiscordAPIError(e) && e.code === 50013) {
      logger.warn(
        `Missing permissions to apply bot slowmode to user ${userId} on channel ${channel.name} (${channel.id}) on server ${pluginData.guild.name} (${pluginData.guild.id})`,
      );
      pluginData.getPlugin(LogsPlugin).logBotAlert({
        body: `Missing permissions to apply bot slowmode to ${verboseUserMention(user)} in ${verboseChannelMention(
          channel,
        )}`,
      });
    } else {
      pluginData.getPlugin(LogsPlugin).logBotAlert({
        body: `Failed to apply bot slowmode to ${verboseUserMention(user)} in ${verboseChannelMention(channel)}`,
      });
      throw e;
    }
  }

  await pluginData.state.slowmodes.addSlowmodeUser(channel.id, userId);
}
