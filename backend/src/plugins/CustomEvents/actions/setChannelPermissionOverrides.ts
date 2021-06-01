import { GuildPluginData } from "knub";
import { CustomEventsPluginType, TCustomEvent } from "../types";
import * as t from "io-ts";
import { ActionError } from "../ActionError";

export const SetChannelPermissionOverridesAction = t.type({
  type: t.literal("set_channel_permission_overrides"),
  channel: t.string,
  overrides: t.array(
    t.type({
      type: t.union([t.literal("member"), t.literal("role")]),
      id: t.string,
      allow: t.number,
      deny: t.number,
    }),
  ),
});
export type TSetChannelPermissionOverridesAction = t.TypeOf<typeof SetChannelPermissionOverridesAction>;

export async function setChannelPermissionOverridesAction(
  pluginData: GuildPluginData<CustomEventsPluginType>,
  action: TSetChannelPermissionOverridesAction,
  values: any,
  event: TCustomEvent,
  eventData: any,
) {
  const channel = pluginData.guild.channels.cache.get(action.channel);
  if (!channel) {
    throw new ActionError(`Unknown channel: ${action.channel}`);
  }

  for (const override of action.overrides) {
    await channel.editPermission(
      override.id,
      override.allow,
      override.deny,
      override.type,
      `Custom event: ${event.name}`,
    );
  }
}
