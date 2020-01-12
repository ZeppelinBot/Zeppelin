import { IGlobalConfig, IGuildConfig, Knub } from "knub";

export interface IZeppelinGuildConfig extends IGuildConfig {
  success_emoji?: string;
  error_emoji?: string;
}

export interface IZeppelinGlobalConfig extends IGlobalConfig {
  url: string;
  owners?: string[];
}

export type TZeppelinKnub = Knub<IZeppelinGuildConfig, IZeppelinGlobalConfig>;
