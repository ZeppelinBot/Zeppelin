import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { BaseGuildVoiceChannel, GuildMember, User } from "discord.js";
import {
  channelToTemplateSafeChannel,
  memberToTemplateSafeMember,
  userToTemplateSafeUser,
} from "../../../utils/templateSafeObjects";
import { resolveChannelIds } from "../../../utils/resolveChannelIds";

interface LogVoiceChannelForceDisconnectData {
  mod: User;
  member: GuildMember;
  oldChannel: BaseGuildVoiceChannel;
}

export function logVoiceChannelForceDisconnect(
  pluginData: GuildPluginData<LogsPluginType>,
  data: LogVoiceChannelForceDisconnectData,
) {
  return log(
    pluginData,
    LogType.VOICE_CHANNEL_FORCE_DISCONNECT,
    createTypedTemplateSafeValueContainer({
      mod: userToTemplateSafeUser(data.mod),
      member: memberToTemplateSafeMember(data.member),
      oldChannel: channelToTemplateSafeChannel(data.oldChannel),
    }),
    {
      userId: data.member.id,
      roles: Array.from(data.member.roles.cache.keys()),
      ...resolveChannelIds(data.oldChannel),
      bot: data.member.user.bot,
    },
  );
}
