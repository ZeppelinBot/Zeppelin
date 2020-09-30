import * as t from "io-ts";
import { BasePluginType, guildCommand, guildEventListener } from "knub";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";

export const ConfigSchema = t.type({
  can_manage: t.boolean,
});
export type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

export interface MessageSaverPluginType extends BasePluginType {
  config: TConfigSchema;
  state: {
    savedMessages: GuildSavedMessages;
  };
}

export const messageSaverCmd = guildCommand<MessageSaverPluginType>();
export const messageSaverEvt = guildEventListener<MessageSaverPluginType>();
