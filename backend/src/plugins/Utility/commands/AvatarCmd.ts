import { utilityCmd } from "../types";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { UnknownUser } from "../../../utils";
import { sendErrorMessage } from "../../../pluginUtils";
import { EmbedOptions } from "eris";

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
      let extension = user.avatarURL.slice(user.avatarURL.lastIndexOf("."), user.avatarURL.lastIndexOf("?"));
      // Some pngs can have the .jpg extension for some reason, so we always use .png for static images
      extension = extension === ".gif" ? extension : ".png";
      const avatarUrl = user.avatarURL.slice(0, user.avatarURL.lastIndexOf("."));
      const embed: EmbedOptions = {
        image: { url: avatarUrl + `${extension}?size=2048` },
      };
      embed.title = `Avatar of ${user.username}#${user.discriminator}:`;
      msg.channel.createMessage({ embed });
    } else {
      sendErrorMessage(pluginData, msg.channel, "Invalid user ID");
    }
  },
});
