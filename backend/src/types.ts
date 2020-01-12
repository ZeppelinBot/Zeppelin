import { IGlobalConfig, IGuildConfig, Knub } from "knub";

// Remove this tslint exception once there are properties in the interface
// tslint:disable-next-line
export interface IZeppelinGuildConfig extends IGuildConfig {
  // To fill
}

export interface IZeppelinGlobalConfig extends IGlobalConfig {
  url: string;
  owners?: string[];
}

export type TZeppelinKnub = Knub<IZeppelinGuildConfig, IZeppelinGlobalConfig>;
