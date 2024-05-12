import { Knub } from "knub";
import z, { ZodTypeAny } from "zod";
import { zSnowflake } from "./utils";

export const zZeppelinGuildConfig = z.strictObject({
  // From BaseConfig
  prefix: z.string().optional(),
  levels: z.record(zSnowflake, z.number()).optional(),
  plugins: z.record(z.string(), z.unknown()).optional(),
});

export type TZeppelinKnub = Knub;

/**
 * Wrapper for the string type that indicates the text will be parsed as Markdown later
 */
export type TMarkdown = string;

export interface ZeppelinPluginInfo {
  showInDocs: boolean;
  prettyName: string;
  description?: TMarkdown;
  usageGuide?: TMarkdown;
  configurationGuide?: TMarkdown;
  legacy?: boolean;
  configSchema?: ZodTypeAny;
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
