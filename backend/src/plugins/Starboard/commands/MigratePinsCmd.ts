import { Snowflake, TextChannel } from "discord.js";
import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { starboardCmd } from "../types.js";
import { saveMessageToStarboard } from "../util/saveMessageToStarboard.js";

export const MigratePinsCmd = starboardCmd({
  trigger: "starboard migrate_pins",
  permission: "can_migrate",

  description: "Posts all pins from a channel to the specified starboard. The pins are NOT unpinned automatically.",

  signature: {
    pinChannel: ct.textChannel(),
    starboardName: ct.string(),
  },

  async run({ message: msg, args, pluginData }) {
    const config = pluginData.config.get();
    const starboard = config.boards[args.starboardName];
    if (!starboard) {
      void pluginData.state.common.sendErrorMessage(msg, "Unknown starboard specified");
      return;
    }

    const starboardChannel = pluginData.guild.channels.cache.get(starboard.channel_id as Snowflake);
    if (!starboardChannel || !(starboardChannel instanceof TextChannel)) {
      void pluginData.state.common.sendErrorMessage(msg, "Starboard has an unknown/invalid channel id");
      return;
    }

    msg.channel.send(`Migrating pins from <#${args.pinChannel.id}> to <#${starboardChannel.id}>...`);

    const pins = [...(await args.pinChannel.messages.fetchPinned().catch(() => [])).values()];
    pins.reverse(); // Migrate pins starting from the oldest message

    for (const pin of pins) {
      const existingStarboardMessage = await pluginData.state.starboardMessages.getMatchingStarboardMessages(
        starboardChannel.id,
        pin.id,
      );
      if (existingStarboardMessage.length > 0) continue;
      await saveMessageToStarboard(pluginData, pin, starboard);
    }

    void pluginData.state.common.sendSuccessMessage(
      msg,
      `Pins migrated from <#${args.pinChannel.id}> to <#${starboardChannel.id}>!`,
    );
  },
});
