import { logsEvent } from "../types";
import { stripObjectToScalars } from "src/utils";
import { LogType } from "src/data/LogType";

export const LogsGuildMemberRemoveEvt = logsEvent({
  event: "guildMemberRemove",

  async listener(meta) {
    meta.pluginData.state.guildLogs.log(LogType.MEMBER_LEAVE, {
      member: stripObjectToScalars(meta.args.member, ["user", "roles"]),
    });
  },
});
