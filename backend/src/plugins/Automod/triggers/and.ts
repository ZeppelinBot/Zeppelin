import { z } from "zod";
import { AutomodTriggerBlueprint, AutomodTriggerMatchResult, automodTrigger } from "../helpers.js";
import type { AutomodContext } from "../types.js";

interface AndTriggerMatchPart {
  triggerName: string;
  triggerConfig: unknown;
  matchResult: AutomodTriggerMatchResult;
}

interface AndTriggerMatchResultExtra {
  matches: AndTriggerMatchPart[];
}

interface CreateAndTriggerOpts {
  getAvailableTriggers: () => Record<string, AutomodTriggerBlueprint<any, any>>;
}

export function createAndTrigger({ getAvailableTriggers }: CreateAndTriggerOpts) {
  const triggerConfigSchema = z.lazy(() => {
    const triggers = getAvailableTriggers();
    const schemaShape: Record<string, z.ZodTypeAny> = {};

    for (const [triggerName, trigger] of Object.entries(triggers)) {
      schemaShape[triggerName] = trigger.configSchema;
    }

    return z
      .strictObject(schemaShape)
      .partial()
      .refine((val) => Object.values(val).some((v) => v !== undefined), {
        message: "Each sub-trigger must specify at least one trigger",
      });
  });

  return automodTrigger<AndTriggerMatchResultExtra>()({
    configSchema: z.object({
      triggers: z.array(triggerConfigSchema).min(1),
    }),

    async match({ ruleName, pluginData, context, triggerConfig }) {
      const matches: AndTriggerMatchPart[] = [];

      for (const subTriggerItem of triggerConfig.triggers) {
        const definedEntries = Object.entries(subTriggerItem).filter(([, v]) => v !== undefined);
        if (definedEntries.length < 1) {
          return null;
        }

        let matchedEntry: AndTriggerMatchPart | null = null;

        for (const [subTriggerName, subTriggerConfig] of definedEntries) {
          const subTrigger = getAvailableTriggers()[subTriggerName];
          if (!subTrigger) {
            continue;
          }

          const subMatch = await subTrigger.match({
            ruleName,
            pluginData,
            context,
            triggerConfig: subTriggerConfig,
          });

          if (subMatch) {
            matchedEntry = {
              triggerName: subTriggerName,
              triggerConfig: subTriggerConfig,
              matchResult: subMatch,
            };
            break;
          }
        }

        if (!matchedEntry) {
          return null;
        }

        matches.push(matchedEntry);
      }

      if (matches.length === 0) {
        return null;
      }

      const extraContexts = matches.flatMap((match) => match.matchResult.extraContexts ?? []);
      const silentClean = matches.some((match) => match.matchResult.silentClean);

      return {
        extraContexts: extraContexts.length > 0 ? extraContexts : undefined,
        silentClean: silentClean || undefined,
        extra: { matches },
      };
    },

    async renderMatchInformation({ ruleName, pluginData, contexts, matchResult }) {
      const availableTriggers = getAvailableTriggers();

      const parts = await Promise.all(
        matchResult.extra.matches.map(async (match) => {
          const trigger = availableTriggers[match.triggerName];
          if (!trigger) {
            return match.triggerName;
          }

          const triggerContexts: AutomodContext[] = [contexts[0], ...(match.matchResult.extraContexts ?? [])];

          return (
            (await trigger.renderMatchInformation({
              ruleName,
              pluginData,
              contexts: triggerContexts,
              triggerConfig: match.triggerConfig as never,
              matchResult: match.matchResult,
            })) ?? match.triggerName
          );
        }),
      );

      if (parts.length === 1) {
        return parts[0];
      }

      return `All ${parts.length} triggers matched:\n${parts.map((part) => `- ${part}`).join("\n")}`;
    },
  });
}
