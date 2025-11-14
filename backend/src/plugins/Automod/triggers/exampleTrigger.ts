import { z } from "zod";
import { automodTrigger } from "../helpers.js";

interface ExampleMatchResultType {
  isBanana: boolean;
}

const configSchema = z.strictObject({
  allowedFruits: z.array(z.string().max(100)).max(50).default(["peach", "banana"]),
});

export const ExampleTrigger = automodTrigger<ExampleMatchResultType>()({
  configSchema,

  async match({ triggerConfig, context }) {
    const foundFruit = triggerConfig.allowedFruits.find((fruit) => context.message?.data.content === fruit);
    if (foundFruit) {
      return {
        extra: {
          isBanana: foundFruit === "banana",
        },
      };
    }
  },

  renderMatchInformation({ matchResult }) {
    return `Matched fruit, isBanana: ${matchResult.extra.isBanana ? "yes" : "no"}`;
  },
});
