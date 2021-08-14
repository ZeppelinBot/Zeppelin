import { Snowflake } from "discord.js";
import * as t from "io-ts";
import { GuildPluginData } from "knub";
import { ActionError } from "../ActionError";
import { CustomEventsPluginType, TCustomEvent } from "../types";

export const MakeRoleUnmentionableAction = t.type({
  type: t.literal("make_role_unmentionable"),
  role: t.string,
});
export type TMakeRoleUnmentionableAction = t.TypeOf<typeof MakeRoleUnmentionableAction>;

export async function makeRoleUnmentionableAction(
  pluginData: GuildPluginData<CustomEventsPluginType>,
  action: TMakeRoleUnmentionableAction,
  values: any,
  event: TCustomEvent,
  eventData: any,
) {
  const role = pluginData.guild.roles.cache.get(action.role as Snowflake);
  if (!role) {
    throw new ActionError(`Unknown role: ${role}`);
  }

  await role.edit(
    {
      mentionable: false,
    },
    `Custom event: ${event.name}`,
  );
}
