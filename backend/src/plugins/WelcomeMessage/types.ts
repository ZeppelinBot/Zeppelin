import * as t from "io-ts";
import { BasePluginType, typedGuildEventListener } from "knub";
import { GuildLogs } from "../../data/GuildLogs";
import { tNullable } from "../../utils";

export const ConfigSchema = t.type({
  send_dm: t.boolean,
  send_to_channel: tNullable(t.string),
  message: tNullable(t.string),
});
export type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

export interface WelcomeMessagePluginType extends BasePluginType {
  config: TConfigSchema;
  state: {
    logs: GuildLogs;
    sentWelcomeMessages: Set<string>;
  };
}

export const welcomeMessageEvt = typedGuildEventListener<WelcomeMessagePluginType>();
