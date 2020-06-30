import * as t from "io-ts";
import { IPluginOptions } from "knub";
import { pipe } from "fp-ts/lib/pipeable";
import { fold } from "fp-ts/lib/Either";
import { PathReporter } from "io-ts/lib/PathReporter";
import { availablePlugins } from "./plugins/availablePlugins";
import { ZeppelinPluginClass } from "./plugins/ZeppelinPluginClass";
import { decodeAndValidateStrict, StrictValidationError } from "./validatorUtils";

const pluginNameToClass = new Map<string, typeof ZeppelinPluginClass>();
for (const pluginClass of availablePlugins) {
  // @ts-ignore
  pluginNameToClass.set(pluginClass.pluginName, pluginClass);
}

const guildConfigRootSchema = t.type({
  prefix: t.string,
  levels: t.record(t.string, t.number),
  success_emoji: t.string,
  plugins: t.record(t.string, t.unknown),
});
const partialGuildConfigRootSchema = t.partial(guildConfigRootSchema.props);

const globalConfigRootSchema = t.type({
  url: t.string,
  owners: t.array(t.string),
  plugins: t.record(t.string, t.unknown),
});

const partialMegaTest = t.partial({ name: t.string });

export function validateGuildConfig(config: any): string[] | null {
  const validationResult = decodeAndValidateStrict(partialGuildConfigRootSchema, config);
  if (validationResult instanceof StrictValidationError) return validationResult.getErrors();

  if (config.plugins) {
    for (const [pluginName, pluginOptions] of Object.entries(config.plugins)) {
      if (!pluginNameToClass.has(pluginName)) {
        return [`Unknown plugin: ${pluginName}`];
      }

      const pluginClass = pluginNameToClass.get(pluginName);
      let pluginErrors = pluginClass.validateOptions(pluginOptions);
      if (pluginErrors) {
        pluginErrors = pluginErrors.map(err => `${pluginName}: ${err}`);
        return pluginErrors;
      }
    }
  }

  return null;
}
