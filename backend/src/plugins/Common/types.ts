import * as t from "io-ts";
import { BasePluginType } from "knub";

export const ConfigSchema = t.type({
  success_emoji: t.string,
  error_emoji: t.string,
});

export type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

export interface CommonPluginType extends BasePluginType {
  config: TConfigSchema;
}
