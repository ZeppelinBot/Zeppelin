import { LogType } from "../../../data/LogType";
import { memberToTemplateSafeMember } from "../../../utils/templateSafeObjects";
import { logsEvt } from "../types";
import { logMemberLeave } from "../logFunctions/logMemberLeave";

export const LogsGuildMemberRemoveEvt = logsEvt({
  event: "guildMemberRemove",

  async listener(meta) {
    logMemberLeave(meta.pluginData, {
      member: meta.args.member,
    });
  },
});
