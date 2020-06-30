import { BaseConfig, Knub } from "knub";

export interface IZeppelinGuildConfig extends BaseConfig<any> {
  success_emoji?: string;
  error_emoji?: string;
}

export interface IZeppelinGlobalConfig extends BaseConfig<any> {
  url: string;
  owners?: string[];
}

export type TZeppelinKnub = Knub<IZeppelinGuildConfig, IZeppelinGlobalConfig>;
