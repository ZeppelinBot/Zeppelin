import { GlobalPlugin, IBasePluginConfig, IPluginOptions, logger } from "knub";
import { PluginRuntimeError } from "../PluginRuntimeError";
import * as t from "io-ts";
import { pipe } from "fp-ts/lib/pipeable";
import { fold } from "fp-ts/lib/Either";
import { PathReporter } from "io-ts/lib/PathReporter";
import { deepKeyIntersect, isSnowflake, isUnicodeEmoji, resolveMember, resolveUser, UnknownUser } from "../utils";
import { Member, User } from "eris";
import { performance } from "perf_hooks";
import { decodeAndValidateStrict, StrictValidationError } from "../validatorUtils";
import { mergeConfig } from "knub/dist/configUtils";

const SLOW_RESOLVE_THRESHOLD = 1500;

export class GlobalZeppelinPlugin<TConfig extends {} = IBasePluginConfig> extends GlobalPlugin<TConfig> {
  protected static configSchema: t.TypeC<any>;
  public static dependencies = [];

  /**
   * Since we want to do type checking without creating instances of every plugin,
   * we need a static version of getDefaultOptions(). This static version is then,
   * by turn, called from getDefaultOptions() so everything still works as expected.
   */
  protected static getStaticDefaultOptions() {
    // Implemented by plugin
    return {};
  }

  /**
   * Wrapper to fetch the real default options from getStaticDefaultOptions()
   */
  protected getDefaultOptions(): IPluginOptions<TConfig> {
    return (this.constructor as typeof GlobalZeppelinPlugin).getStaticDefaultOptions() as IPluginOptions<TConfig>;
  }

  /**
   * Merges the given options and default options and decodes them according to the config schema of the plugin (if any).
   * Throws on any decoding/validation errors.
   *
   * Intended as an augmented, static replacement for Plugin.getMergedConfig() which is why this is also called from
   * getMergedConfig().
   *
   * Like getStaticDefaultOptions(), we also want to use this function for type checking without creating an instance of
   * the plugin, which is why this has to be a static function.
   */
  protected static mergeAndDecodeStaticOptions(options: any): IPluginOptions {
    const defaultOptions: any = this.getStaticDefaultOptions();
    const mergedConfig = mergeConfig({}, defaultOptions.config || {}, options.config || {});
    const mergedOverrides = options["=overrides"]
      ? options["=overrides"]
      : (options.overrides || []).concat(defaultOptions.overrides || []);

    const decodedConfig = this.configSchema ? decodeAndValidateStrict(this.configSchema, mergedConfig) : mergedConfig;
    if (decodedConfig instanceof StrictValidationError) {
      throw decodedConfig;
    }

    const decodedOverrides = [];
    for (const override of mergedOverrides) {
      const overrideConfigMergedWithBaseConfig = mergeConfig({}, mergedConfig, override.config);
      const decodedOverrideConfig = this.configSchema
        ? decodeAndValidateStrict(this.configSchema, overrideConfigMergedWithBaseConfig)
        : overrideConfigMergedWithBaseConfig;
      if (decodedOverrideConfig instanceof StrictValidationError) {
        throw decodedOverrideConfig;
      }
      decodedOverrides.push({ ...override, config: deepKeyIntersect(decodedOverrideConfig, override.config) });
    }

    return {
      config: decodedConfig,
      overrides: decodedOverrides,
    };
  }

  /**
   * Wrapper that calls mergeAndValidateStaticOptions()
   */
  protected getMergedOptions(): IPluginOptions<TConfig> {
    if (!this.mergedPluginOptions) {
      this.mergedPluginOptions = ((this
        .constructor as unknown) as typeof GlobalZeppelinPlugin).mergeAndDecodeStaticOptions(this.pluginOptions);
    }

    return this.mergedPluginOptions as IPluginOptions<TConfig>;
  }

  /**
   * Run static type checks and other validations on the given options
   */
  public static validateOptions(options: any): string[] | null {
    // Validate config values
    if (this.configSchema) {
      try {
        this.mergeAndDecodeStaticOptions(options);
      } catch (e) {
        if (e instanceof StrictValidationError) {
          return e.getErrors();
        }

        throw e;
      }
    }

    // No errors, return null
    return null;
  }

  public async runLoad(): Promise<any> {
    const mergedOptions = this.getMergedOptions(); // This implicitly also validates the config
    return super.runLoad();
  }

  protected isOwner(userId) {
    const owners = this.knub.getGlobalConfig().owners || [];
    return owners.includes(userId);
  }
}
