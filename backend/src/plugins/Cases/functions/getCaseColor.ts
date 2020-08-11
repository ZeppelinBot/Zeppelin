import { PluginData } from "knub";
import { CasesPluginType } from "../types";
import { CaseTypes, CaseTypeToName } from "../../../data/CaseTypes";
import { caseColors } from "../caseColors";

export function getCaseColor(pluginData: PluginData<CasesPluginType>, caseType: CaseTypes) {
  return pluginData.config.get().case_colors?.[CaseTypeToName[caseType]] ?? caseColors[caseType];
}
