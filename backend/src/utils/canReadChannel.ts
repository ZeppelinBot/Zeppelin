import { Constants, GuildChannel } from "eris";
import { hasPermissions } from "./hasPermissions";

export function canReadChannel(channel: GuildChannel, memberId: string) {
  const channelPermissions = channel.permissionsOf(memberId);
  return hasPermissions(channelPermissions, [
    Constants.Permissions.readMessages,
    Constants.Permissions.readMessageHistory,
  ]);
}
