import * as t from "io-ts";
import { automodAction } from "../helpers";
import { setAntiraidLevel } from "../functions/setAntiraidLevel";

export const SetAntiraidLevelAction = automodAction({
  configType: t.string,
  defaultConfig: "",

  async apply({ pluginData, contexts, actionConfig }) {
    setAntiraidLevel(pluginData, actionConfig);
  },
});
