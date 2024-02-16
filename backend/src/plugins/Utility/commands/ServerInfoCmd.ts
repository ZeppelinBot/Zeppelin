import { commandTypeHelpers as ct } from "../../../commandTypes";
import { CommonPlugin } from "../../Common/CommonPlugin";
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
    const serverInfoEmbed = await getServerInfoEmbed(pluginData, serverId);
    if (!serverInfoEmbed) {
      pluginData.getPlugin(CommonPlugin).sendErrorMessage(message, "Could not find information for that server");
      return;
    }

    message.channel.send({ embeds: [serverInfoEmbed] });
  },
});
