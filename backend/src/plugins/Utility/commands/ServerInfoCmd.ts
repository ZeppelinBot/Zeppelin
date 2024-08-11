import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { getServerInfoEmbed } from "../functions/getServerInfoEmbed.js";
import { utilityCmd } from "../types.js";

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
      void pluginData.state.common.sendErrorMessage(message, "Could not find information for that server");
      return;
    }

    message.channel.send({ embeds: [serverInfoEmbed] });
  },
});
