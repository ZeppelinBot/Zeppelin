import { IBasePluginConfig, IPluginOptions, logger, Plugin, configUtils } from "knub";
import { PluginRuntimeError } from "../PluginRuntimeError";
import * as t from "io-ts";
import { pipe } from "fp-ts/lib/pipeable";
import { fold } from "fp-ts/lib/Either";
import { PathReporter } from "io-ts/lib/PathReporter";
import {
  deepKeyIntersect,
  isSnowflake,
  isUnicodeEmoji,
  resolveMember,
  resolveUser,
  resolveUserId,
  UnknownUser,
} from "../utils";
import { Member, User } from "eris";
import { performance } from "perf_hooks";
import { decodeAndValidateStrict, StrictValidationError } from "../validatorUtils";
import { mergeConfig } from "knub/dist/configUtils";

const SLOW_RESOLVE_THRESHOLD = 1500;

export class ZeppelinPlugin<TConfig extends {} = IBasePluginConfig> extends Plugin<TConfig> {
  protected static configSchema: t.TypeC<any>;
  public static dependencies = [];

  protected throwPluginRuntimeError(message: string) {
    throw new PluginRuntimeError(message, this.runtimePluginName, this.guildId);
  }

  protected canActOn(member1, member2) {
    if (member1.id === member2.id || member2.id === this.bot.user.id) {
      return false;
    }

    const ourLevel = this.getMemberLevel(member1);
    const memberLevel = this.getMemberLevel(member2);
    return ourLevel > memberLevel;
  }

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
    return (this.constructor as typeof ZeppelinPlugin).getStaticDefaultOptions() as IPluginOptions<TConfig>;
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
      const overrideConfigMergedWithBaseConfig = mergeConfig({}, mergedConfig, override.config || {});
      const decodedOverrideConfig = this.configSchema
        ? decodeAndValidateStrict(this.configSchema, overrideConfigMergedWithBaseConfig)
        : overrideConfigMergedWithBaseConfig;
      if (decodedOverrideConfig instanceof StrictValidationError) {
        throw decodedOverrideConfig;
      }
      decodedOverrides.push({ ...override, config: deepKeyIntersect(decodedOverrideConfig, override.config || {}) });
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
      this.mergedPluginOptions = ((this.constructor as unknown) as typeof ZeppelinPlugin).mergeAndDecodeStaticOptions(
        this.pluginOptions,
      );
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

  public canUseEmoji(snowflake): boolean {
    if (isUnicodeEmoji(snowflake)) {
      return true;
    } else if (isSnowflake(snowflake)) {
      for (const guild of this.bot.guilds.values()) {
        if (guild.emojis.some(e => (e as any).id === snowflake)) {
          return true;
        }
      }
    } else {
      throw new PluginRuntimeError(`Invalid emoji: ${snowflake}`, this.runtimePluginName, this.guildId);
    }
  }

  /**
   * Intended for cross-plugin functionality
   */
  public getRegisteredCommands() {
    return this.commands.commands;
  }

  /**
   * Intended for cross-plugin functionality
   */
  public getRuntimeOptions() {
    return this.getMergedOptions();
  }

  /**
   * Resolves a user from the passed string. The passed string can be a user id, a user mention, a full username (with discrim), etc.
   * If the user is not found in the cache, it's fetched from the API.
   */
  async resolveUser(userResolvable: string): Promise<User | UnknownUser> {
    const start = performance.now();
    const user = await resolveUser(this.bot, userResolvable);
    const time = performance.now() - start;
    if (time >= SLOW_RESOLVE_THRESHOLD) {
      const rounded = Math.round(time);
      logger.warn(`Slow user resolve (${rounded}ms): ${userResolvable}`);
    }
    return user;
  }

  /**
   * Resolves a member from the passed string. The passed string can be a user id, a user mention, a full username (with discrim), etc.
   * If the member is not found in the cache, it's fetched from the API.
   */
  async getMember(memberResolvable: string, forceFresh = false): Promise<Member> {
    const start = performance.now();

    let member;
    if (forceFresh) {
      const userId = await resolveUserId(this.bot, memberResolvable);
      member = userId && (await this.bot.getRESTGuildMember(this.guild.id, userId));
      if (member) member.id = member.user.id;
    } else {
      member = await resolveMember(this.bot, this.guild, memberResolvable);
    }

    const time = performance.now() - start;
    if (time >= SLOW_RESOLVE_THRESHOLD) {
      const rounded = Math.round(time);
      logger.warn(`Slow member resolve (${rounded}ms): ${memberResolvable} in ${this.guild.name} (${this.guild.id})`);
    }

    return member;
  }
}
