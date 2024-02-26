import { commandTypeHelpers as ct } from "../../../commandTypes";
import { CommonPlugin } from "../../Common/CommonPlugin";
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
    const embed = await getUserInfoEmbed(pluginData, userId, args.compact);
    if (!embed) {
      pluginData.getPlugin(CommonPlugin).sendErrorMessage(message, "User not found");
      return;
    }

    message.channel.send({ embeds: [embed] });
  },
});
