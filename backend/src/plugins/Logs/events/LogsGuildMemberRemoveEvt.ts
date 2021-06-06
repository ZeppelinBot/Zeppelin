import { LogType } from "../../../data/LogType";
import { stripObjectToScalars } from "../../../utils";
import { logsEvt } from "../types";

export const LogsGuildMemberRemoveEvt = logsEvt({
  event: "guildMemberRemove",

  async listener(meta) {
    meta.pluginData.state.guildLogs.log(LogType.MEMBER_LEAVE, {
      member: stripObjectToScalars(meta.args.member, ["user", "roles"]),
    });
  },
});
