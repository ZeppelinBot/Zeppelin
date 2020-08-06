import { Constants, GuildChannel } from "eris";
import { hasChannelPermissions } from "./hasChannelPermissions";

export function canReadChannel(channel: GuildChannel, memberId: string) {
  const channelPermissions = channel.permissionsOf(memberId);
  return hasChannelPermissions(channelPermissions, [
    Constants.Permissions.readMessages,
    Constants.Permissions.readMessageHistory,
  ]);
}
