import * as t from "io-ts";
import { automodTrigger } from "../helpers";

// tslint:disable-next-line:no-empty-interface
interface UnbanTriggerResultType {}

export const UnbanTrigger = automodTrigger<UnbanTriggerResultType>()({
  configType: t.type({}),
  defaultConfig: {},

  async match({ context }) {
    if (context.modAction?.type !== "unban") {
      return;
    }

    return {
      extra: {},
    };
  },

  renderMatchInformation({ matchResult }) {
    return `User was unbanned`;
  },
});
