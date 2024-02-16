import { zBoundedCharacters } from "../../../utils";
import { setAntiraidLevel } from "../functions/setAntiraidLevel";
import { automodAction } from "../helpers";

export const SetAntiraidLevelAction = automodAction({
  configSchema: zBoundedCharacters(0, 100).nullable(),

  async apply({ pluginData, actionConfig }) {
    setAntiraidLevel(pluginData, actionConfig ?? null);
  },
});
