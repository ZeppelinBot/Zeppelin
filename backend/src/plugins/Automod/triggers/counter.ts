import * as t from "io-ts";
import { automodTrigger } from "../helpers";
import { consumeIgnoredRoleChange } from "../functions/ignoredRoleChanges";
import { CountersPlugin } from "../../Counters/CountersPlugin";
import { tNullable } from "../../../utils";

// tslint:disable-next-line
interface CounterTriggerResult {}

export const CounterTrigger = automodTrigger<CounterTriggerResult>()({
  configType: t.type({
    name: t.string,
    condition: t.string,
    reverse: tNullable(t.boolean),
  }),

  defaultConfig: {},

  async match({ triggerConfig, context, pluginData }) {
    if (!context.counterTrigger) {
      return;
    }

    if (context.counterTrigger.name !== triggerConfig.name) {
      return;
    }

    if (context.counterTrigger.condition !== triggerConfig.condition) {
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
    // TODO: Show user, channel, reverse
    return `Matched counter \`${triggerConfig.name} ${triggerConfig.condition}\``;
  },
});
