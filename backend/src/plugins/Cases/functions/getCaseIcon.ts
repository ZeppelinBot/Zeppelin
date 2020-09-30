import { GuildPluginData } from "knub";
import { CasesPluginType } from "../types";
import { CaseTypes, CaseTypeToName } from "../../../data/CaseTypes";
import { caseIcons } from "../caseIcons";

export function getCaseIcon(pluginData: GuildPluginData<CasesPluginType>, caseType: CaseTypes) {
  return pluginData.config.get().case_icons?.[CaseTypeToName[caseType]] ?? caseIcons[caseType];
}
