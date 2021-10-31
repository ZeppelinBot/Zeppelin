import * as t from "io-ts";
import { BasePluginType } from "knub";
import { tNullable } from "../../utils";

export const ConfigSchema = t.type({
  api_key: tNullable(t.string),
});
export type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

export interface PhishermanPluginType extends BasePluginType {
  config: TConfigSchema;

  state: {
    validApiKey: string | null;
  };
}
