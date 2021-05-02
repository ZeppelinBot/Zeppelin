import { GuildPluginData } from "knub";
import { CasesPluginType } from "../types";
import { CaseTypes } from "../../../data/CaseTypes";

export async function getCaseTypeAmountForUserId(
  pluginData: GuildPluginData<CasesPluginType>,
  userID: string,
  type: CaseTypes,
): Promise<number> {
  const cases = (await pluginData.state.cases.getByUserId(userID)).filter(c => !c.is_hidden);
  let typeAmount = 0;

  if (cases.length > 0) {
    for (let i = 0; i < cases.length; ++i) {
      if (cases[i].type === type.valueOf()) {
        typeAmount++;
      }
    }
  }

  return typeAmount;
}
