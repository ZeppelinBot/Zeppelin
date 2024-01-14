import { Snowflake } from "discord.js";
import { GuildPluginData } from "knub";
import z from "zod";
import { TemplateSafeValueContainer } from "../../../templateFormatter";
import { zSnowflake } from "../../../utils";
import { ActionError } from "../ActionError";
import { CustomEventsPluginType, TCustomEvent } from "../types";

export const zMakeRoleUnmentionableAction = z.strictObject({
  type: z.literal("make_role_unmentionable"),
  role: zSnowflake,
});
export type TMakeRoleUnmentionableAction = z.infer<typeof zMakeRoleUnmentionableAction>;

export async function makeRoleUnmentionableAction(
  pluginData: GuildPluginData<CustomEventsPluginType>,
  action: TMakeRoleUnmentionableAction,
  values: TemplateSafeValueContainer,
  event: TCustomEvent,
  eventData: any, // eslint-disable-line @typescript-eslint/no-unused-vars
) {
  const role = pluginData.guild.roles.cache.get(action.role as Snowflake);
  if (!role) {
    throw new ActionError(`Unknown role: ${role}`);
  }

  await role.setMentionable(false, `Custom event: ${event.name}`);
}
