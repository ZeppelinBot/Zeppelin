import * as t from "io-ts";
import { automodAction } from "../helpers";

export const ToggleInvitesAction = automodAction({
  configType: t.type({
    enabled: t.boolean,
  }),
  defaultConfig: {},

  async apply({ pluginData, actionConfig }) {
    await pluginData.guild.disableInvites(!actionConfig.enabled);
  },
});
