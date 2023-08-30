import * as t from "io-ts";
import { automodAction } from "../helpers";

export const PauseInvitesAction = automodAction({
  configType: t.type({
    paused: t.boolean,
  }),

  defaultConfig: {},

  async apply({ pluginData, actionConfig }) {
    await pluginData.guild.disableInvites(actionConfig.paused);
  },
});
