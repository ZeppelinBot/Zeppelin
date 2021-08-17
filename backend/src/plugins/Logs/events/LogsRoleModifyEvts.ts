import { LogType } from "../../../data/LogType";
import { differenceToString, getScalarDifference } from "../../../utils";
import { roleToTemplateSafeRole } from "../../../utils/templateSafeObjects";
import { logsEvt } from "../types";
import { logRoleCreate } from "../logFunctions/logRoleCreate";
import { logRoleDelete } from "../logFunctions/logRoleDelete";
import { logRoleUpdate } from "../logFunctions/logRoleUpdate";

export const LogsRoleCreateEvt = logsEvt({
  event: "roleCreate",

  async listener(meta) {
    logRoleCreate(meta.pluginData, {
      role: meta.args.role,
    });
  },
});

export const LogsRoleDeleteEvt = logsEvt({
  event: "roleDelete",

  async listener(meta) {
    logRoleDelete(meta.pluginData, {
      role: meta.args.role,
    });
  },
});

export const LogsRoleUpdateEvt = logsEvt({
  event: "roleUpdate",

  async listener(meta) {
    const diff = getScalarDifference(meta.args.oldRole, meta.args.newRole);
    const differenceString = differenceToString(diff);

    logRoleUpdate(meta.pluginData, {
      newRole: meta.args.newRole,
      oldRole: meta.args.oldRole,
      differenceString,
    });
  },
});
