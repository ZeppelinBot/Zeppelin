import { GuildPluginData } from "vety";
import { FindOptionsWhere } from "typeorm";
import { Case } from "../../../data/entities/Case.js";
import { CasesPluginType } from "../types.js";

export function getTotalCasesByMod(
  pluginData: GuildPluginData<CasesPluginType>,
  modId: string,
  filters: Omit<FindOptionsWhere<Case>, "guild_id" | "mod_id" | "is_hidden"> = {},
): Promise<number> {
  return pluginData.state.cases.getTotalCasesByModId(modId, filters);
}
