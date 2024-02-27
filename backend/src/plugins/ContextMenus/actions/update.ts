import { GuildMember } from "discord.js";
import { GuildPluginData } from "knub";
import { CaseTypes } from "../../../data/CaseTypes";
import { Case } from "../../../data/entities/Case";
import { CasesPlugin } from "../../../plugins/Cases/CasesPlugin";
import { LogsPlugin } from "../../../plugins/Logs/LogsPlugin";
import { ContextMenuPluginType } from "../types";

export async function updateAction(
  pluginData: GuildPluginData<ContextMenuPluginType>,
  executingMember: GuildMember,
  theCase: Case,
  value: string,
) {
  const casesPlugin = pluginData.getPlugin(CasesPlugin);
  await casesPlugin.createCaseNote({
    caseId: theCase.case_number,
    modId: executingMember.id,
    body: value,
  });

  pluginData.getPlugin(LogsPlugin).logCaseUpdate({
    mod: executingMember.user,
    caseNumber: theCase.case_number,
    caseType: CaseTypes[theCase.type],
    note: value,
  });
}
