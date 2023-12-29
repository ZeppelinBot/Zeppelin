import { logMemberJoin } from "../logFunctions/logMemberJoin";
import { logsEvt } from "../types";

export const LogsGuildMemberAddEvt = logsEvt({
  event: "guildMemberAdd",

  async listener(meta) {
    const pluginData = meta.pluginData;
    const member = meta.args.member;

    logMemberJoin(pluginData, {
      member,
    });

    // TODO: Uncomment below once circular dependencies in Knub have been fixed

    // const cases = (await pluginData.state.cases.with("notes").getByUserId(member.id)).filter(c => !c.is_hidden);
    // cases.sort((a, b) => (a.created_at > b.created_at ? -1 : 1));
    //
    // if (cases.length) {
    //   const recentCaseLines: string[] = [];
    //   const recentCases = cases.slice(0, 2);
    //   const casesPlugin = pluginData.getPlugin(CasesPlugin);
    //   for (const theCase of recentCases) {
    //     recentCaseLines.push((await casesPlugin.getCaseSummary(theCase))!);
    //   }
    //
    //   let recentCaseSummary = recentCaseLines.join("\n");
    //   if (recentCases.length < cases.length) {
    //     const remaining = cases.length - recentCases.length;
    //     if (remaining === 1) {
    //       recentCaseSummary += `\n*+${remaining} case*`;
    //     } else {
    //       recentCaseSummary += `\n*+${remaining} cases*`;
    //     }
    //   }
    //
    //   logMemberJoinWithPriorRecords(pluginData, {
    //     member,
    //     recentCaseSummary,
    //   });
    // }
  },
});
