import { MessageEmbedOptions } from "discord.js";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage } from "../../../pluginUtils";
import { UnknownUser } from "../../../utils";
import { utilityCmd } from "../types";

export const AvatarCmd = utilityCmd({
  trigger: ["avatar", "av"],
  description: "Retrieves a user's profile picture",
  permission: "can_avatar",

  signature: {
    user: ct.resolvedUserLoose({ required: false }),
  },

  async run({ message: msg, args, pluginData }) {
    const user = args.user || msg.author;
    if (!(user instanceof UnknownUser)) {
      const embed: MessageEmbedOptions = {
        image: {
          url: user.displayAvatarURL({ dynamic: true, format: "png", size: 2048 }),
        },
        title: `Avatar of ${user.tag}:`,
      };
      msg.channel.send({ embeds: [embed] });
    } else {
      sendErrorMessage(pluginData, msg.channel, "Invalid user ID");
    }
  },
});
