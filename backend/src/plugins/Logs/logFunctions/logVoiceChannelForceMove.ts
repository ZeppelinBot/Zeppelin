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

interface LogVoiceChannelForceMoveData {
  mod: User;
  member: GuildMember;
  oldChannel: BaseGuildVoiceChannel;
  newChannel: BaseGuildVoiceChannel;
}

export function logVoiceChannelForceMove(
  pluginData: GuildPluginData<LogsPluginType>,
  data: LogVoiceChannelForceMoveData,
) {
  return log(
    pluginData,
    LogType.VOICE_CHANNEL_FORCE_MOVE,
    createTypedTemplateSafeValueContainer({
      mod: userToTemplateSafeUser(data.mod),
      member: memberToTemplateSafeMember(data.member),
      oldChannel: channelToTemplateSafeChannel(data.oldChannel),
      newChannel: channelToTemplateSafeChannel(data.newChannel),
    }),
    {
      userId: data.member.id,
      roles: Array.from(data.member.roles.cache.keys()),
      channel: data.newChannel.id,
      category: data.newChannel.parentId,
      bot: data.member.user.bot,
    },
  );
}
