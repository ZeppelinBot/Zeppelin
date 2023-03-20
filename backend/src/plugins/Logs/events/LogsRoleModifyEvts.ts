import { Role } from "discord.js";
import { differenceToString, getScalarDifference } from "../../../utils";
import { filterObject } from "../../../utils/filterObject";
import { logRoleCreate } from "../logFunctions/logRoleCreate";
import { logRoleDelete } from "../logFunctions/logRoleDelete";
import { logRoleUpdate } from "../logFunctions/logRoleUpdate";
import { logsEvt } from "../types";

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

const validRoleDiffProps: Set<keyof Role> = new Set(["name", "hoist", "color", "mentionable"]);

export const LogsRoleUpdateEvt = logsEvt({
  event: "roleUpdate",

  async listener(meta) {
    const oldRoleDiffProps = filterObject(meta.args.oldRole || {}, (v, k) => validRoleDiffProps.has(k));
    const newRoleDiffProps = filterObject(meta.args.newRole, (v, k) => validRoleDiffProps.has(k));
    const diff = getScalarDifference(oldRoleDiffProps, newRoleDiffProps);
    const differenceString = differenceToString(diff);

    logRoleUpdate(meta.pluginData, {
      newRole: meta.args.newRole,
      oldRole: meta.args.oldRole,
      differenceString,
    });
  },
});
