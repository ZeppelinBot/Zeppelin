import { CompanionChannelsPluginType, TCompanionChannelOpts } from "../types";
import { getCompanionChannelOptsForVoiceChannelId } from "./getCompanionChannelOptsForVoiceChannelId";
import { PluginData } from "knub";
import { TextChannel } from "eris";

export function handleCompanionPermissions(
  pluginData: PluginData<CompanionChannelsPluginType>,
  userId: string,
  voiceChannelId: string,
  oldChannelId?: string,
);
export function handleCompanionPermissions(
  pluginData: PluginData<CompanionChannelsPluginType>,
  userId: string,
  voiceChannelId: null,
  oldChannelId: string,
);
export function handleCompanionPermissions(
  pluginData: PluginData<CompanionChannelsPluginType>,
  userId: string,
  voiceChannelId?: string,
  oldChannelId?: string,
) {
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

  for (const channelId of permsToDelete) {
    const channel = pluginData.guild.channels.get(channelId);
    if (!channel || !(channel instanceof TextChannel)) continue;
    channel.deletePermission(userId, `Companion Channel for ${oldChannelId} | User Left`);
  }

  for (const [channelId, permissions] of permsToSet) {
    const channel = pluginData.guild.channels.get(channelId);
    if (!channel || !(channel instanceof TextChannel)) continue;
    channel.editPermission(userId, permissions, 0, "member", `Companion Channel for ${voiceChannelId} | User Joined`);
  }
}
