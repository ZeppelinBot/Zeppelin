import { GuildMember } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { UnknownUser } from "../../../utils";
import {
  memberToTemplateSafeMember,
  TemplateSafeUnknownMember,
  TemplateSafeUnknownUser,
} from "../../../utils/templateSafeObjects";
import { LogsPluginType } from "../types";
import { log } from "../util/log";

interface LogMemberMuteExpiredData {
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
