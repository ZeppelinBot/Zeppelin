import { utilityCmd } from "../types";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { errorMessage } from "../../../utils";
import { getBaseUrl } from "../../../pluginUtils";
import moment from "moment-timezone";

export const SourceCmd = utilityCmd({
  trigger: "source",
  description: "View the message source of the specified message id",
  usage: "!source 534722219696455701",
  permission: "can_source",

  signature: {
    messageId: ct.string(),
  },

  async run({ message: msg, args, pluginData }) {
    const savedMessage = await pluginData.state.savedMessages.find(args.messageId);
    if (!savedMessage) {
      msg.channel.createMessage(errorMessage("Unknown message"));
      return;
    }

    const source =
      (savedMessage.data.content || "<no text content>") + "\n\nSource:\n\n" + JSON.stringify(savedMessage.data);

    const archiveId = await pluginData.state.archives.create(source, moment().add(1, "hour"));
    const baseUrl = getBaseUrl(pluginData);
    const url = pluginData.state.archives.getUrl(baseUrl, archiveId);
    msg.channel.createMessage(`Message source: ${url}`);
  },
});
