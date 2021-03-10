import * as t from "io-ts";
import { automodTrigger } from "../helpers";

// tslint:disable-next-line:no-empty-interface
interface WarnTriggerResultType {}

export const WarnTrigger = automodTrigger<WarnTriggerResultType>()({
  configType: t.type({}),
  defaultConfig: {},

  async match({ context }) {
    if (context.modAction?.type !== "warn") {
      return;
    }

    return {
      extra: {},
    };
  },

  renderMatchInformation({ matchResult }) {
    return `User was warned`;
  },
});
