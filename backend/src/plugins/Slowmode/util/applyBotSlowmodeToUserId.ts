import { GuildChannel, Snowflake, TextChannel } from "discord.js";
import { GuildPluginData } from "knub";
import { channelToTemplateSafeChannel, userToTemplateSafeUser } from "../../../utils/templateSafeObjects";
import { LogType } from "../../../data/LogType";
import { logger } from "../../../logger";
import { isDiscordAPIError, UnknownUser, verboseChannelMention, verboseUserMention } from "../../../utils";
import { SlowmodePluginType } from "../types";
import { LogsPlugin } from "../../Logs/LogsPlugin";

export async function applyBotSlowmodeToUserId(
  pluginData: GuildPluginData<SlowmodePluginType>,
  channel: GuildChannel & TextChannel,
  userId: string,
) {
  // Deny sendMessage permission from the user. If there are existing permission overwrites, take those into account.
  const existingOverride = channel.permissionOverwrites?.resolve(userId as Snowflake);
  try {
    pluginData.state.serverLogs.ignoreLog(LogType.CHANNEL_UPDATE, channel.id, 5 * 1000);
    if (existingOverride) {
      await existingOverride.edit({ SEND_MESSAGES: false });
    } else {
      await channel.permissionOverwrites?.create(userId as Snowflake, { SEND_MESSAGES: false }, { type: 1 });
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
