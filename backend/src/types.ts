import { BaseConfig, Knub } from "knub";
import * as t from "io-ts";

export interface ZeppelinGuildConfig extends BaseConfig<any> {
  success_emoji?: string;
  error_emoji?: string;

  // Deprecated
  timezone?: string;
  date_formats?: any;
}

export const ZeppelinGuildConfigSchema = t.type({
  // From BaseConfig
  prefix: t.string,
  levels: t.record(t.string, t.number),
  plugins: t.record(t.string, t.unknown),

  // From ZeppelinGuildConfig
  success_emoji: t.string,
  error_emoji: t.string,

  // Deprecated
  timezone: t.string,
  date_formats: t.unknown,

  // YAML Stuff
  aliases: t.unknown,
});
export const PartialZeppelinGuildConfigSchema = t.partial(ZeppelinGuildConfigSchema.props);

export interface ZeppelinGlobalConfig extends BaseConfig<any> {
  url: string;
  owners?: string[];
}

export const ZeppelinGlobalConfigSchema = t.type({
  url: t.string,
  owners: t.array(t.string),
  plugins: t.record(t.string, t.unknown),
});

export type TZeppelinKnub = Knub<ZeppelinGuildConfig, ZeppelinGlobalConfig>;

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
