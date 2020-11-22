import { GuildPluginData } from "knub";
import { CustomEventsPluginType, TCustomEvent } from "../types";
import * as t from "io-ts";
import { ActionError } from "../ActionError";

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
  const role = pluginData.guild.roles.get(action.role);
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
