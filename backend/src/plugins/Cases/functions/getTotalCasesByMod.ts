import { GuildPluginData } from "knub";
import { FindOptionsWhere } from "typeorm/find-options/FindOptionsWhere";
import { Case } from "../../../data/entities/Case";
import { CasesPluginType } from "../types";

export function getTotalCasesByMod(
  pluginData: GuildPluginData<CasesPluginType>,
  modId: string,
  filters: Omit<FindOptionsWhere<Case>, "guild_id" | "mod_id" | "is_hidden"> = {},
): Promise<number> {
  return pluginData.state.cases.getTotalCasesByModId(modId, filters);
}
