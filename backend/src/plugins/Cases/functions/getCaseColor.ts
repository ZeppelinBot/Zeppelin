import { GuildPluginData } from "knub";
import { CaseTypes, CaseTypeToName } from "../../../data/CaseTypes";
import { caseColors } from "../caseColors";
import { CasesPluginType } from "../types";

export function getCaseColor(pluginData: GuildPluginData<CasesPluginType>, caseType: CaseTypes) {
  return pluginData.config.get().case_colors?.[CaseTypeToName[caseType]] ?? caseColors[caseType];
}
