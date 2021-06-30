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
      const avatar = user.avatarURL() || user.defaultAvatarURL;
      let extension = avatar.slice(avatar.lastIndexOf("."), avatar.lastIndexOf("?"));
      // Some pngs can have the .jpg extention for some reason, so we always use .png for static images
      extension = extension === ".gif" ? extension : ".png";
      const avatarUrl = avatar.slice(0, avatar.lastIndexOf("."));
      const embed: MessageEmbedOptions = {
        image: { url: avatarUrl + `${extension}?size=2048` },
      };
      embed.title = `Avatar of ${user.username}#${user.discriminator}:`;
      msg.channel.send({ embeds: [embed] });
    } else {
      sendErrorMessage(pluginData, msg.channel, "Invalid user ID");
    }
  },
});
