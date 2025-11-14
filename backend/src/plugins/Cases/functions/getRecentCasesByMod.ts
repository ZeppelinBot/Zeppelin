import { GuildPluginData } from "vety";
import { FindOptionsWhere } from "typeorm";
import { Case } from "../../../data/entities/Case.js";
import { CasesPluginType } from "../types.js";

export function getRecentCasesByMod(
  pluginData: GuildPluginData<CasesPluginType>,
  modId: string,
  count: number,
  skip = 0,
  filters: Omit<FindOptionsWhere<Case>, "guild_id" | "mod_id" | "is_hidden"> = {},
): Promise<Case[]> {
  return pluginData.state.cases.getRecentByModId(modId, count, skip, filters);
}
