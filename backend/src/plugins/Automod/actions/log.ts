import * as t from "io-ts";
import { automodAction } from "../helpers";

export const LogAction = automodAction({
  configType: t.boolean,

  async apply({ pluginData, contexts, actionConfig }) {
    // TODO: Everything
  },
});
