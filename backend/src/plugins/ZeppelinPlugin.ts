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
  MINUTES,
  resolveMember,
  resolveUser,
  resolveUserId,
  tDeepPartial,
  trimEmptyStartEndLines,
  trimIndents,
  UnknownUser,
  resolveRoleId,
} from "../utils";
import { Invite, Member, User } from "eris";
import DiscordRESTError from "eris/lib/errors/DiscordRESTError"; // tslint:disable-line
import { performance } from "perf_hooks";
import { decodeAndValidateStrict, StrictValidationError, validate } from "../validatorUtils";
import { SimpleCache } from "../SimpleCache";
import { Knub } from "knub/dist/Knub";
import { TZeppelinKnub } from "../types";

const SLOW_RESOLVE_THRESHOLD = 1500;

/**
 * Wrapper for the string type that indicates the text will be parsed as Markdown later
 */
type TMarkdown = string;

export interface PluginInfo {
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

export function trimPluginDescription(str) {
  const emptyLinesTrimmed = trimEmptyStartEndLines(str);
  const lines = emptyLinesTrimmed.split("\n");
  const firstLineIndentation = (lines[0].match(/^ +/g) || [""])[0].length;
  return trimIndents(emptyLinesTrimmed, firstLineIndentation);
}

const inviteCache = new SimpleCache<Promise<Invite>>(10 * MINUTES, 200);

export class ZeppelinPlugin<
  TConfig extends {} = IBasePluginConfig,
  TCustomOverrideCriteria extends {} = {}
> extends Plugin<TConfig, TCustomOverrideCriteria> {
  public static pluginInfo: PluginInfo;
  public static showInDocs: boolean = true;

  public static configSchema: t.TypeC<any>;
  public static dependencies = [];

  protected readonly knub: TZeppelinKnub;

  protected throwPluginRuntimeError(message: string) {
    throw new PluginRuntimeError(message, this.runtimePluginName, this.guildId);
  }

  protected canActOn(member1: Member, member2: Member, allowSameLevel = false) {
    if (member2.id === this.bot.user.id) {
      return false;
    }

    const ourLevel = this.getMemberLevel(member1);
    const memberLevel = this.getMemberLevel(member2);
    return allowSameLevel ? ourLevel >= memberLevel : ourLevel > memberLevel;
  }

  /**
   * Since we want to do type checking without creating instances of every plugin,
   * we need a static version of getDefaultOptions(). This static version is then,
   * by turn, called from getDefaultOptions() so everything still works as expected.
   */
  public static getStaticDefaultOptions() {
    // Implemented by plugin
    return {};
  }

  /**
   * Wrapper to fetch the real default options from getStaticDefaultOptions()
   */
  protected getDefaultOptions(): IPluginOptions<TConfig, TCustomOverrideCriteria> {
    return (this.constructor as typeof ZeppelinPlugin).getStaticDefaultOptions() as IPluginOptions<
      TConfig,
      TCustomOverrideCriteria
    >;
  }

  /**
   * Allows the plugin to preprocess the config before it's validated.
   * Useful for e.g. adding default properties to dynamic objects.
   */
  protected static preprocessStaticConfig(config: any) {
    return config;
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
    let mergedConfig = configUtils.mergeConfig({}, defaultOptions.config || {}, options.config || {});
    const mergedOverrides = options.replaceDefaultOverrides
      ? options.overrides
      : (defaultOptions.overrides || []).concat(options.overrides || []);

    // Before preprocessing the static config, do a loose check by checking the schema as deeply partial.
    // This way the preprocessing function can trust that if a property exists, its value will be the correct (partial) type.
    const initialLooseCheck = this.configSchema ? validate(tDeepPartial(this.configSchema), mergedConfig) : null;
    if (initialLooseCheck) {
      throw initialLooseCheck;
    }

    mergedConfig = this.preprocessStaticConfig(mergedConfig);

    const decodedConfig = this.configSchema ? decodeAndValidateStrict(this.configSchema, mergedConfig) : mergedConfig;
    if (decodedConfig instanceof StrictValidationError) {
      throw decodedConfig;
    }

    const decodedOverrides = [];
    for (const override of mergedOverrides) {
      const overrideConfigMergedWithBaseConfig = configUtils.mergeConfig({}, mergedConfig, override.config || {});
      const decodedOverrideConfig = this.configSchema
        ? decodeAndValidateStrict(this.configSchema, overrideConfigMergedWithBaseConfig)
        : overrideConfigMergedWithBaseConfig;
      if (decodedOverrideConfig instanceof StrictValidationError) {
        throw decodedOverrideConfig;
      }
      decodedOverrides.push({
        ...override,
        config: deepKeyIntersect(decodedOverrideConfig, override.config || {}),
      });
    }

    return {
      config: decodedConfig,
      overrides: decodedOverrides,
    };
  }

  /**
   * Wrapper that calls mergeAndValidateStaticOptions()
   */
  protected getMergedOptions(): IPluginOptions<TConfig, TCustomOverrideCriteria> {
    if (!this.mergedPluginOptions) {
      this.mergedPluginOptions = ((this.constructor as unknown) as typeof ZeppelinPlugin).mergeAndDecodeStaticOptions(
        this.pluginOptions,
      );
    }

    return this.mergedPluginOptions as IPluginOptions<TConfig, TCustomOverrideCriteria>;
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
  public getRuntimeOptions() {
    return this.getMergedOptions();
  }

  getUser(userResolvable: string): User | UnknownUser {
    const id = resolveUserId(this.bot, userResolvable);
    return id ? this.bot.users.get(id) || new UnknownUser({ id }) : new UnknownUser();
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
   * Resolves a role from the passed string. The passed string can be a role ID, a role mention or a role name.
   * In the event of duplicate role names, this function will return the first one it comes across.
   * @param roleResolvable
   */
  async resolveRoleId(roleResolvable: string): Promise<string | null> {
    const roleId = await resolveRoleId(this.bot, this.guildId, roleResolvable);
    return roleId;
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
      try {
        member = userId && (await this.bot.getRESTGuildMember(this.guild.id, userId));
      } catch (e) {
        if (!(e instanceof DiscordRESTError)) {
          throw e;
        }
      }

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

  async resolveInvite(code: string): Promise<Invite | null> {
    if (inviteCache.has(code)) {
      return inviteCache.get(code);
    }

    const promise = this.bot.getInvite(code).catch(() => null);
    inviteCache.set(code, promise);

    return promise;
  }
}
