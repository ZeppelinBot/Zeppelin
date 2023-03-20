import { PermissionsBitField, PermissionsString, Snowflake } from "discord.js";
import * as t from "io-ts";
import { GuildPluginData } from "knub";
import { TemplateSafeValueContainer } from "../../../templateFormatter";
import { ActionError } from "../ActionError";
import { CustomEventsPluginType, TCustomEvent } from "../types";

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
  values: TemplateSafeValueContainer,
  event: TCustomEvent,
  eventData: any,
) {
  const channel = pluginData.guild.channels.cache.get(action.channel as Snowflake);
  if (!channel || channel.isThread() || !("guild" in channel)) {
    throw new ActionError(`Unknown channel: ${action.channel}`);
  }

  for (const override of action.overrides) {
    const allow = new PermissionsBitField(BigInt(override.allow)).serialize();
    const deny = new PermissionsBitField(BigInt(override.deny)).serialize();
    const perms: Partial<Record<PermissionsString, boolean | null>> = {};
    for (const key in allow) {
      if (allow[key]) {
        perms[key] = true;
      } else if (deny[key]) {
        perms[key] = false;
      }
    }
    channel.permissionOverwrites.create(override.id as Snowflake, perms);

    /*
    await channel.permissionOverwrites overwritePermissions(
      [{ id: override.id, allow: BigInt(override.allow), deny: BigInt(override.deny), type: override.type }],
      `Custom event: ${event.name}`,
    );
    */
  }
}
