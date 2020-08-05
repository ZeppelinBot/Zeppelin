import { utilityCmd } from "../types";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { getUserInfoEmbed } from "../functions/getUserInfoEmbed";
import { sendErrorMessage } from "../../../pluginUtils";

export const InfoCmd = utilityCmd({
  trigger: "info",
  description: "Show basic information about a user",
  usage: "!info 106391128718245888",
  permission: "can_info",

  signature: {
    user: ct.resolvedUserLoose({ required: false }),

    compact: ct.switchOption({ shortcut: "c" }),
  },

  async run({ message, args, pluginData }) {
    const embed = await getUserInfoEmbed(pluginData, args.user.id, args.compact);
    if (!embed) {
      sendErrorMessage(pluginData, message.channel, "User not found");
      return;
    }

    message.channel.createMessage({ embed });
  },
});
