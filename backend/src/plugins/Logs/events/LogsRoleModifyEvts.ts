import { roleToConfigAccessibleRole } from "../../../utils/configAccessibleObjects";
import { LogType } from "../../../data/LogType";
import { differenceToString, getScalarDifference } from "../../../utils";
import { logsEvt } from "../types";

export const LogsRoleCreateEvt = logsEvt({
  event: "roleCreate",

  async listener(meta) {
    meta.pluginData.state.guildLogs.log(LogType.ROLE_CREATE, {
      role: roleToConfigAccessibleRole(meta.args.role),
    });
  },
});

export const LogsRoleDeleteEvt = logsEvt({
  event: "roleDelete",

  async listener(meta) {
    meta.pluginData.state.guildLogs.log(LogType.ROLE_DELETE, {
      role: roleToConfigAccessibleRole(meta.args.role),
    });
  },
});

export const LogsRoleUpdateEvt = logsEvt({
  event: "roleUpdate",

  async listener(meta) {
    const diff = getScalarDifference(meta.args.oldRole, meta.args.newRole);
    const differenceString = differenceToString(diff);

    meta.pluginData.state.guildLogs.log(LogType.ROLE_UPDATE, {
      newRole: roleToConfigAccessibleRole(meta.args.newRole),
      oldRole: roleToConfigAccessibleRole(meta.args.oldRole),
      differenceString,
    });
  },
});
