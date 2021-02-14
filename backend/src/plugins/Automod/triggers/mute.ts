import * as t from "io-ts";
import { automodTrigger } from "../helpers";

// tslint:disable-next-line:no-empty-interface
interface MuteTriggerResultType {}

export const MuteTrigger = automodTrigger<MuteTriggerResultType>()({
  configType: t.type({}),
  defaultConfig: {},

  async match({ context }) {
    if (context.modAction?.type !== "mute") {
      return;
    }

    return {
      extra: {},
    };
  },

  renderMatchInformation({ matchResult }) {
    return `User was muted`;
  },
});
