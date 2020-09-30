import { GuildPluginData } from "knub";
import { CasesPluginType } from "../types";
import { CaseTypes, CaseTypeToName } from "../../../data/CaseTypes";
import { caseColors } from "../caseColors";

export function getCaseColor(pluginData: GuildPluginData<CasesPluginType>, caseType: CaseTypes) {
  return pluginData.config.get().case_colors?.[CaseTypeToName[caseType]] ?? caseColors[caseType];
}
