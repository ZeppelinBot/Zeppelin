import { IBasePluginConfig, IPluginOptions, Plugin } from "knub";
import { PluginRuntimeError } from "../PluginRuntimeError";
import Ajv, { ErrorObject } from "ajv";
import { isSnowflake, isUnicodeEmoji } from "../utils";

export class ZeppelinPlugin<TConfig extends {} = IBasePluginConfig> extends Plugin<TConfig> {
  protected configSchema: any;
  protected permissionsSchema: any;

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
}
