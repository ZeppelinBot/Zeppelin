import { IBasePluginConfig, IPluginOptions, logger, Plugin } from "knub";
import { PluginRuntimeError } from "../PluginRuntimeError";
import Ajv, { ErrorObject } from "ajv";
import { isSnowflake, isUnicodeEmoji, resolveMember, resolveUser, UnknownUser } from "../utils";
import { Member, User } from "eris";

import { performance } from "perf_hooks";

const SLOW_RESOLVE_THRESHOLD = 1500;

export class ZeppelinPlugin<TConfig extends {} = IBasePluginConfig> extends Plugin<TConfig> {
  protected configSchema: any;
  protected permissionsSchema: any;

  public static dependencies = [];

  protected throwPluginRuntimeError(message: string) {
    throw new PluginRuntimeError(message, this.runtimePluginName, this.guildId);
  }

  protected canActOn(member1, member2) {
    if (member1.id === member2.id) {
      return false;
    }

    const ourLevel = this.getMemberLevel(member1);
    const memberLevel = this.getMemberLevel(member2);
    return ourLevel > memberLevel;
  }

  public validateOptions(options: IPluginOptions): ErrorObject[] | null {
    // Validate config values
    if (this.configSchema) {
      const ajv = new Ajv();
      const validate = ajv.compile(this.configSchema);

      if (options.config) {
        const isValid = validate(options.config);
        if (!isValid) return validate.errors;
      }

      if (options.overrides) {
        for (const override of options.overrides) {
          if (override.config) {
            const isValid = validate(override.config);
            if (!isValid) return validate.errors;
          }
        }
      }
    }

    // No errors, return null
    return null;
  }

  public async runLoad(): Promise<any> {
    const mergedOptions = this.getMergedOptions();
    const validationErrors = this.validateOptions(mergedOptions);
    if (validationErrors) {
      throw new Error(`Invalid options:\n${validationErrors.join("\n")}`);
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
