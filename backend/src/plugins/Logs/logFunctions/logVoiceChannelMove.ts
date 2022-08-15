import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { BaseGuildVoiceChannel, GuildMember } from "discord.js";
import { channelToTemplateSafeChannel, memberToTemplateSafeMember } from "../../../utils/templateSafeObjects";
import { resolveChannelIds } from "../../../utils/resolveChannelIds";

interface LogVoiceChannelMoveData {
  member: GuildMember;
  oldChannel: BaseGuildVoiceChannel;
  newChannel: BaseGuildVoiceChannel;
}

export function logVoiceChannelMove(pluginData: GuildPluginData<LogsPluginType>, data: LogVoiceChannelMoveData) {
  return log(
    pluginData,
    LogType.VOICE_CHANNEL_MOVE,
    createTypedTemplateSafeValueContainer({
      member: memberToTemplateSafeMember(data.member),
      oldChannel: channelToTemplateSafeChannel(data.oldChannel),
      newChannel: channelToTemplateSafeChannel(data.newChannel),
    }),
    {
      userId: data.member.id,
      roles: Array.from(data.member.roles.cache.keys()),
      ...resolveChannelIds(data.newChannel),
      bot: data.member.user.bot,
    },
  );
}
