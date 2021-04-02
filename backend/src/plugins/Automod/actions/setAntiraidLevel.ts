import * as t from "io-ts";
import { automodAction } from "../helpers";
import { setAntiraidLevel } from "../functions/setAntiraidLevel";
import { tNullable } from "../../../utils";

export const SetAntiraidLevelAction = automodAction({
  configType: tNullable(t.string),
  defaultConfig: "",

  async apply({ pluginData, contexts, actionConfig }) {
    setAntiraidLevel(pluginData, actionConfig ?? null);
  },
});
