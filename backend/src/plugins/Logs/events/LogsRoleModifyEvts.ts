import { LogType } from "../../../data/LogType";
import { differenceToString, getScalarDifference, stripObjectToScalars } from "../../../utils";
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

export const LogsRoleUpdateEvt = logsEvt({
  event: "roleUpdate",

  async listener(meta) {
    const diff = getScalarDifference(meta.args.oldRole, meta.args.newRole);
    const differenceString = differenceToString(diff);

    meta.pluginData.state.guildLogs.log(LogType.ROLE_UPDATE, {
      newRole: stripObjectToScalars(meta.args.newRole),
      oldRole: stripObjectToScalars(meta.args.oldRole),
      differenceString,
    });
  },
});
