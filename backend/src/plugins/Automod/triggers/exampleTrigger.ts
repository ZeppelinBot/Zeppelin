import * as t from "io-ts";
import { automodTrigger } from "../helpers";

interface ExampleMatchResultType {
  isBanana: boolean;
}

export const ExampleTrigger = automodTrigger<ExampleMatchResultType>()({
  configType: t.type({
    allowedFruits: t.array(t.string),
  }),

  defaultConfig: {
    allowedFruits: ["peach", "banana"],
  },

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
