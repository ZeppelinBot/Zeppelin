import { GuildPluginData } from "knub";
import { CasesPluginType } from "../types";

export function getTotalCasesByMod(pluginData: GuildPluginData<CasesPluginType>, modId: string): Promise<number> {
  return pluginData.state.cases.getTotalCasesByModId(modId);
}
