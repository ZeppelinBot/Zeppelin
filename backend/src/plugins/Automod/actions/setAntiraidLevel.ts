import * as t from "io-ts";
import { tNullable } from "../../../utils";
import { setAntiraidLevel } from "../functions/setAntiraidLevel";
import { automodAction } from "../helpers";

export const SetAntiraidLevelAction = automodAction({
  configType: tNullable(t.string),
  defaultConfig: "",

  async apply({ pluginData, contexts, actionConfig }) {
    setAntiraidLevel(pluginData, actionConfig ?? null);
  },
});
