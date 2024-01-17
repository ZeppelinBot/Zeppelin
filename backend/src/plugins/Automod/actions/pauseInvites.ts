import { GuildFeature } from "discord.js";
import * as t from "io-ts";
import { automodAction } from "../helpers";

export const PauseInvitesAction = automodAction({
  configType: t.type({
    paused: t.boolean,
  }),

  defaultConfig: {},

  async apply({ pluginData, actionConfig }) {
    const hasInvitesDisabled = pluginData.guild.features.includes(GuildFeature.InvitesDisabled);

    if (actionConfig.paused !== hasInvitesDisabled) {
      await pluginData.guild.disableInvites(actionConfig.paused);
    }
  },
});
