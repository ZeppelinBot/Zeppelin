import * as t from "io-ts";
import { automodTrigger } from "../helpers";

// tslint:disable-next-line:no-empty-interface
interface UnmuteTriggerResultType {}

export const UnmuteTrigger = automodTrigger<UnmuteTriggerResultType>()({
  configType: t.type({}),
  defaultConfig: {},

  async match({ context }) {
    if (context.modAction?.type !== "unmute") {
      return;
    }

    return {
      extra: {},
    };
  },

  renderMatchInformation({ matchResult }) {
    return `User was unmuted`;
  },
});
