import { GuildPluginData } from "knub";
import z from "zod";
import { canActOn } from "../../../pluginUtils";
import { renderTemplate, TemplateSafeValueContainer } from "../../../templateFormatter";
import { resolveMember, zSnowflake } from "../../../utils";
import { ActionError } from "../ActionError";
import { catchTemplateError } from "../catchTemplateError";
import { CustomEventsPluginType, TCustomEvent } from "../types";

export const zAddRoleAction = z.strictObject({
  type: z.literal("add_role"),
  target: zSnowflake,
  role: z.union([zSnowflake, z.array(zSnowflake)]),
});
export type TAddRoleAction = z.infer<typeof zAddRoleAction>;

export async function addRoleAction(
  pluginData: GuildPluginData<CustomEventsPluginType>,
  action: TAddRoleAction,
  values: TemplateSafeValueContainer,
  event: TCustomEvent,
  eventData: any,
) {
  const targetId = await catchTemplateError(
    () => renderTemplate(action.target, values, false),
    "Invalid target format",
  );
  const target = await resolveMember(pluginData.client, pluginData.guild, targetId);
  if (!target) throw new ActionError(`Unknown target member: ${targetId}`);

  if (event.trigger.type === "command" && !canActOn(pluginData, eventData.msg.member, target)) {
    throw new ActionError("Missing permissions");
  }
  const rolesToAdd = (Array.isArray(action.role) ? action.role : [action.role]).filter(
    (id) => !target.roles.cache.has(id),
  );
  if (rolesToAdd.length === 0) {
    throw new ActionError("Target already has the role(s) specified");
  }
  await target.roles.add(rolesToAdd);
}
