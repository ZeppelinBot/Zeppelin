import { GuildMember } from "discord.js";
import humanizeDuration from "humanize-duration";
import { GuildPluginData } from "knub";
import moment from "moment-timezone";
import { LogType } from "../../../data/LogType";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { memberToTemplateSafeMember } from "../../../utils/templateSafeObjects";
import { LogsPluginType } from "../types";
import { log } from "../util/log";

interface LogMemberJoinData {
  member: GuildMember;
}

export function logMemberJoin(pluginData: GuildPluginData<LogsPluginType>, data: LogMemberJoinData) {
  const newThreshold = moment.utc().valueOf() - 1000 * 60 * 60;
  const accountAge = humanizeDuration(moment.utc().valueOf() - data.member.user.createdTimestamp, {
    largest: 2,
    round: true,
  });

  return log(
    pluginData,
    LogType.MEMBER_JOIN,
    createTypedTemplateSafeValueContainer({
      member: memberToTemplateSafeMember(data.member),
      new: data.member.user.createdTimestamp >= newThreshold ? " :new:" : "",
      account_age: accountAge,
    }),
    {
      userId: data.member.id,
      bot: data.member.user.bot,
    },
  );
}
