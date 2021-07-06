import { memberToConfigAccessibleMember } from "../../../utils/configAccessibleObjects";
import { LogType } from "../../../data/LogType";
import { logsEvt } from "../types";

export const LogsGuildMemberRemoveEvt = logsEvt({
  event: "guildMemberRemove",

  async listener(meta) {
    meta.pluginData.state.guildLogs.log(LogType.MEMBER_LEAVE, {
      member: memberToConfigAccessibleMember(meta.args.member),
    });
  },
});
