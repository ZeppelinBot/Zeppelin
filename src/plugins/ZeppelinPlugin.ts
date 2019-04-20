import { IBasePluginConfig, IPluginOptions, Plugin } from "knub";
import { PluginRuntimeError } from "../PluginRuntimeError";
import Ajv, { ErrorObject } from "ajv";
import { createUnknownUser, isSnowflake, isUnicodeEmoji, UnknownUser } from "../utils";
import { Member, User } from "eris";

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
    if (userResolvable == null) {
      return createUnknownUser();
    }

    let userId;

    // A user mention?
    const mentionMatch = userResolvable.match(/^<@!?(\d+)>$/);
    if (mentionMatch) {
      userId = mentionMatch[1];
    }

    // A non-mention, full username?
    if (!userId) {
      const usernameMatch = userResolvable.match(/^@?([^#]+)#(\d{4})$/);
      if (usernameMatch) {
        const user = this.bot.users.find(u => u.username === usernameMatch[1] && u.discriminator === usernameMatch[2]);
        userId = user.id;
      }
    }

    // Just a user ID?
    if (!userId) {
      const idMatch = userResolvable.match(/^\d+$/);
      if (!idMatch) {
        return null;
      }

      userId = userResolvable;
    }

    const cachedUser = this.bot.users.find(u => u.id === userId);
    if (cachedUser) return cachedUser;

    try {
      const freshUser = await this.bot.getRESTUser(userId);
      return freshUser;
    } catch (e) {} // tslint:disable-line

    return createUnknownUser({ id: userId });
  }

  async getMember(userId: string): Promise<Member> {
    // See if we have the member cached...
    let member = this.guild.members.get(userId);

    // If not, fetch it from the API
    if (!member) {
      try {
        member = await this.bot.getRESTGuildMember(this.guildId, userId);
      } catch (e) {} // tslint:disable-line
    }

    return member;
  }
}
