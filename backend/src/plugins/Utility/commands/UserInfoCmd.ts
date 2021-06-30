import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage } from "../../../pluginUtils";
import { getUserInfoEmbed } from "../functions/getUserInfoEmbed";
import { utilityCmd } from "../types";

export const UserInfoCmd = utilityCmd({
  trigger: ["user", "userinfo", "whois"],
  description: "Show information about a user",
  usage: "!user 106391128718245888",
  permission: "can_userinfo",

  signature: {
    user: ct.resolvedUserLoose({ required: false }),

    compact: ct.switchOption({ def: false, shortcut: "c" }),
  },

  async run({ message, args, pluginData }) {
    const userId = args.user?.id || message.author.id;
    const embed = await getUserInfoEmbed(pluginData, userId, args.compact, message.author.id);
    if (!embed) {
      sendErrorMessage(pluginData, message.channel, "User not found");
      return;
    }

    message.channel.send({ embeds: [embed] });
  },
});
