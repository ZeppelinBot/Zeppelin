import { Snowflake } from "discord.js";
import { GuildPluginData } from "vety";
import { z } from "zod";
import { TemplateSafeValueContainer } from "../../../templateFormatter.js";
import { convertDelayStringToMS, noop, zBoundedCharacters, zDelayString } from "../../../utils.js";
import { ActionError } from "../ActionError.js";
import { CustomEventsPluginType, TCustomEvent } from "../types.js";

export const zMakeRoleMentionableAction = z.strictObject({
  type: z.literal("make_role_mentionable"),
  role: zBoundedCharacters(0, 100),
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
