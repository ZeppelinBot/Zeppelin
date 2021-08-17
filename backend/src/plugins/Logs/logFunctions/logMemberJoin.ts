import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { GuildMember } from "discord.js";
import { memberToTemplateSafeMember } from "../../../utils/templateSafeObjects";
import moment from "moment-timezone";
import humanizeDuration from "humanize-duration";

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
