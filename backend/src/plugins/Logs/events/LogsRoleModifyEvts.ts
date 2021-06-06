import { LogType } from "../../../data/LogType";
import { stripObjectToScalars } from "../../../utils";
import { logsEvt } from "../types";

export const LogsRoleCreateEvt = logsEvt({
  event: "roleCreate",

  async listener(meta) {
    meta.pluginData.state.guildLogs.log(LogType.ROLE_CREATE, {
      role: stripObjectToScalars(meta.args.role),
    });
  },
});

export const LogsRoleDeleteEvt = logsEvt({
  event: "roleDelete",

  async listener(meta) {
    meta.pluginData.state.guildLogs.log(LogType.ROLE_DELETE, {
      role: stripObjectToScalars(meta.args.role),
    });
  },
});
