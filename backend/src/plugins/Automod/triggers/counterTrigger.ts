import { z } from "zod";
import { automodTrigger } from "../helpers.js";

// tslint:disable-next-line
interface CounterTriggerResult {}

const configSchema = z.strictObject({
  counter: z.string().max(100),
  trigger: z.string().max(100),
  reverse: z.boolean().optional(),
});

export const CounterTrigger = automodTrigger<CounterTriggerResult>()({
  configSchema,

  async match({ triggerConfig, context }) {
    if (!context.counterTrigger) {
      return;
    }

    if (context.counterTrigger.counter !== triggerConfig.counter) {
      return;
    }

    if (context.counterTrigger.trigger !== triggerConfig.trigger) {
      return;
    }

    const reverse = triggerConfig.reverse ?? false;
    if (context.counterTrigger.reverse !== reverse) {
      return;
    }

    return {
      extra: {},
    };
  },

  renderMatchInformation({ contexts }) {
    let str = `Matched counter trigger \`${contexts[0].counterTrigger!.prettyCounter} / ${
      contexts[0].counterTrigger!.prettyTrigger
    }\``;
    if (contexts[0].counterTrigger!.reverse) {
      str += " (reverse)";
    }

    return str;
  },
});
