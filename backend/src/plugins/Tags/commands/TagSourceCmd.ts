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
    const alias = await pluginData.state.tagAliases.find(args.tag);
    const tag = (await pluginData.state.tags.find(args.tag)) || (await pluginData.state.tags.find(alias?.tag ?? null));

    if (args.delete) {
      const actualTag = await pluginData.state.tags.find(args.tag);
      const aliasedTag = await pluginData.state.tags.find(alias?.tag ?? null);

      if (!actualTag && !aliasedTag) {
        sendErrorMessage(pluginData, msg.channel, "No tag with that name");
        return;
      }

      actualTag ? pluginData.state.tags.delete(args.tag) : pluginData.state.tagAliases.delete(args.tag);
      sendSuccessMessage(pluginData, msg.channel, `${actualTag ? "Tag" : "Alias"} deleted!`);
      return;
    }

    if (!tag) {
      sendErrorMessage(pluginData, msg.channel, "No tag with that name");
      return;
    }

    const archiveId = await pluginData.state.archives.create(tag.body, moment.utc().add(10, "minutes"));
    const url = pluginData.state.archives.getUrl(getBaseUrl(pluginData), archiveId);

    msg.channel.send(`Tag source:\n${url}`);
  },
});
