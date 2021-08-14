import moment from "moment-timezone";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { getBaseUrl, sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { tagsCmd } from "../types";

export const TagSourceCmd = tagsCmd({
  trigger: "tag",
  permission: "can_create",

  signature: {
    tag: ct.string(),

    delete: ct.bool({ option: true, shortcut: "d", isSwitch: true }),
  },

  async run({ message: msg, args, pluginData }) {
    if (args.delete) {
      const actualTag = await pluginData.state.tags.find(args.tag);
      if (!actualTag) {
        sendErrorMessage(pluginData, msg.channel, "No tag with that name");
        return;
      }

      await pluginData.state.tags.delete(args.tag);
      sendSuccessMessage(pluginData, msg.channel, "Tag deleted!");
      return;
    }

    const tag = await pluginData.state.tags.find(args.tag);
    if (!tag) {
      sendErrorMessage(pluginData, msg.channel, "No tag with that name");
      return;
    }

    const archiveId = await pluginData.state.archives.create(tag.body, moment.utc().add(10, "minutes"));
    const url = pluginData.state.archives.getUrl(getBaseUrl(pluginData), archiveId);

    msg.channel.send(`Tag source:\n${url}`);
  },
});
