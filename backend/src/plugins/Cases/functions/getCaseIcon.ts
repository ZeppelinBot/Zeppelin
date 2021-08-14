import { GuildPluginData } from "knub";
import { CaseTypes, CaseTypeToName } from "../../../data/CaseTypes";
import { caseIcons } from "../caseIcons";
import { CasesPluginType } from "../types";

export function getCaseIcon(pluginData: GuildPluginData<CasesPluginType>, caseType: CaseTypes) {
  return pluginData.config.get().case_icons?.[CaseTypeToName[caseType]] ?? caseIcons[caseType];
}
