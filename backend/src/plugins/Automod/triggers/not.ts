import { z } from "zod";
import { AutomodTriggerBlueprint, AutomodTriggerMatchResult, automodTrigger } from "../helpers.js";

interface NotTriggerMatchResultExtra {
  triggerNames: string[];
}

interface CreateNotTriggerOpts {
  getAvailableTriggers: () => Record<string, AutomodTriggerBlueprint<any, any>>;
}

export function createNotTrigger({ getAvailableTriggers }: CreateNotTriggerOpts) {
  const subTriggerSchema = z.lazy(() => {
    const triggers = getAvailableTriggers();
    const schemaShape: Record<string, z.ZodTypeAny> = {};

    for (const [triggerName, trigger] of Object.entries(triggers)) {
      schemaShape[triggerName] = trigger.configSchema;
    }

    return z
      .strictObject(schemaShape)
      .partial()
      .refine((val) => Object.values(val).some((v) => v !== undefined), {
        message: "Not trigger must specify at least one trigger",
      });
  });

  return automodTrigger<NotTriggerMatchResultExtra>()({
    configSchema: z.object({
      trigger: subTriggerSchema,
    }),

    async match({ ruleName, pluginData, context, triggerConfig }) {
      const definedEntries = Object.entries(triggerConfig.trigger).filter(([, v]) => v !== undefined);
      if (definedEntries.length < 1) {
        return null;
      }

      const testedNames: string[] = [];

      for (const [subTriggerName, subTriggerConfig] of definedEntries) {
        const subTrigger = getAvailableTriggers()[subTriggerName];
        if (!subTrigger) {
          continue;
        }

        testedNames.push(subTriggerName);

        const subMatch = await subTrigger.match({
          ruleName,
          pluginData,
          context,
          triggerConfig: subTriggerConfig,
        });

        if (subMatch) {
          return null;
        }
      }

      if (testedNames.length === 0) {
        return null;
      }

      const result: AutomodTriggerMatchResult<NotTriggerMatchResultExtra> = {
        extra: {
          triggerNames: testedNames,
        },
      };

      return result;
    },

    async renderMatchInformation({ matchResult }) {
      const names = matchResult.extra.triggerNames;
      if (names.length === 1) {
        return `Did not match ${names[0]}`;
      }

      return `Did not match any of: ${names.join(", ")}`;
    },
  });
}
