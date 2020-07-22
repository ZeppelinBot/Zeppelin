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

/**
 * Wrapper for the string type that indicates the text will be parsed as Markdown later
 */
export type TMarkdown = string;

export interface ZeppelinPluginInfo {
  prettyName: string;
  description?: TMarkdown;
  usageGuide?: TMarkdown;
  configurationGuide?: TMarkdown;
}

export interface CommandInfo {
  description?: TMarkdown;
  basicUsage?: TMarkdown;
  examples?: TMarkdown;
  usageGuide?: TMarkdown;
  parameterDescriptions?: {
    [key: string]: TMarkdown;
  };
  optionDescriptions?: {
    [key: string]: TMarkdown;
  };
}
