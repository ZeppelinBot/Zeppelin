import { utilityCmd } from "../types";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { downloadFile, messageLink, SECONDS, UnknownUser } from "../../../utils";
import { sendErrorMessage } from "../../../pluginUtils";
import { EmbedOptions, TextChannel } from "eris";
import { activeReloads } from "../guildReloads";

export const AvatarCmd = utilityCmd({
  trigger: "avatar",
  description: "Retrieves a user's profile picture",
  permission: "can_avatar",

  signature: {
    user: ct.resolvedUserLoose(),
  },

  async run({ message: msg, args, pluginData }) {
    const user = args.user || msg.author;
    if (!(user instanceof UnknownUser)) {
      const extention = user.avatarURL.slice(user.avatarURL.lastIndexOf("."), user.avatarURL.lastIndexOf("?"));
      const avatarUrl = user.avatarURL.slice(0, user.avatarURL.lastIndexOf("."));
      const embed: EmbedOptions = {
        image: { url: avatarUrl + `${extention}?size=2048` },
      };
      embed.title = `Avatar of ${user.username}#${user.discriminator}:`;
      msg.channel.createMessage({ embed });
    } else {
      sendErrorMessage(pluginData, msg.channel, "Invalid user ID");
    }
  },
});
