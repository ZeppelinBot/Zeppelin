import { Permissions, Snowflake, StageChannel, TextChannel, VoiceChannel } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType";
import { isDiscordAPIError, MINUTES } from "../../../utils";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { CompanionChannelsPluginType, TCompanionChannelOpts } from "../types";
import { getCompanionChannelOptsForVoiceChannelId } from "./getCompanionChannelOptsForVoiceChannelId";

const ERROR_COOLDOWN_KEY = "errorCooldown";
const ERROR_COOLDOWN = 5 * MINUTES;

export async function handleCompanionPermissions(
  pluginData: GuildPluginData<CompanionChannelsPluginType>,
  userId: string,
  voiceChannel: VoiceChannel | StageChannel | null,
  oldChannel?: VoiceChannel | StageChannel | null,
) {
  if (pluginData.state.errorCooldownManager.isOnCooldown(ERROR_COOLDOWN_KEY)) {
    return;
  }

  const permsToDelete: Set<string> = new Set(); // channelId[]
  const oldPerms: Map<string, number> = new Map(); // channelId => permissions
  const permsToSet: Map<string, number> = new Map(); // channelId => permissions

  const oldChannelOptsArr: TCompanionChannelOpts[] = oldChannel
    ? await getCompanionChannelOptsForVoiceChannelId(pluginData, userId, oldChannel)
    : [];
  const newChannelOptsArr: TCompanionChannelOpts[] = voiceChannel
    ? await getCompanionChannelOptsForVoiceChannelId(pluginData, userId, voiceChannel)
    : [];

  for (const oldChannelOpts of oldChannelOptsArr) {
    for (const channelId of oldChannelOpts.text_channel_ids) {
      oldPerms.set(channelId, oldChannelOpts.permissions);
      permsToDelete.add(channelId);
    }
  }

  for (const newChannelOpts of newChannelOptsArr) {
    for (const channelId of newChannelOpts.text_channel_ids) {
      if (oldPerms.get(channelId) !== newChannelOpts.permissions) {
        // Update text channel perms if the channel we transitioned from didn't already have the same text channel perms
        permsToSet.set(channelId, newChannelOpts.permissions);
      }
      if (permsToDelete.has(channelId)) {
        permsToDelete.delete(channelId);
      }
    }
  }

  try {
    for (const channelId of permsToDelete) {
      const channel = pluginData.guild.channels.cache.get(channelId as Snowflake);
      if (!channel || !(channel instanceof TextChannel)) continue;
      pluginData.state.serverLogs.ignoreLog(LogType.CHANNEL_UPDATE, channelId, 3 * 1000);
      await channel.permissionOverwrites
        .resolve(userId as Snowflake)
        ?.delete(`Companion Channel for ${oldChannel!.id} | User Left`);
    }

    for (const [channelId, permissions] of permsToSet) {
      const channel = pluginData.guild.channels.cache.get(channelId as Snowflake);
      if (!channel || !(channel instanceof TextChannel)) continue;
      pluginData.state.serverLogs.ignoreLog(LogType.CHANNEL_UPDATE, channelId, 3 * 1000);
      await channel.permissionOverwrites.create(userId as Snowflake, new Permissions(BigInt(permissions)).serialize(), {
        reason: `Companion Channel for ${voiceChannel!.id} | User Joined`,
      });
    }
  } catch (e) {
    if (isDiscordAPIError(e) && e.code === 50001) {
      const logs = pluginData.getPlugin(LogsPlugin);
      logs.log(LogType.BOT_ALERT, {
        body: `Missing permissions to handle companion channels. Pausing companion channels for 5 minutes or until the bot is reloaded on this server.`,
      });
      pluginData.state.errorCooldownManager.setCooldown(ERROR_COOLDOWN_KEY, ERROR_COOLDOWN);
      return;
    }

    throw e;
  }
}
