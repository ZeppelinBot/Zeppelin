import * as t from "io-ts";
import { BasePluginType } from "knub";
import { tMessageContent, tNullable } from "../../utils";
import { GuildRoleButtons } from "../../data/GuildRoleButtons";

enum ButtonStyles {
  PRIMARY = 1,
  SECONDARY = 2,
  SUCCESS = 3,
  DANGER = 4,
  // LINK = 5, We do not want users to create link buttons, but it would be style 5
}

const RoleButtonOption = t.type({
  role_id: t.string,
  label: tNullable(t.string),
  emoji: tNullable(t.string),
  style: tNullable(t.keyof(ButtonStyles)), // https://discord.js.org/#/docs/discord.js/v13/typedef/MessageButtonStyle
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
});
export type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

export interface RoleButtonsPluginType extends BasePluginType {
  config: TConfigSchema;
  state: {
    roleButtons: GuildRoleButtons;
  };
}
