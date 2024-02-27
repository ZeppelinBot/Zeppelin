import { PermissionsBitField, PermissionsString, Snowflake } from "discord.js";
import { GuildPluginData } from "knub";
import z from "zod";
import { TemplateSafeValueContainer } from "../../../templateFormatter";
import { zSnowflake } from "../../../utils";
import { ActionError } from "../ActionError";
import { CustomEventsPluginType, TCustomEvent } from "../types";

export const zSetChannelPermissionOverridesAction = z.strictObject({
  type: z.literal("set_channel_permission_overrides"),
  channel: zSnowflake,
  overrides: z
    .array(
      z.strictObject({
        type: z.union([z.literal("member"), z.literal("role")]),
        id: zSnowflake,
        allow: z.number(),
        deny: z.number(),
      }),
    )
    .max(15),
});
export type TSetChannelPermissionOverridesAction = z.infer<typeof zSetChannelPermissionOverridesAction>;

export async function setChannelPermissionOverridesAction(
  pluginData: GuildPluginData<CustomEventsPluginType>,
  action: TSetChannelPermissionOverridesAction,
  values: TemplateSafeValueContainer, // eslint-disable-line @typescript-eslint/no-unused-vars
  event: TCustomEvent, // eslint-disable-line @typescript-eslint/no-unused-vars
  eventData: any, // eslint-disable-line @typescript-eslint/no-unused-vars
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
