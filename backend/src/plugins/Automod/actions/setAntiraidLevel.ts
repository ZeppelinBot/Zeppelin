import { zBoundedCharacters } from "../../../utils.js";
import { setAntiraidLevel } from "../functions/setAntiraidLevel.js";
import { automodAction } from "../helpers.js";

export const SetAntiraidLevelAction = automodAction({
  configSchema: zBoundedCharacters(0, 100).nullable(),

  async apply({ pluginData, actionConfig }) {
    setAntiraidLevel(pluginData, actionConfig ?? null);
  },
});
