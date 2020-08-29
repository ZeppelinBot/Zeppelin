import { PluginData } from "knub";
import { CasesPluginType } from "../types";
import { CaseTypes } from "../../../data/CaseTypes";
import moment from "moment-timezone";

export async function getAllCaseTypeAmountsForUserId(
  pluginData: PluginData<CasesPluginType>,
  userID: string,
  within: moment.Moment,
): Promise<AllTypeAmounts> {
  const allAmounts = new Map<CaseTypes, { amount: number }>();
  for (const type in CaseTypes) {
    if (!isNaN(Number(type))) allAmounts.set(Number(type), { amount: 0 });
  }

  let total = 0;

  const cases = (await pluginData.state.cases.getByModId(userID)).filter(
    c => !c.is_hidden && moment(c.created_at) >= within,
  );

  if (cases.length > 0) {
    cases.forEach(singleCase => {
      allAmounts.get(singleCase.type).amount++;
      total++;
    });
  }

  return { typeAmounts: allAmounts, total };
}

class AllTypeAmounts {
  typeAmounts: Map<CaseTypes, { amount: number }>;
  total: number;
}
