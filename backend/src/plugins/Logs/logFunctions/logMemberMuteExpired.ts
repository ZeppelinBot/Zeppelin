import { GuildMember } from "discord.js";
import { GuildPluginData } from "vety";
import { LogType } from "../../../data/LogType.js";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter.js";
import { UnknownUser } from "../../../utils.js";
import {
  memberToTemplateSafeMember,
  TemplateSafeUnknownMember,
  TemplateSafeUnknownUser,
} from "../../../utils/templateSafeObjects.js";
import { LogsPluginType } from "../types.js";
import { log } from "../util/log.js";

export interface LogMemberMuteExpiredData {
  member: GuildMember | UnknownUser;
}

export function logMemberMuteExpired(pluginData: GuildPluginData<LogsPluginType>, data: LogMemberMuteExpiredData) {
  const member =
    data.member instanceof GuildMember
      ? memberToTemplateSafeMember(data.member)
      : new TemplateSafeUnknownMember({
          ...data.member,
          user: new TemplateSafeUnknownUser({ ...data.member }),
        });

  const roles = data.member instanceof GuildMember ? Array.from(data.member.roles.cache.keys()) : [];

  const bot = data.member instanceof GuildMember ? data.member.user.bot : false;

  return log(
    pluginData,
    LogType.MEMBER_MUTE_EXPIRED,
    createTypedTemplateSafeValueContainer({
      member,
    }),
    {
      userId: data.member.id,
      roles,
      bot,
    },
  );
}
