import { GuildPluginData } from "knub";
import { CasesPluginType } from "../types.js";

export function getTotalCasesByMod(pluginData: GuildPluginData<CasesPluginType>, modId: string): Promise<number> {
  return pluginData.state.cases.getTotalCasesByModId(modId);
}
