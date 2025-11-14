import { GuildMember } from "discord.js";
import { GuildPluginData } from "vety";
import { CaseTypes } from "../../../data/CaseTypes.js";
import { Case } from "../../../data/entities/Case.js";
import { CasesPlugin } from "../../Cases/CasesPlugin.js";
import { LogsPlugin } from "../../Logs/LogsPlugin.js";
import { ContextMenuPluginType } from "../types.js";

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

  void pluginData.getPlugin(LogsPlugin).logCaseUpdate({
    mod: executingMember.user,
    caseNumber: theCase.case_number,
    caseType: CaseTypes[theCase.type],
    note: value,
  });
}
