import { logsEvent } from "../types";
import { stripObjectToScalars } from "src/utils";
import { LogType } from "src/data/LogType";
import moment from "moment-timezone";
import humanizeDuration from "humanize-duration";
import { CasesPlugin } from "../../Cases/CasesPlugin";

export const LogsGuildMemberAddEvt = logsEvent({
  event: "guildMemberAdd",

  async listener(meta) {
    const pluginData = meta.pluginData;
    const member = meta.args.member;

    const newThreshold = moment.utc().valueOf() - 1000 * 60 * 60;
    const accountAge = humanizeDuration(moment.utc().valueOf() - member.createdAt, {
      largest: 2,
      round: true,
    });

    pluginData.state.guildLogs.log(LogType.MEMBER_JOIN, {
      member: stripObjectToScalars(member, ["user", "roles"]),
      new: member.createdAt >= newThreshold ? " :new:" : "",
      account_age: accountAge,
    });

    const cases = (await pluginData.state.cases.with("notes").getByUserId(member.id)).filter(c => !c.is_hidden);
    cases.sort((a, b) => (a.created_at > b.created_at ? -1 : 1));

    if (cases.length) {
      const recentCaseLines = [];
      const recentCases = cases.slice(0, 2);
      const casesPlugin = pluginData.getPlugin(CasesPlugin);
      for (const theCase of recentCases) {
        recentCaseLines.push(await casesPlugin.getCaseSummary(theCase, true));
      }

      let recentCaseSummary = recentCaseLines.join("\n");
      if (recentCases.length < cases.length) {
        const remaining = cases.length - recentCases.length;
        if (remaining === 1) {
          recentCaseSummary += `\n*+${remaining} case*`;
        } else {
          recentCaseSummary += `\n*+${remaining} cases*`;
        }
      }

      pluginData.state.guildLogs.log(LogType.MEMBER_JOIN_WITH_PRIOR_RECORDS, {
        member: stripObjectToScalars(member, ["user", "roles"]),
        recentCaseSummary,
      });
    }
  },
});
