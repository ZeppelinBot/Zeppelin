import { BasePluginType, guildPluginEventListener } from "vety";
import z from "zod";
import { AliasMatcher } from "./functions/buildAliasMatchers.js";

export const zCommandAliasesConfig = z.strictObject({
  aliases: z.record(z.string().min(1), z.string().min(1)).optional(),
});

export interface CommandAliasesPluginType extends BasePluginType {
  configSchema: typeof zCommandAliasesConfig;
  state: {
    matchers: AliasMatcher[];
  };
}

export const commandAliasesEvt = guildPluginEventListener<CommandAliasesPluginType>();
