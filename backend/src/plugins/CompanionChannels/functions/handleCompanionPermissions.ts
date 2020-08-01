import { CompanionChannelsPluginType, TCompanionChannelOpts } from "../types";
import { getCompanionChannelOptsForVoiceChannelId } from "./getCompanionChannelOptsForVoiceChannelId";
import { PluginData } from "knub";
import { TextChannel } from "eris";
import { isDiscordRESTError, MINUTES } from "../../../utils";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { LogType } from "../../../data/LogType";

const ERROR_COOLDOWN_KEY = "errorCooldown";
const ERROR_COOLDOWN = 5 * MINUTES;

export async function handleCompanionPermissions(
  pluginData: PluginData<CompanionChannelsPluginType>,
  userId: string,
  voiceChannelId: string,
  oldChannelId?: string,
);
export async function handleCompanionPermissions(
  pluginData: PluginData<CompanionChannelsPluginType>,
  userId: string,
  voiceChannelId: null,
  oldChannelId: string,
);
export async function handleCompanionPermissions(
  pluginData: PluginData<CompanionChannelsPluginType>,
  userId: string,
  voiceChannelId?: string,
  oldChannelId?: string,
) {
  if (pluginData.state.errorCooldownManager.isOnCooldown(ERROR_COOLDOWN_KEY)) {
    return;
  }

  const permsToDelete: Set<string> = new Set(); // channelId[]
  const oldPerms: Map<string, number> = new Map(); // channelId => permissions
  const permsToSet: Map<string, number> = new Map(); // channelId => permissions

  const oldChannelOptsArr: TCompanionChannelOpts[] = oldChannelId
    ? getCompanionChannelOptsForVoiceChannelId(pluginData, userId, oldChannelId)
    : [];
  const newChannelOptsArr: TCompanionChannelOpts[] = voiceChannelId
    ? getCompanionChannelOptsForVoiceChannelId(pluginData, userId, voiceChannelId)
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
      const channel = pluginData.guild.channels.get(channelId);
      if (!channel || !(channel instanceof TextChannel)) continue;
      await channel.deletePermission(userId, `Companion Channel for ${oldChannelId} | User Left`);
    }

    for (const [channelId, permissions] of permsToSet) {
      const channel = pluginData.guild.channels.get(channelId);
      if (!channel || !(channel instanceof TextChannel)) continue;
      await channel.editPermission(
        userId,
        permissions,
        0,
        "member",
        `Companion Channel for ${voiceChannelId} | User Joined`,
      );
    }
  } catch (e) {
    if (isDiscordRESTError(e) && e.code === 50001) {
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
