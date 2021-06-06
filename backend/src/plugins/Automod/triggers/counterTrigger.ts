import * as t from "io-ts";
import { tNullable } from "../../../utils";
import { automodTrigger } from "../helpers";

// tslint:disable-next-line
interface CounterTriggerResult {}

export const CounterTrigger = automodTrigger<CounterTriggerResult>()({
  configType: t.type({
    counter: t.string,
    trigger: t.string,
    reverse: tNullable(t.boolean),
  }),

  defaultConfig: {},

  async match({ triggerConfig, context, pluginData }) {
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

  renderMatchInformation({ matchResult, pluginData, contexts, triggerConfig }) {
    let str = `Matched counter trigger \`${contexts[0].counterTrigger!.prettyCounter} / ${
      contexts[0].counterTrigger!.prettyTrigger
    }\``;
    if (contexts[0].counterTrigger!.reverse) {
      str += " (reverse)";
    }

    return str;
  },
});
