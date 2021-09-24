import * as t from "io-ts";
import { BasePluginType, typedGuildCommand, typedGuildEventListener } from "knub";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";
import { Queue } from "../../Queue";

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

export const messageSaverCmd = typedGuildCommand<MessageSaverPluginType>();
export const messageSaverEvt = typedGuildEventListener<MessageSaverPluginType>();
