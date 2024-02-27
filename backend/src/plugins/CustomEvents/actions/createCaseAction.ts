import { GuildPluginData } from "knub";
import z from "zod";
import { CaseTypes } from "../../../data/CaseTypes";
import { renderTemplate, TemplateSafeValueContainer } from "../../../templateFormatter";
import { zBoundedCharacters, zSnowflake } from "../../../utils";
import { CasesPlugin } from "../../Cases/CasesPlugin";
import { ActionError } from "../ActionError";
import { catchTemplateError } from "../catchTemplateError";
import { CustomEventsPluginType, TCustomEvent } from "../types";

export const zCreateCaseAction = z.strictObject({
  type: z.literal("create_case"),
  case_type: zBoundedCharacters(0, 32),
  mod: zSnowflake,
  target: zSnowflake,
  reason: zBoundedCharacters(0, 4000),
});
export type TCreateCaseAction = z.infer<typeof zCreateCaseAction>;

export async function createCaseAction(
  pluginData: GuildPluginData<CustomEventsPluginType>,
  action: TCreateCaseAction,
  values: TemplateSafeValueContainer,
  event: TCustomEvent,
  eventData: any, // eslint-disable-line @typescript-eslint/no-unused-vars
) {
  const modId = await catchTemplateError(() => renderTemplate(action.mod, values, false), "Invalid mod format");
  const targetId = await catchTemplateError(
    () => renderTemplate(action.target, values, false),
    "Invalid target format",
  );
  const reason = await catchTemplateError(() => renderTemplate(action.reason, values, false), "Invalid reason format");

  if (CaseTypes[action.case_type] == null) {
    throw new ActionError(`Invalid case type: ${action.type}`);
  }

  const casesPlugin = pluginData.getPlugin(CasesPlugin);
  await casesPlugin!.createCase({
    userId: targetId,
    modId,
    type: CaseTypes[action.case_type],
    reason: `__[${event.name}]__ ${reason}`,
  });
}
