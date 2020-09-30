import { SlowmodePluginType } from "../types";
import { GuildPluginData } from "knub";
import { Constants, GuildChannel, TextChannel } from "eris";
import { isDiscordRESTError, stripObjectToScalars, UnknownUser } from "../../../utils";
import { LogType } from "../../../data/LogType";
import { logger } from "../../../logger";

export async function applyBotSlowmodeToUserId(
  pluginData: GuildPluginData<SlowmodePluginType>,
  channel: GuildChannel & TextChannel,
  userId: string,
) {
  // Deny sendMessage permission from the user. If there are existing permission overwrites, take those into account.
  const existingOverride = channel.permissionOverwrites.get(userId);
  const newDeniedPermissions = (existingOverride ? existingOverride.deny : 0) | Constants.Permissions.sendMessages;
  const newAllowedPermissions = (existingOverride ? existingOverride.allow : 0) & ~Constants.Permissions.sendMessages;

  try {
    await channel.editPermission(userId, newAllowedPermissions, newDeniedPermissions, "member");
  } catch (e) {
    const user = pluginData.client.users.get(userId) || new UnknownUser({ id: userId });

    if (isDiscordRESTError(e) && e.code === 50013) {
      logger.warn(
        `Missing permissions to apply bot slowmode to user ${userId} on channel ${channel.name} (${channel.id}) on server ${pluginData.guild.name} (${pluginData.guild.id})`,
      );
      pluginData.state.logs.log(LogType.BOT_ALERT, {
        body: `Missing permissions to apply bot slowmode to {userMention(user)} in {channelMention(channel)}`,
        user: stripObjectToScalars(user),
        channel: stripObjectToScalars(channel),
      });
    } else {
      pluginData.state.logs.log(LogType.BOT_ALERT, {
        body: `Failed to apply bot slowmode to {userMention(user)} in {channelMention(channel)}`,
        user: stripObjectToScalars(user),
        channel: stripObjectToScalars(channel),
      });
      throw e;
    }
  }

  await pluginData.state.slowmodes.addSlowmodeUser(channel.id, userId);
}
