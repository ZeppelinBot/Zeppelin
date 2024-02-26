import moment from "moment-timezone";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { getBaseUrl } from "../../../pluginUtils";
import { CommonPlugin } from "../../Common/CommonPlugin";
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
        pluginData.getPlugin(CommonPlugin).sendErrorMessage(msg, "No tag with that name");
        return;
      }

      await pluginData.state.tags.delete(args.tag);
      pluginData.getPlugin(CommonPlugin).sendSuccessMessage(msg, "Tag deleted!");
      return;
    }

    const tag = await pluginData.state.tags.find(args.tag);
    if (!tag) {
      pluginData.getPlugin(CommonPlugin).sendErrorMessage(msg, "No tag with that name");
      return;
    }

    const archiveId = await pluginData.state.archives.create(tag.body, moment.utc().add(10, "minutes"));
    const url = pluginData.state.archives.getUrl(getBaseUrl(pluginData), archiveId);

    msg.channel.send(`Tag source:\n${url}`);
  },
});
