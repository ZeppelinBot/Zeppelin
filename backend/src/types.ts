import { BaseConfig, GlobalPluginBlueprint, GuildPluginBlueprint, Knub } from "knub";
import z, { ZodTypeAny } from "zod";
import { zSnowflake } from "./utils.js";

export interface ZeppelinGuildConfig extends BaseConfig {
  success_emoji?: string;
  error_emoji?: string;

  // Deprecated
  timezone?: string;
  date_formats?: any;
}

export const zZeppelinGuildConfig = z.strictObject({
  // From BaseConfig
  prefix: z.string().optional(),
  levels: z.record(zSnowflake, z.number()).optional(),
  plugins: z.record(z.string(), z.unknown()).optional(),

  // From ZeppelinGuildConfig
  success_emoji: z.string().optional(),
  error_emoji: z.string().optional(),

  // Deprecated
  timezone: z.string().optional(),
  date_formats: z.unknown().optional(),
});

export type TZeppelinKnub = Knub;

/**
 * Wrapper for the string type that indicates the text will be parsed as Markdown later
 */
export type TMarkdown = string;

export interface ZeppelinGuildPluginInfo {
  plugin: GuildPluginBlueprint<any, any>;
  docs: ZeppelinPluginDocs;
  autoload?: boolean;
}

export interface ZeppelinGlobalPluginInfo {
  plugin: GlobalPluginBlueprint<any, any>;
  docs: ZeppelinPluginDocs;
}

export type DocsPluginType = "stable" | "legacy" | "internal";

export interface ZeppelinPluginDocs {
  type: DocsPluginType;
  configSchema: ZodTypeAny;

  prettyName?: string;
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
