import { GuildPluginData } from "knub";
import { Case } from "../../../data/entities/Case.js";
import { CasesPluginType } from "../types.js";

export function getRecentCasesByMod(
  pluginData: GuildPluginData<CasesPluginType>,
  modId: string,
  count: number,
  skip = 0,
): Promise<Case[]> {
  return pluginData.state.cases.getRecentByModId(modId, count, skip);
}
