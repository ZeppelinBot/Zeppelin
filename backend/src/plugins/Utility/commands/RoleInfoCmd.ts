import { utilityCmd } from "../types";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage } from "../../../pluginUtils";
import { getRoleInfoEmbed } from "../functions/getRoleInfoEmbed";

export const RoleInfoCmd = utilityCmd({
  trigger: ["role", "roleinfo"],
  description: "Show information about a role",
  usage: "!role 106391128718245888",
  permission: "can_roleinfo",

  signature: {
    role: ct.role({ required: true }),
  },

  async run({ message, args, pluginData }) {
    const embed = await getRoleInfoEmbed(pluginData, args.role, message.author.id);
    message.channel.createMessage({ embed });
  },
});
