import { APIEmbed, ImageFormat } from "discord.js";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { UnknownUser, renderUsername } from "../../../utils";
import { CommonPlugin } from "../../Common/CommonPlugin";
import { utilityCmd } from "../types";

export const AvatarCmd = utilityCmd({
  trigger: ["avatar", "av"],
  description: "Retrieves a user's profile picture",
  permission: "can_avatar",

  signature: {
    user: ct.resolvedMember({ required: false }) || ct.resolvedUserLoose({ required: false }),
  },

  async run({ message: msg, args, pluginData }) {
    const user = args.user ?? msg.member ?? msg.author;
    if (!(user instanceof UnknownUser)) {
      const embed: APIEmbed = {
        image: {
          url: user.displayAvatarURL({ extension: ImageFormat.PNG, size: 2048 }),
        },
        title: `Avatar of ${renderUsername(user)}:`,
      };
      msg.channel.send({ embeds: [embed] });
    } else {
      pluginData.getPlugin(CommonPlugin).sendErrorMessage(msg, "Invalid user ID");
    }
  },
});
