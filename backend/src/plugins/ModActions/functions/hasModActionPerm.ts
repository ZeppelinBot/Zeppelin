import { GuildMember, Snowflake } from "discord.js";
import { GuildPluginData } from "vety";
import { ModActionsPluginType } from "../types.js";

export async function hasNotePermission(
  pluginData: GuildPluginData<ModActionsPluginType>,
  member: GuildMember,
  channelId: Snowflake,
) {
  return (await pluginData.config.getMatchingConfig({ member, channelId })).can_note;
}

export async function hasWarnPermission(
  pluginData: GuildPluginData<ModActionsPluginType>,
  member: GuildMember,
  channelId: Snowflake,
) {
  return (await pluginData.config.getMatchingConfig({ member, channelId })).can_warn;
}

export async function hasMutePermission(
  pluginData: GuildPluginData<ModActionsPluginType>,
  member: GuildMember,
  channelId: Snowflake,
) {
  return (await pluginData.config.getMatchingConfig({ member, channelId })).can_mute;
}

export async function hasBanPermission(
  pluginData: GuildPluginData<ModActionsPluginType>,
  member: GuildMember,
  channelId: Snowflake,
) {
  return (await pluginData.config.getMatchingConfig({ member, channelId })).can_ban;
}
