import * as t from "io-ts";
import { BasePluginType } from "knub";
import { tMessageContent, tNullable } from "../../utils";
import { GuildRoleButtons } from "../../data/GuildRoleButtons";

const RoleButtonOption = t.type({
  role_id: t.string,
  label: tNullable(t.string),
  emoji: tNullable(t.string),
  // https://discord.js.org/#/docs/discord.js/v13/typedef/MessageButtonStyle
  style: tNullable(
    t.union([
      t.literal("PRIMARY"),
      t.literal("SECONDARY"),
      t.literal("SUCCESS"),
      t.literal("DANGER"),
      // t.literal("LINK"), // Role buttons don't use link buttons, but adding this here so it's documented why it's not available
    ]),
  ),
  start_new_row: tNullable(t.boolean),
});
export type TRoleButtonOption = t.TypeOf<typeof RoleButtonOption>;

const RoleButtonsConfigItem = t.type({
  name: t.string,
  message: t.union([
    t.type({
      channel_id: t.string,
      message_id: t.string,
    }),
    t.type({
      channel_id: t.string,
      content: tMessageContent,
    }),
  ]),
  options: t.array(RoleButtonOption),
  exclusive: tNullable(t.boolean),
});
export type TRoleButtonsConfigItem = t.TypeOf<typeof RoleButtonsConfigItem>;

export const ConfigSchema = t.type({
  buttons: t.record(t.string, RoleButtonsConfigItem),
  can_reset: t.boolean,
});
export type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

export interface RoleButtonsPluginType extends BasePluginType {
  config: TConfigSchema;
  state: {
    roleButtons: GuildRoleButtons;
  };
}
