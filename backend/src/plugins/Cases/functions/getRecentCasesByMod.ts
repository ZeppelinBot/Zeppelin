import { GuildPluginData } from "knub";
import { FindOptionsWhere } from "typeorm/find-options/FindOptionsWhere";
import { Case } from "../../../data/entities/Case";
import { CasesPluginType } from "../types";

export function getRecentCasesByMod(
  pluginData: GuildPluginData<CasesPluginType>,
  modId: string,
  count: number,
  skip = 0,
  filters: Omit<FindOptionsWhere<Case>, "guild_id" | "mod_id" | "is_hidden"> = {},
): Promise<Case[]> {
  return pluginData.state.cases.getRecentByModId(modId, count, skip, filters);
}
