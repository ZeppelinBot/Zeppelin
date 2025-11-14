import { GuildMember, User, VoiceBasedChannel } from "discord.js";
import { GuildPluginData } from "vety";
import { LogType } from "../../../data/LogType.js";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter.js";
import { resolveChannelIds } from "../../../utils/resolveChannelIds.js";
import {
  channelToTemplateSafeChannel,
  memberToTemplateSafeMember,
  userToTemplateSafeUser,
} from "../../../utils/templateSafeObjects.js";
import { LogsPluginType } from "../types.js";
import { log } from "../util/log.js";

export interface LogVoiceChannelForceDisconnectData {
  mod: User;
  member: GuildMember;
  oldChannel: VoiceBasedChannel;
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
