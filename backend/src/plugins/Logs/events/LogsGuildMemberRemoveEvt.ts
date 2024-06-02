import { logMemberLeave } from "../logFunctions/logMemberLeave.js";
import { logsEvt } from "../types.js";

export const LogsGuildMemberRemoveEvt = logsEvt({
  event: "guildMemberRemove",

  async listener(meta) {
    logMemberLeave(meta.pluginData, {
      member: meta.args.member,
    });
  },
});
