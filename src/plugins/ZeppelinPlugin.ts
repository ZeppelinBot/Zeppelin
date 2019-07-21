import { IBasePluginConfig, IPluginOptions, logger, Plugin, configUtils } from "knub";
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

  protected static getStaticDefaultOptions() {
    // Implemented by plugin
    return {};
  }

  protected getDefaultOptions(): IPluginOptions<TConfig> {
    return (this.constructor as typeof ZeppelinPlugin).getStaticDefaultOptions() as IPluginOptions<TConfig>;
  }

  public static validateOptions(options: any): string[] | null {
    // Validate config values
    if (this.configSchema) {
      if (options.config) {
        const merged = configUtils.mergeConfig(
          {},
          (this.getStaticDefaultOptions() as any).config || {},
          options.config,
        );
        const errors = validateStrict(this.configSchema, merged);
        if (errors) {
          return errors;
        }
      }

      if (options.overrides) {
        for (const [i, override] of options.overrides.entries()) {
          if (override.config) {
            // For type checking overrides, apply default config + supplied config + any overrides preceding this override + finally this override
            // Exhaustive type checking would require checking against all combinations of preceding overrides but that's... costy. This will do for now.
            // TODO: Override default config retrieval functions and do some sort of memoized checking there?
            const merged = configUtils.mergeConfig(
              {},
              (this.getStaticDefaultOptions() as any).config || {},
              options.config || {},
              ...options.overrides.slice(0, i),
              override.config,
            );
            const errors = validateStrict(this.configSchema, merged);
            if (errors) {
              return errors;
            }
          }
        }
      }
    }

    // No errors, return null
    return null;
  }

  public async runLoad(): Promise<any> {
    const mergedOptions = this.getMergedOptions();
    const validationErrors = ((this.constructor as unknown) as typeof ZeppelinPlugin).validateOptions(mergedOptions);
    if (validationErrors) {
      throw new Error(validationErrors.join("\n"));
    }

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

  public getRegisteredCommands() {
    return this.commands.commands;
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
  async getMember(memberResolvable: string): Promise<Member> {
    const start = performance.now();
    const member = await resolveMember(this.bot, this.guild, memberResolvable);
    const time = performance.now() - start;
    if (time >= SLOW_RESOLVE_THRESHOLD) {
      const rounded = Math.round(time);
      logger.warn(`Slow member resolve (${rounded}ms): ${memberResolvable} in ${this.guild.name} (${this.guild.id})`);
    }
    return member;
  }
}
