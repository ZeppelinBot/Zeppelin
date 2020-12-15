import { GuildPluginData } from "knub";
import { CasesPluginType } from "../types";
import { Case } from "../../../data/entities/Case";

export function getRecentCasesByMod(
  pluginData: GuildPluginData<CasesPluginType>,
  modId: string,
  count: number,
  skip = 0,
): Promise<Case[]> {
  return pluginData.state.cases.getRecentByModId(modId, count, skip);
}
