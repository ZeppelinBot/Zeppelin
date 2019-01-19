import { IPluginOptions, Plugin } from "knub";
import { PluginRuntimeError } from "../PluginRuntimeError";
import Ajv, { ErrorObject } from "ajv";

export class ZeppelinPlugin extends Plugin {
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

    // Validate permission values
    if (this.permissionsSchema) {
      const ajv = new Ajv();
      const validate = ajv.compile(this.permissionsSchema);

      if (options.permissions) {
        const isValid = validate(options.permissions);
        if (!isValid) return validate.errors;
      }

      if (options.overrides) {
        for (const override of options.overrides) {
          if (override.permissions) {
            const isValid = validate(override.permissions);
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

    return this.onLoad();
  }
}
