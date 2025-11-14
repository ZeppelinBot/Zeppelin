import { GuildFeature } from "discord.js";
import { z } from "zod";
import { automodAction } from "../helpers.js";

export const PauseInvitesAction = automodAction({
  configSchema: z.strictObject({
    paused: z.boolean(),
  }),

  async apply({ pluginData, actionConfig }) {
    const hasInvitesDisabled = pluginData.guild.features.includes(GuildFeature.InvitesDisabled);

    if (actionConfig.paused !== hasInvitesDisabled) {
      await pluginData.guild.disableInvites(actionConfig.paused);
    }
  },
});
