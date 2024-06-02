import { logMemberNickChange } from "../logFunctions/logMemberNickChange.js";
import { logsEvt } from "../types.js";

export const LogsGuildMemberUpdateEvt = logsEvt({
  event: "guildMemberUpdate",

  async listener(meta) {
    const pluginData = meta.pluginData;
    const oldMember = meta.args.oldMember;
    const member = meta.args.newMember;

    if (!oldMember || oldMember.partial) {
      return;
    }

    if (member.nickname !== oldMember.nickname) {
      logMemberNickChange(pluginData, {
        member,
        oldNick: oldMember.nickname != null ? oldMember.nickname : "<none>",
        newNick: member.nickname != null ? member.nickname : "<none>",
      });
    }
  },
});
