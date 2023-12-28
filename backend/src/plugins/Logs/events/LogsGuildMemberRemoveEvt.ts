import { logMemberLeave } from "../logFunctions/logMemberLeave";
import { logsEvt } from "../types";

export const LogsGuildMemberRemoveEvt = logsEvt({
  event: "guildMemberRemove",

  async listener(meta) {
    logMemberLeave(meta.pluginData, {
      member: meta.args.member,
    });
  },
});
