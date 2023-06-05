import * as t from "io-ts";
import { BasePluginType, guildPluginEventListener } from "knub";
import { GuildContextMenuLinks } from "../../data/GuildContextMenuLinks";

export const ConfigSchema = t.type({
  can_use: t.boolean,

  user_muteindef: t.boolean,
  user_mute1d: t.boolean,
  user_mute1h: t.boolean,
  user_info: t.boolean,
  message_clean10: t.boolean,
  message_clean25: t.boolean,
  message_clean50: t.boolean,
});
export type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

export interface ContextMenuPluginType extends BasePluginType {
  config: TConfigSchema;
  state: {
    contextMenuLinks: GuildContextMenuLinks;
  };
}

export const contextMenuEvt = guildPluginEventListener<ContextMenuPluginType>();
