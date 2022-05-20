import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { tagsCmd } from "../types";

export const TagDeleteCmd = tagsCmd({
  trigger: "tag delete",
  permission: "can_create",

  signature: {
    tag: ct.string(),
  },

  async run({ message: msg, args, pluginData }) {
    const alias = await pluginData.state.tagAliases.find(args.tag);
    const tag = await pluginData.state.tags.find(args.tag);

    if (!tag && !alias) {
      sendErrorMessage(pluginData, msg.channel, "No tag with that name");
      return;
    }

    if (tag) {
      const aliasesOfTag = await pluginData.state.tagAliases.findAllWithTag(tag?.tag);
      if (aliasesOfTag) {
        // tslint:disable-next-line:no-shadowed-variable
        aliasesOfTag.forEach((alias) => pluginData.state.tagAliases.delete(alias.alias));
      }
      await pluginData.state.tags.delete(args.tag);
    } else {
      await pluginData.state.tagAliases.delete(alias?.alias);
    }

    sendSuccessMessage(pluginData, msg.channel, `${tag ? "Tag" : "Alias"} deleted!`);
  },
});
