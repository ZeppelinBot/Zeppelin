import { Snowflake } from "discord.js";
import { GuildPluginData } from "knub";
import z from "zod";
import { TemplateSafeValueContainer } from "../../../templateFormatter";
import { convertDelayStringToMS, noop, zDelayString, zSnowflake } from "../../../utils";
import { ActionError } from "../ActionError";
import { CustomEventsPluginType, TCustomEvent } from "../types";

export const zMakeRoleMentionableAction = z.strictObject({
  type: z.literal("make_role_mentionable"),
  role: zSnowflake,
  timeout: zDelayString,
});
export type TMakeRoleMentionableAction = z.infer<typeof zMakeRoleMentionableAction>;

export async function makeRoleMentionableAction(
  pluginData: GuildPluginData<CustomEventsPluginType>,
  action: TMakeRoleMentionableAction,
  values: TemplateSafeValueContainer,
  event: TCustomEvent,
  eventData: any, // eslint-disable-line @typescript-eslint/no-unused-vars
) {
  const role = pluginData.guild.roles.cache.get(action.role as Snowflake);
  if (!role) {
    throw new ActionError(`Unknown role: ${role}`);
  }

  await role.setMentionable(true, `Custom event: ${event.name}`);

  const timeout = convertDelayStringToMS(action.timeout)!;
  setTimeout(() => {
    role.setMentionable(false, `Custom event: ${event.name}`).catch(noop);
  }, timeout);
}
