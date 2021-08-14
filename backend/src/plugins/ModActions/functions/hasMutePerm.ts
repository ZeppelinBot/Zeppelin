import { GuildMember, Snowflake } from "discord.js";
import { GuildPluginData } from "knub";
import { ModActionsPluginType } from "../types";

export async function hasMutePermission(
  pluginData: GuildPluginData<ModActionsPluginType>,
  member: GuildMember,
  channelId: Snowflake,
) {
  return (await pluginData.config.getMatchingConfig({ member, channelId })).can_mute;
}
