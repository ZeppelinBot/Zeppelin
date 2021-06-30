import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage } from "../../../pluginUtils";
import { getServerInfoEmbed } from "../functions/getServerInfoEmbed";
import { utilityCmd } from "../types";

export const ServerInfoCmd = utilityCmd({
  trigger: ["server", "serverinfo"],
  description: "Show server information",
  usage: "!server",
  permission: "can_server",

  signature: {
    serverId: ct.string({ required: false }),
  },

  async run({ message, pluginData, args }) {
    const serverId = args.serverId || pluginData.guild.id;
    const serverInfoEmbed = await getServerInfoEmbed(pluginData, serverId, message.author.id);
    if (!serverInfoEmbed) {
      sendErrorMessage(pluginData, message.channel, "Could not find information for that server");
      return;
    }

    message.channel.send({ embeds: [serverInfoEmbed] });
  },
});
