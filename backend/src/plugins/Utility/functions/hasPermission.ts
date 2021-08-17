import { GuildMember, Snowflake } from "discord.js";
import { GuildPluginData } from "knub";
import { UtilityPluginType } from "../types";

export async function hasPermission(
  pluginData: GuildPluginData<UtilityPluginType>,
  member: GuildMember,
  channelId: Snowflake,
  permission: string,
) {
  return (await pluginData.config.getMatchingConfig({ member, channelId }))[permission];
}
