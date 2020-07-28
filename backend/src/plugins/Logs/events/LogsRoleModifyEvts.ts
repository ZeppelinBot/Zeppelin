import { logsEvent } from "../types";
import { stripObjectToScalars } from "src/utils";
import { LogType } from "src/data/LogType";

export const LogsRoleCreateEvt = logsEvent({
  event: "guildRoleCreate",

  async listener(meta) {
    meta.pluginData.state.guildLogs.log(LogType.ROLE_CREATE, {
      role: stripObjectToScalars(meta.args.role),
    });
  },
});

export const LogsRoleDeleteEvt = logsEvent({
  event: "guildRoleDelete",

  async listener(meta) {
    meta.pluginData.state.guildLogs.log(LogType.ROLE_DELETE, {
      role: stripObjectToScalars(meta.args.role),
    });
  },
});
