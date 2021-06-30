import { Snowflake, TextChannel } from "discord.js";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { starboardCmd } from "../types";
import { saveMessageToStarboard } from "../util/saveMessageToStarboard";

export const MigratePinsCmd = starboardCmd({
  trigger: "starboard migrate_pins",
  permission: "can_migrate",

  description: "Posts all pins from a channel to the specified starboard. The pins are NOT unpinned automatically.",

  signature: {
    pinChannel: ct.textChannel(),
    starboardName: ct.string(),
  },

  async run({ message: msg, args, pluginData }) {
    const config = await pluginData.config.get();
    const starboard = config.boards[args.starboardName];
    if (!starboard) {
      sendErrorMessage(pluginData, msg.channel, "Unknown starboard specified");
      return;
    }

    const starboardChannel = pluginData.guild.channels.cache.get(starboard.channel_id as Snowflake);
    if (!starboardChannel || !(starboardChannel instanceof TextChannel)) {
      sendErrorMessage(pluginData, msg.channel, "Starboard has an unknown/invalid channel id");
      return;
    }

    msg.channel.send(`Migrating pins from <#${args.pinChannel.id}> to <#${starboardChannel.id}>...`);

    const pins = (await args.pinChannel.messages.fetchPinned()).array();
    pins.reverse(); // Migrate pins starting from the oldest message

    for (const pin of pins) {
      const existingStarboardMessage = await pluginData.state.starboardMessages.getMatchingStarboardMessages(
        starboardChannel.id,
        pin.id,
      );
      if (existingStarboardMessage.length > 0) continue;
      await saveMessageToStarboard(pluginData, pin, starboard);
    }

    sendSuccessMessage(
      pluginData,
      msg.channel,
      `Pins migrated from <#${args.pinChannel.id}> to <#${starboardChannel.id}>!`,
    );
  },
});
