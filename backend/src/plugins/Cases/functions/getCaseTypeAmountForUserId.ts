import { GuildPluginData } from "knub";
import { CasesPluginType } from "../types";
import { CaseTypes } from "../../../data/CaseTypes";

export async function getCaseTypeAmountForUserId(
  pluginData: GuildPluginData<CasesPluginType>,
  userID: string,
  type: CaseTypes,
): Promise<number> {
  const cases = (await pluginData.state.cases.getByUserId(userID)).filter((c) => !c.is_hidden);
  let typeAmount = 0;

  if (cases.length > 0) {
    cases.forEach((singleCase) => {
      if (singleCase.type === type.valueOf()) {
        typeAmount++;
      }
    });
  }

  return typeAmount;
}
