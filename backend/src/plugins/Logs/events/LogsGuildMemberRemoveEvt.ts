import { logsEvt } from "../types";
import { stripObjectToScalars } from "../../../utils";
import { LogType } from "../../../data/LogType";

export const LogsGuildMemberRemoveEvt = logsEvt({
  event: "guildMemberRemove",

  async listener(meta) {
    meta.pluginData.state.guildLogs.log(LogType.MEMBER_LEAVE, {
      member: stripObjectToScalars(meta.args.member, ["user", "roles"]),
    });
  },
});
