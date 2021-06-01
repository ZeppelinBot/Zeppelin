import { mutesCmd } from "../types";

import { sendSuccessMessage } from "../../../pluginUtils";

export const ClearBannedMutesCmd = mutesCmd({
  trigger: "clear_banned_mutes",
  permission: "can_cleanup",
  description: "Clear dangling mutes for members who have been banned",

  async run({ pluginData, message: msg }) {
    await msg.channel.createMessage("Clearing mutes from banned users...");

    const activeMutes = await pluginData.state.mutes.getActiveMutes();

    // Mismatch in Eris docs and actual result here, based on Eris's code comments anyway
    const bans: Array<{ reason: string; user: User }> = (await pluginData.guild.getBans()) as any;
    const bannedIds = bans.map(b => b.user.id);

    await msg.channel.createMessage(
      `Found ${activeMutes.length} mutes and ${bannedIds.length} bans, cross-referencing...`,
    );

    let cleared = 0;
    for (const mute of activeMutes) {
      if (bannedIds.includes(mute.user_id)) {
        await pluginData.state.mutes.clear(mute.user_id);
        cleared++;
      }
    }

    sendSuccessMessage(pluginData, msg.channel, `Cleared ${cleared} mutes from banned users!`);
  },
});
