import { GlobalPlugin, IBasePluginConfig, IPluginOptions, logger } from "knub";
import { PluginRuntimeError } from "../PluginRuntimeError";
import * as t from "io-ts";
import { pipe } from "fp-ts/lib/pipeable";
import { fold } from "fp-ts/lib/Either";
import { PathReporter } from "io-ts/lib/PathReporter";
import { isSnowflake, isUnicodeEmoji, resolveMember, resolveUser, UnknownUser } from "../utils";
import { Member, User } from "eris";
import { performance } from "perf_hooks";
import { validateStrict } from "../validatorUtils";

const SLOW_RESOLVE_THRESHOLD = 1500;

export class GlobalZeppelinPlugin<TConfig extends {} = IBasePluginConfig> extends GlobalPlugin<TConfig> {
  protected static configSchema: t.TypeC<any>;
  public static dependencies = [];

  public static validateOptions(options: IPluginOptions): string[] | null {
    // Validate config values
    if (this.configSchema) {
      if (options.config) {
        const errors = validateStrict(this.configSchema, options.config);
        if (errors) return errors;
      }

      if (options.overrides) {
        for (const override of options.overrides) {
          if (override.config) {
            const errors = validateStrict(this.configSchema, override.config);
            if (errors) return errors;
          }
        }
      }
    }

    // No errors, return null
    return null;
  }
}
