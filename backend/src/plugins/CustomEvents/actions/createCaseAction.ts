import * as t from "io-ts";
import { GuildPluginData } from "knub";
import { CaseTypes } from "../../../data/CaseTypes";
import { renderTemplate } from "../../../templateFormatter";
import { CasesPlugin } from "../../Cases/CasesPlugin";
import { ActionError } from "../ActionError";
import { CustomEventsPluginType, TCustomEvent } from "../types";

export const CreateCaseAction = t.type({
  type: t.literal("create_case"),
  case_type: t.string,
  mod: t.string,
  target: t.string,
  reason: t.string,
});
export type TCreateCaseAction = t.TypeOf<typeof CreateCaseAction>;

export async function createCaseAction(
  pluginData: GuildPluginData<CustomEventsPluginType>,
  action: TCreateCaseAction,
  values: any,
  event: TCustomEvent,
  eventData: any,
) {
  const modId = await renderTemplate(action.mod, values, false);
  const targetId = await renderTemplate(action.target, values, false);

  const reason = await renderTemplate(action.reason, values, false);

  if (CaseTypes[action.case_type] == null) {
    throw new ActionError(`Invalid case type: ${action.type}`);
  }

  const casesPlugin = pluginData.getPlugin(CasesPlugin);
  await casesPlugin.createCase({
    userId: targetId,
    modId,
    type: CaseTypes[action.case_type],
    reason: `__[${event.name}]__ ${reason}`,
  });
}
